import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { BreakingChangeCategory } from '../../../types';
import { PyodideRemovedRule } from '../pyodide-removed.rule';

describe('PyodideRemovedRule', () => {
	let rule: PyodideRemovedRule;

	beforeEach(() => {
		jest.clearAllMocks();
		rule = new PyodideRemovedRule();
	});

	describe('getMetadata()', () => {
		it('should return correct metadata', () => {
			const metadata = rule.getMetadata();

			expect(metadata).toEqual({
				version: 'v2',
				title: 'Remove Pyodide based Python Code node',
				description:
					'The Pyodide-based Python Code node has been removed and replaced with a task runner-based implementation',
				category: BreakingChangeCategory.workflow,
				severity: 'critical',
			});
		});
	});

	describe('getRecommendations()', () => {
		it('should return recommendations', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(3);
			expect(recommendations).toEqual([
				{
					action: 'Update Code nodes to use native Python',
					description:
						'Manually update affected Code nodes from the legacy python parameter to the new pythonNative parameter',
				},
				{
					action: 'Review and adjust Python scripts',
					description:
						'Review Code node scripts relying on Pyodide syntax and adjust for breaking changes. See: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.code/#python-native-beta',
				},
				{
					action: 'Set up Python task runner',
					description:
						'Ensure a Python task runner is available and configured. Native Python task runners are enabled by default in v2',
				},
			]);
		});
	});

	describe('detectWorkflow()', () => {
		it('should return no issues when no Python Code nodes are found', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
			]);
			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({
				isAffected: false,
				issues: [],
			});
		});

		it('should return no issues when Python Code nodes use task runner mode', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Python', 'n8n-nodes-base.pythonCode', {
					mode: 'taskRunner',
					code: 'print("hello")',
				}),
			]);
			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({
				isAffected: false,
				issues: [],
			});
		});

		it('should detect Python Code node with explicit pyodide mode', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Python', 'n8n-nodes-base.pythonCode', {
					mode: 'pyodide',
					code: 'print("hello")',
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0]).toMatchObject({
				title: "Python Code node 'Python' uses removed Pyodide implementation",
				description:
					'The Pyodide-based Python Code node is no longer supported. This node must be migrated to use the task runner-based implementation.',
				level: 'error',
				nodeId: expect.any(String),
				nodeName: 'Python',
			});
		});

		it('should detect Python Code node without mode parameter (defaults to Pyodide)', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Python', 'n8n-nodes-base.pythonCode', {
					code: 'print("hello")',
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0]).toMatchObject({
				title: "Python Code node 'Python' uses removed Pyodide implementation",
				description:
					'The Pyodide-based Python Code node is no longer supported. This node must be migrated to use the task runner-based implementation.',
				level: 'error',
			});
		});

		it('should detect multiple Pyodide-based Python Code nodes', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Python1', 'n8n-nodes-base.pythonCode', {
					mode: 'pyodide',
					code: 'print("hello")',
				}),
				createNode('Python2', 'n8n-nodes-base.pythonCode', {
					code: 'print("world")',
				}),
				createNode('Python3', 'n8n-nodes-base.pythonCode', {
					mode: 'taskRunner',
					code: 'print("ok")',
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(2);
			expect(result.issues).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						nodeName: 'Python1',
						title: "Python Code node 'Python1' uses removed Pyodide implementation",
					}),
					expect.objectContaining({
						nodeName: 'Python2',
						title: "Python Code node 'Python2' uses removed Pyodide implementation",
					}),
				]),
			);
		});

		it('should detect mixed workflow with Pyodide and non-Pyodide nodes', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
				createNode('Python', 'n8n-nodes-base.pythonCode', {
					mode: 'pyodide',
					code: 'print("hello")',
				}),
				createNode('Set', 'n8n-nodes-base.set'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].nodeName).toBe('Python');
		});
	});
});
