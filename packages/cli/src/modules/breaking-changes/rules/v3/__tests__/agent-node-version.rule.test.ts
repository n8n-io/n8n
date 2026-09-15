import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { AgentNodeVersionRule } from '../agent-node-version.rule';

const AGENT_NODE_TYPE = '@n8n/n8n-nodes-langchain.agent';

describe('AgentNodeVersionRule', () => {
	let rule: AgentNodeVersionRule;

	beforeEach(() => {
		rule = new AgentNodeVersionRule();
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
				{ ...createNode('AI Agent', AGENT_NODE_TYPE), typeVersion: 2.2 },
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should warn about an AI Agent below version 2 that uses the tools agent', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{
					...createNode('AI Agent', AGENT_NODE_TYPE, { agent: 'toolsAgent' }),
					typeVersion: 1.9,
				},
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].title).toContain('1.9');
			expect(result.issues[0].level).toBe('warning');
			expect(result.issues[0].nodeName).toBe('AI Agent');
		});

		it('should warn about a node from 1.6 onwards that has no agent parameter', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{ ...createNode('AI Agent', AGENT_NODE_TYPE), typeVersion: 1.7 },
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].level).toBe('warning');
		});

		it('should leave nodes on a removed agent mode to the removed modes rule', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{
					...createNode('SQL Agent', AGENT_NODE_TYPE, { agent: 'sqlAgent' }),
					typeVersion: 1.5,
				},
				{ ...createNode('Conversational Agent', AGENT_NODE_TYPE), typeVersion: 1.4 },
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should flag only the nodes below version 2 when multiple AI Agents exist', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{ ...createNode('Old Agent', AGENT_NODE_TYPE, { agent: 'toolsAgent' }), typeVersion: 1.8 },
				{ ...createNode('New Agent', AGENT_NODE_TYPE), typeVersion: 3.1 },
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].nodeName).toBe('Old Agent');
		});
	});

	describe('getMetadata()', () => {
		it('should report a medium severity for nodes that keep working', () => {
			expect(rule.getMetadata().severity).toBe('medium');
		});
	});

	describe('getRecommendations()', () => {
		it('should explain how to move the nodes to the latest version', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(1);
			expect(recommendations[0].description).toContain('latest version');
		});
	});
});
