import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { GmailTriggerVersionRule } from '../gmail-trigger-version.rule';

describe('GmailTriggerVersionRule', () => {
	let rule: GmailTriggerVersionRule;

	beforeEach(() => {
		rule = new GmailTriggerVersionRule();
	});

	describe('detectWorkflow()', () => {
		it('should not be affected when there is no Gmail Trigger node', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should not be affected when Gmail Trigger is on version 1.4', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{ ...createNode('Gmail Trigger', 'n8n-nodes-base.gmailTrigger'), typeVersion: 1.4 },
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should detect a Gmail Trigger on a version below 1.4', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{ ...createNode('Gmail Trigger', 'n8n-nodes-base.gmailTrigger'), typeVersion: 1.3 },
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].title).toContain('Gmail Trigger');
			expect(result.issues[0].title).toContain('1.3');
			expect(result.issues[0].level).toBe('warning');
			expect(result.issues[0].nodeName).toBe('Gmail Trigger');
		});

		it('should flag only the nodes below 1.4 when multiple Gmail Triggers exist', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{ ...createNode('Old Trigger', 'n8n-nodes-base.gmailTrigger'), typeVersion: 1 },
				{ ...createNode('New Trigger', 'n8n-nodes-base.gmailTrigger'), typeVersion: 1.4 },
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].nodeName).toBe('Old Trigger');
		});
	});

	describe('getRecommendations()', () => {
		it('should explain the poll limit and how to migrate draft and sent/scheduled filters', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(1);
			expect(recommendations[0].description).toContain('Max Emails per Poll');
			expect(recommendations[0].description).toContain('Include Drafts');
			expect(recommendations[0].description).toContain('Schedule Trigger');
		});
	});
});
