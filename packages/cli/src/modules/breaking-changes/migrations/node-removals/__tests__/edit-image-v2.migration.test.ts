import { createNode } from '../../../__tests__/test-helpers';
import { EDIT_IMAGE_NODE_TYPE, EDIT_IMAGE_WARNING } from '../../../rules/v3/edit-image-version';
import { editImageToV2 } from '../edit-image-v2.migration';

describe('editImageToV2 migration', () => {
	it('is keyed by the Edit Image version rule id', () => {
		expect(editImageToV2.ruleId).toBe('edit-image-version-v3');
	});

	it('bumps the node to version 2 and keeps ordinary parameters', () => {
		const node = createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
			operation: 'border',
			borderWidth: 4,
			borderColor: '#ff0000',
			dataPropertyName: 'data',
			options: { format: 'jpeg', quality: 90 },
		});

		const result = editImageToV2.migrate(node);

		expect(result.node).toEqual({
			type: EDIT_IMAGE_NODE_TYPE,
			typeVersion: 2,
			parameters: {
				operation: 'border',
				borderWidth: 4,
				borderColor: '#ff0000',
				dataPropertyName: 'data',
				options: { format: 'jpeg', quality: 90 },
			},
		});
		expect(result.notes).toBeUndefined();
		expect(result.unmapped).toBeUndefined();
	});

	it('converts top-level blur and sigma to blurRadius', () => {
		const node = createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
			operation: 'blur',
			blur: 8,
			sigma: 2,
			dataPropertyName: 'data',
		});

		const result = editImageToV2.migrate(node);

		expect(result.node.parameters).toEqual({
			operation: 'blur',
			blurRadius: 8,
			dataPropertyName: 'data',
		});
		expect(result.notes).toEqual([EDIT_IMAGE_WARNING.blur]);
	});

	it('uses the version 2 default blur radius when blur is omitted', () => {
		const node = createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
			operation: 'blur',
			sigma: 1,
		});

		const result = editImageToV2.migrate(node);

		expect(result.node.parameters).toEqual({
			operation: 'blur',
			blurRadius: 5,
		});
	});

	it('copies a blur expression to blurRadius', () => {
		const node = createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
			operation: 'blur',
			blur: '={{ $json.radius }}',
			sigma: 2,
		});

		const result = editImageToV2.migrate(node);

		expect(result.node.parameters).toEqual({
			operation: 'blur',
			blurRadius: '={{ $json.radius }}',
		});
		expect(result.notes).toEqual([EDIT_IMAGE_WARNING.blur]);
	});

	it('converts blur steps inside multi-step operations', () => {
		const node = createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
			operation: 'multiStep',
			operations: {
				operations: [
					{ operation: 'blur', blur: 3, sigma: 1 },
					{ operation: 'border', borderWidth: 2 },
					{ operation: 'blur', blur: 7 },
				],
			},
		});

		const result = editImageToV2.migrate(node);

		expect(result.node.parameters).toEqual({
			operation: 'multiStep',
			operations: {
				operations: [
					{ operation: 'blur', blurRadius: 3 },
					{ operation: 'border', borderWidth: 2 },
					{ operation: 'blur', blurRadius: 7 },
				],
			},
		});
		expect(result.notes).toEqual([EDIT_IMAGE_WARNING.blur]);
	});

	it('adds notes for Get Information output changes', () => {
		const node = createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
			operation: 'information',
		});

		const result = editImageToV2.migrate(node);

		expect(result.node.typeVersion).toBe(2);
		expect(result.node.parameters).toEqual({ operation: 'information' });
		expect(result.notes).toEqual([EDIT_IMAGE_WARNING.information]);
	});

	it('adds notes for text rendering changes', () => {
		const node = createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
			operation: 'text',
			text: 'Hello',
		});

		const result = editImageToV2.migrate(node);

		expect(result.notes).toEqual([EDIT_IMAGE_WARNING.text]);
	});

	it('adds notes when PNG quality will be ignored', () => {
		const node = createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
			operation: 'resize',
			width: 100,
			height: 100,
			options: { format: 'png', quality: 70 },
		});

		const result = editImageToV2.migrate(node);

		expect(result.node.parameters.options).toEqual({ format: 'png', quality: 70 });
		expect(result.notes).toEqual([EDIT_IMAGE_WARNING.quality]);
	});

	it('adds notes for non-positive resize dimensions', () => {
		const node = createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
			operation: 'resize',
			width: -1,
			height: 50,
		});

		const result = editImageToV2.migrate(node);

		expect(result.notes).toEqual([EDIT_IMAGE_WARNING.resize]);
	});

	it('combines multiple notes without inventing unrelated ones', () => {
		const node = createNode('Edit Image', EDIT_IMAGE_NODE_TYPE, {
			operation: 'multiStep',
			operations: {
				operations: [
					{ operation: 'blur', blur: 2 },
					{ operation: 'text', text: 'Hi' },
				],
			},
			options: { format: 'tiff', quality: 40 },
		});

		const result = editImageToV2.migrate(node);

		expect(result.notes).toEqual([
			EDIT_IMAGE_WARNING.blur,
			EDIT_IMAGE_WARNING.quality,
			EDIT_IMAGE_WARNING.text,
		]);
		expect(result.notes).not.toContain(EDIT_IMAGE_WARNING.information);
		expect(result.notes).not.toContain(EDIT_IMAGE_WARNING.resize);
	});
});
