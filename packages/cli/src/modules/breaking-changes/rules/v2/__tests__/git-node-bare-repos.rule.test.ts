import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { BreakingChangeCategory } from '../../../types';
import { GitNodeBareReposRule } from '../git-node-bare-repos.rule';

describe('GitNodeBareReposRule', () => {
	let rule: GitNodeBareReposRule;
	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		rule = new GitNodeBareReposRule();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata).toMatchObject({
				version: 'v2',
				title: 'Git node bare repositories disabled by default',
				description:
					'N8N_GIT_NODE_DISABLE_BARE_REPOS now defaults to true for security. Bare repositories are disabled to prevent RCE attacks via Git hooks',
				category: BreakingChangeCategory.workflow,
				severity: 'medium',
			});
		});
	});

	describe('getRecommendations()', () => {
		it('should return recommendations', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(3);
			expect(recommendations).toEqual([
				{
					action: 'Review Git node usage',
					description:
						'Check if any Git nodes in your workflows use bare repositories. Bare repositories are now disabled by default for security reasons.',
				},
				{
					action: 'Migrate away from bare repositories',
					description:
						'If possible, update your workflows to use regular Git repositories instead of bare repositories.',
				},
				{
					action: 'Enable bare repositories if required (not recommended)',
					description:
						'If you absolutely need bare repository support and understand the security risks, set N8N_GIT_NODE_DISABLE_BARE_REPOS=false. This is not recommended as it exposes your instance to potential RCE attacks via Git hooks.',
				},
			]);
		});
	});

	describe('detectWorkflow()', () => {
		it('should return no issues when no Git nodes are found', async () => {
			delete process.env.N8N_GIT_NODE_DISABLE_BARE_REPOS;

			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
			]);
			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({
				isAffected: false,
				issues: [],
			});
		});

		it('should return no issues when N8N_GIT_NODE_DISABLE_BARE_REPOS is explicitly set to false', async () => {
			process.env.N8N_GIT_NODE_DISABLE_BARE_REPOS = 'false';

			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Git', 'n8n-nodes-base.git'),
			]);
			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({
				isAffected: false,
				issues: [],
			});
		});

		it('should detect Git nodes when N8N_GIT_NODE_DISABLE_BARE_REPOS is not set', async () => {
			delete process.env.N8N_GIT_NODE_DISABLE_BARE_REPOS;

			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Git', 'n8n-nodes-base.git'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0]).toMatchObject({
				title: "Git node 'Git' may be affected by bare repository restrictions",
				description: expect.stringContaining('Bare repositories are now disabled by default'),
				level: 'warning',
				nodeId: expect.any(String),
				nodeName: 'Git',
			});
		});

		it('should detect Git nodes when N8N_GIT_NODE_DISABLE_BARE_REPOS is set to true', async () => {
			process.env.N8N_GIT_NODE_DISABLE_BARE_REPOS = 'true';

			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Git', 'n8n-nodes-base.git'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
		});

		it('should detect multiple Git nodes', async () => {
			delete process.env.N8N_GIT_NODE_DISABLE_BARE_REPOS;

			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Git1', 'n8n-nodes-base.git'),
				createNode('Git2', 'n8n-nodes-base.git'),
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(2);
			expect(result.issues).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						nodeName: 'Git1',
						title: "Git node 'Git1' may be affected by bare repository restrictions",
					}),
					expect.objectContaining({
						nodeName: 'Git2',
						title: "Git node 'Git2' may be affected by bare repository restrictions",
					}),
				]),
			);
		});

		it('should include security explanation in description', async () => {
			delete process.env.N8N_GIT_NODE_DISABLE_BARE_REPOS;

			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Git', 'n8n-nodes-base.git'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues[0].description).toContain('security');
			expect(result.issues[0].description).toContain('N8N_GIT_NODE_DISABLE_BARE_REPOS=false');
		});
	});
});
