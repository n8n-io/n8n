import {
	uiExtensionFrameMessageSchema,
	uiExtensionHostMessageSchema,
	uiExtensionViewIconSchema,
	uiExtensionViewSchema,
} from '../ui-extensions';

describe('ui-extensions schemas', () => {
	const envelope = { source: 'n8n-ui-extension', version: 1 };

	it.each(['chart-column', 'box', 'panel-right'])('accepts the icon name %s', (icon) => {
		expect(uiExtensionViewIconSchema.safeParse(icon).success).toBe(true);
	});

	it.each(['Chart', 'chart column', '-box', 'box-', '<svg>', 'a'.repeat(65)])(
		'rejects the icon name %s',
		(icon) => {
			expect(uiExtensionViewIconSchema.safeParse(icon).success).toBe(false);
		},
	);

	it('trims the view title and limits it to 40 characters', () => {
		const view = { id: 'v', source: 'x', updatedAt: '' };

		expect(uiExtensionViewSchema.parse({ ...view, title: '  Stats  ' }).title).toBe('Stats');
		expect(uiExtensionViewSchema.safeParse({ ...view, title: '   ' }).success).toBe(false);
		expect(uiExtensionViewSchema.safeParse({ ...view, title: 'x'.repeat(41) }).success).toBe(false);
	});

	it('accepts a context message for each page', () => {
		for (const context of [
			{ page: 'workflow', routeName: 'NodeViewExisting', workflow: null },
			{ page: 'workflows', routeName: 'WorkflowsView', projectId: null, totalWorkflows: 2 },
			{ page: 'other', routeName: null },
		]) {
			const message = { ...envelope, type: 'context', context, strings: {} };
			expect(uiExtensionHostMessageSchema.safeParse(message).success).toBe(true);
		}
	});

	it.each([
		['an unknown page', { page: 'admin', routeName: 'x' }],
		[
			'a negative workflow count',
			{ page: 'workflows', routeName: 'x', projectId: null, totalWorkflows: -1 },
		],
	])('rejects a context with %s', (_case, context) => {
		const message = { ...envelope, type: 'context', context, strings: {} };
		expect(uiExtensionHostMessageSchema.safeParse(message).success).toBe(false);
	});

	it('accepts the frame messages in the envelope only', () => {
		expect(uiExtensionFrameMessageSchema.safeParse({ ...envelope, type: 'ready' }).success).toBe(
			true,
		);
		expect(
			uiExtensionFrameMessageSchema.safeParse({ ...envelope, type: 'error', message: 'boom' })
				.success,
		).toBe(true);
		expect(uiExtensionFrameMessageSchema.safeParse({ type: 'ready' }).success).toBe(false);
		expect(
			uiExtensionFrameMessageSchema.safeParse({ ...envelope, version: 2, type: 'ready' }).success,
		).toBe(false);
	});
});
