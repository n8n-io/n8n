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

			expect(metadata).toMatchObject({
				version: 'v2',
				title: 'Remove Pyodide-based Python in Code node',
				description:
					'The Pyodide-based Python implementation in the Code node has been removed and replaced with a native Python task runner implementation',
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
		it('should return no issues when no Code nodes are found', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
			]);
			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({
				isAffected: false,
				issues: [],
			});
		});

		it('should return no issues when Code nodes use JavaScript', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Code', 'n8n-nodes-base.code', {
					language: 'javaScript',
					jsCode: 'return items;',
				}),
			]);
			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({
				isAffected: false,
				issues: [],
			});
		});

		it('should return no issues when Code nodes use native Python (pythonNative)', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Python', 'n8n-nodes-base.code', {
					language: 'pythonNative',
					pythonCode: 'print("hello")',
				}),
			]);
			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result).toEqual({
				isAffected: false,
				issues: [],
			});
		});

		it('should detect Code node with Pyodide Python (language="python")', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Python', 'n8n-nodes-base.code', {
					language: 'python',
					pythonCode: 'print("hello")',
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0]).toMatchObject({
				title: "Code node 'Python' uses removed Pyodide Python implementation",
				description:
					'The Pyodide-based Python implementation (language="python") is no longer supported. This node must be migrated to use the task runner-based implementation (language="pythonNative").',
				level: 'error',
				nodeId: expect.any(String),
				nodeName: 'Python',
			});
		});

		it('should detect multiple Pyodide-based Code nodes', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Python1', 'n8n-nodes-base.code', {
					language: 'python',
					pythonCode: 'print("hello")',
				}),
				createNode('Python2', 'n8n-nodes-base.code', {
					language: 'python',
					pythonCode: 'print("world")',
				}),
				createNode('Python3', 'n8n-nodes-base.code', {
					language: 'pythonNative',
					pythonCode: 'print("ok")',
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(2);
			expect(result.issues).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						nodeName: 'Python1',
						title: "Code node 'Python1' uses removed Pyodide Python implementation",
					}),
					expect.objectContaining({
						nodeName: 'Python2',
						title: "Code node 'Python2' uses removed Pyodide Python implementation",
					}),
				]),
			);
		});

		it('should detect mixed workflow with Pyodide and non-Pyodide nodes', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
				createNode('Python', 'n8n-nodes-base.code', {
					language: 'python',
					pythonCode: 'print("hello")',
				}),
				createNode('JS', 'n8n-nodes-base.code', {
					language: 'javaScript',
					jsCode: 'return items;',
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
