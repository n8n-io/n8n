import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { ChatTriggerEmbeddedJsonRule } from '../chat-trigger-embedded-json.rule';

const CHAT_TRIGGER = '@n8n/n8n-nodes-langchain.chatTrigger';
const CHAT_TRIGGER_LEGACY = 'n8n-nodes-langchain.chatTrigger';

describe('ChatTriggerEmbeddedJsonRule', () => {
	let rule: ChatTriggerEmbeddedJsonRule;

	beforeEach(() => {
		rule = new ChatTriggerEmbeddedJsonRule();
	});

	describe('detectWorkflow()', () => {
		it('should not be affected when there is no Chat Trigger node', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should not be affected when Chat Trigger uses hosted mode', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Chat', CHAT_TRIGGER, { mode: 'hostedChat' }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should not be affected when mode is unset (defaults to hosted)', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Chat', CHAT_TRIGGER),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should detect Chat Trigger using embedded (webhook) mode', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Chat', CHAT_TRIGGER, { mode: 'webhook' }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].title).toContain('Chat');
			expect(result.issues[0].level).toBe('warning');
			expect(result.issues[0].nodeName).toBe('Chat');
		});

		it('should detect embedded mode on the legacy un-scoped node type', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Chat', CHAT_TRIGGER_LEGACY, { mode: 'webhook' }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].nodeName).toBe('Chat');
		});

		it('should flag only the embedded Chat Trigger when hosted and embedded coexist', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Embedded', CHAT_TRIGGER, { mode: 'webhook' }),
				createNode('Hosted', CHAT_TRIGGER, { mode: 'hostedChat' }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].nodeName).toBe('Embedded');
		});
	});

	describe('getRecommendations()', () => {
		it('should recommend updating the embedded chat', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(1);
			expect(recommendations[0].action).toContain('embedded chat');
		});
	});
});
