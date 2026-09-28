import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { AgentRemovedModesRule } from '../agent-removed-modes.rule';

const AGENT_NODE_TYPE = '@n8n/n8n-nodes-langchain.agent';

describe('AgentRemovedModesRule', () => {
	let rule: AgentRemovedModesRule;

	beforeEach(() => {
		rule = new AgentRemovedModesRule();
	});

	describe('detectWorkflow()', () => {
		it('should not be affected when there is no AI Agent node', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should not be affected when the AI Agent is on version 2 or above', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{
					...createNode('AI Agent', AGENT_NODE_TYPE, { agent: 'conversationalAgent' }),
					typeVersion: 2,
				},
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should not be affected when the node below version 2 uses the tools agent', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{
					...createNode('AI Agent', AGENT_NODE_TYPE, { agent: 'toolsAgent' }),
					typeVersion: 1.9,
				},
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should report an error for a node that uses a removed agent mode', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{
					...createNode('SQL Agent', AGENT_NODE_TYPE, { agent: 'sqlAgent' }),
					typeVersion: 1.5,
				},
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].level).toBe('error');
			expect(result.issues[0].title).toContain('SQL Agent');
			expect(result.issues[0].description).toContain('SQL Agent');
			expect(result.issues[0].nodeName).toBe('SQL Agent');
		});

		it('should report an error for a node up to 1.5 that has no agent parameter', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{ ...createNode('AI Agent', AGENT_NODE_TYPE), typeVersion: 1.4 },
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].level).toBe('error');
			expect(result.issues[0].description).toContain('Conversational Agent');
		});

		it('should flag only the nodes on a removed mode when multiple AI Agents exist', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{
					...createNode('ReAct Agent', AGENT_NODE_TYPE, { agent: 'reActAgent' }),
					typeVersion: 1.6,
				},
				{
					...createNode('Tools Agent', AGENT_NODE_TYPE, { agent: 'toolsAgent' }),
					typeVersion: 1.6,
				},
				{ ...createNode('New Agent', AGENT_NODE_TYPE), typeVersion: 2.2 },
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].nodeName).toBe('ReAct Agent');
		});
	});

	describe('getMetadata()', () => {
		it('should report a critical severity for nodes that stop working', () => {
			expect(rule.getMetadata().severity).toBe('critical');
		});
	});

	describe('getRecommendations()', () => {
		it('should explain how to rebuild the affected nodes', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(1);
			expect(recommendations[0].description).toContain('latest version');
			expect(recommendations[0].description).toContain('SQL Agent');
		});
	});
});
