import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { BreakingChangeSeverity, BreakingChangeCategory, IssueLevel } from '../../../types';
import { FileAccessRule } from '../file-access.rule';

describe('FileAccessRule', () => {
	let rule: FileAccessRule;

	beforeEach(() => {
		jest.clearAllMocks();
		rule = new FileAccessRule();
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata).toEqual({
				version: 'v2',
				title: 'File Access Restrictions',
				description: 'File access is now restricted to a default directory for security purposes',
				category: BreakingChangeCategory.workflow,
				severity: BreakingChangeSeverity.high,
			});
		});
	});

	describe('getRecommendations()', () => {
		it('should return recommendations', async () => {
			const recommendations = await rule.getRecommendations();

			expect(recommendations).toHaveLength(1);
			expect(recommendations[0]).toMatchObject({
				action: 'Configure file access paths',
				description:
					'Set N8N_RESTRICT_FILE_ACCESS_TO to a semicolon-separated list of allowed paths if workflows need to access files outside the default directory',
			});
		});
	});

	describe('detectWorkflow()', () => {
		it('should return no issues when no file access nodes are found', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', []);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({
				isAffected: false,
				issues: [],
			});
		});

		it('should detect ReadWriteFile node usage', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Read File', 'n8n-nodes-base.readWriteFile'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0]).toMatchObject({
				title: "File access node 'n8n-nodes-base.readWriteFile' with name 'Read File' affected",
				description: 'File access for this node is now restricted to configured directories.',
				level: IssueLevel.warning,
			});
		});

		it('should detect ReadBinaryFiles node usage', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Read Binary', 'n8n-nodes-base.readBinaryFiles'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues[0]).toMatchObject({
				title: "File access node 'n8n-nodes-base.readBinaryFiles' with name 'Read Binary' affected",
				level: IssueLevel.warning,
			});
		});

		it('should detect both file access nodes in the same workflow', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Read File', 'n8n-nodes-base.readWriteFile'),
				createNode('Read Binary', 'n8n-nodes-base.readBinaryFiles'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues).toHaveLength(2);
			expect(result.issues).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						title: "File access node 'n8n-nodes-base.readWriteFile' with name 'Read File' affected",
					}),
					expect.objectContaining({
						title:
							"File access node 'n8n-nodes-base.readBinaryFiles' with name 'Read Binary' affected",
					}),
				]),
			);
		});

		it('should only flag file access nodes, not other nodes', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Read File', 'n8n-nodes-base.readWriteFile'),
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
				createNode('Code', 'n8n-nodes-base.code'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].title).toContain('readWriteFile');
		});
	});
});
