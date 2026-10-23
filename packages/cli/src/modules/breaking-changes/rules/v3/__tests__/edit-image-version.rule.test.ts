import { createNode, createWorkflow } from '../../../__tests__/test-helpers';
import { EDIT_IMAGE_NODE_TYPE, EDIT_IMAGE_WARNING } from '../edit-image-version';
import { EditImageVersionRule } from '../edit-image-version.rule';

describe('EditImageVersionRule', () => {
	let rule: EditImageVersionRule;

	beforeEach(() => {
		rule = new EditImageVersionRule();
	});

	describe('detectWorkflow()', () => {
		it('should not be affected when there is no Edit Image node', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('HTTP', 'n8n-nodes-base.httpRequest'),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should not be affected when Edit Image is on version 2', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{ ...createNode('Edit Image', EDIT_IMAGE_NODE_TYPE), typeVersion: 2 },
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(false);
			expect(result.issues).toHaveLength(0);
		});

		it('should report an info issue for version 1 without special cases', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, { operation: 'border', borderWidth: 2 }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0]).toMatchObject({
				level: 'info',
				nodeName: 'Edit Image',
				title: "Node 'Edit Image' uses Edit Image version 1",
			});
			expect(result.issues[0].description).toContain('Upgrade this node to version 2');
			expect(result.issues[0].description).not.toContain(EDIT_IMAGE_WARNING.blur);
		});

		it('should detect version 1.1 nodes', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				{
					...createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, { operation: 'border' }),
					typeVersion: 1.1,
				},
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues[0].title).toContain('1.1');
			expect(result.issues[0].level).toBe('info');
		});

		it('should warn only when blur is used', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
					operation: 'blur',
					blur: 4,
					sigma: 1,
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues[0].level).toBe('warning');
			expect(result.issues[0].description).toContain(EDIT_IMAGE_WARNING.blur);
			expect(result.issues[0].description).not.toContain(EDIT_IMAGE_WARNING.information);
			expect(result.issues[0].description).not.toContain(EDIT_IMAGE_WARNING.quality);
			expect(result.issues[0].description).not.toContain(EDIT_IMAGE_WARNING.text);
		});

		it('should warn only when Get Information is used', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, { operation: 'information' }),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues[0].level).toBe('warning');
			expect(result.issues[0].description).toContain(EDIT_IMAGE_WARNING.information);
			expect(result.issues[0].description).not.toContain(EDIT_IMAGE_WARNING.blur);
		});

		it('should warn only when text is used', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
					operation: 'text',
					text: 'Hello',
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues[0].level).toBe('warning');
			expect(result.issues[0].description).toContain(EDIT_IMAGE_WARNING.text);
			expect(result.issues[0].description).not.toContain(EDIT_IMAGE_WARNING.blur);
		});

		it('should warn only when PNG quality is set', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
					operation: 'border',
					options: { format: 'png', quality: 80 },
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues[0].level).toBe('warning');
			expect(result.issues[0].description).toContain(EDIT_IMAGE_WARNING.quality);
			expect(result.issues[0].description).not.toContain(EDIT_IMAGE_WARNING.blur);
		});

		it('should warn only when TIFF quality is set', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
					operation: 'border',
					options: { format: 'tiff', quality: 50 },
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues[0].description).toContain(EDIT_IMAGE_WARNING.quality);
		});

		it('should warn when TIF quality is set', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
					operation: 'border',
					options: { format: 'tif', quality: 50 },
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues[0].description).toContain(EDIT_IMAGE_WARNING.quality);
		});

		it('should warn when quality is set without an output format', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
					operation: 'border',
					options: { quality: 80 },
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues[0].description).toContain(EDIT_IMAGE_WARNING.quality);
		});

		it('should not warn about quality for JPEG', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
					operation: 'border',
					options: { format: 'jpeg', quality: 80 },
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues[0].level).toBe('info');
			expect(result.issues[0].description).not.toContain(EDIT_IMAGE_WARNING.quality);
		});

		it('should warn when resize has non-positive dimensions', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
					operation: 'resize',
					width: 0,
					height: 100,
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues[0].level).toBe('warning');
			expect(result.issues[0].description).toContain(EDIT_IMAGE_WARNING.resize);
		});

		it('should detect blur and text inside multi-step operations', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
					operation: 'multiStep',
					operations: {
						operations: [
							{ operation: 'blur', blur: 3, sigma: 1 },
							{ operation: 'text', text: 'Hi' },
						],
					},
				}),
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.issues[0].level).toBe('warning');
			expect(result.issues[0].description).toContain(EDIT_IMAGE_WARNING.blur);
			expect(result.issues[0].description).toContain(EDIT_IMAGE_WARNING.text);
			expect(result.issues[0].description).not.toContain(EDIT_IMAGE_WARNING.information);
		});

		it('should flag only legacy nodes when both versions exist', async () => {
			const { workflow, nodesGroupedByType } = createWorkflow('wf-1', 'Test Workflow', [
				createNode('Old Edit', EDIT_IMAGE_NODE_TYPE, { operation: 'border' }),
				{
					...createNode('New Edit', EDIT_IMAGE_NODE_TYPE, { operation: 'border' }),
					typeVersion: 2,
				},
			]);

			const result = await rule.detectWorkflow(workflow, nodesGroupedByType);

			expect(result.isAffected).toBe(true);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0].nodeName).toBe('Old Edit');
		});
	});

	describe('getRecommendations()', () => {
		it('should recommend upgrading to version 2', async () => {
			const recommendations = await rule.getRecommendations([]);

			expect(recommendations).toHaveLength(1);
			expect(recommendations[0].action).toContain('version 2');
			expect(recommendations[0].description).toContain('automatic migration');
		});
	});

	describe('getMetadata()', () => {
		it('should report a behaviorChanges impact', () => {
			expect(rule.getMetadata().impact).toBe('behaviorChanges');
		});
	});
});
