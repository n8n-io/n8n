import {
	isUiExtensionOpenableUrl,
	UI_EXTENSION_DATA_LIMITS,
	uiExtensionFrameMessageSchema,
	uiExtensionPanelDataSchema,
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
			const message = { ...envelope, type: 'context', context, strings: {}, locale: 'en' };
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
		const message = { ...envelope, type: 'context', context, strings: {}, locale: 'en' };
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

	describe('panel data', () => {
		const run = {
			id: '1',
			workflowId: 'w',
			workflowName: 'W',
			status: 'success',
			mode: 'manual',
			startedAt: '2026-01-01T00:00:00.000Z',
			stoppedAt: null,
		};
		const service = (overrides: Record<string, unknown> = {}) => ({
			nodeName: 'Send',
			nodeType: 'n8n-nodes-base.slack',
			displayName: 'Slack',
			targets: [{ label: 'Channel', name: '#alerts', url: 'https://example.slack.com/x' }],
			lastRun: null,
			...overrides,
		});
		const data = (overrides: Record<string, unknown> = {}) => ({
			state: 'ready',
			runs: { scope: 'workflow', items: [run] },
			services: [service()],
			...overrides,
		});

		it('accepts data within the caps', () => {
			expect(uiExtensionPanelDataSchema.safeParse(data()).success).toBe(true);
		});

		it.each([
			[
				'too many runs',
				{ runs: { scope: 'all', items: Array(UI_EXTENSION_DATA_LIMITS.runs + 1).fill(run) } },
			],
			[
				'a value that is too long',
				{
					services: [
						service({
							lastRun: {
								executionId: '1',
								status: 'success',
								finishedAt: null,
								itemCount: 1,
								items: [{ text: 'x'.repeat(UI_EXTENSION_DATA_LIMITS.valueLength + 1) }],
							},
						}),
					],
				},
			],
			[
				'a target link that is not http(s)',
				{
					services: [service({ targets: [{ label: 'L', name: 'N', url: 'javascript:alert(1)' }] })],
				},
			],
		])('rejects %s', (_case, overrides) => {
			expect(uiExtensionPanelDataSchema.safeParse(data(overrides)).success).toBe(false);
		});

		it('accepts refresh and open in the frame protocol', () => {
			const parse = (message: object) =>
				uiExtensionFrameMessageSchema.safeParse({ ...envelope, ...message }).success;

			expect(parse({ type: 'refresh' })).toBe(true);
			expect(
				parse({ type: 'open', target: { kind: 'execution', workflowId: 'w', executionId: '1' } }),
			).toBe(true);
			expect(parse({ type: 'open', target: { kind: 'url', url: 'https://x.test' } })).toBe(true);
			expect(parse({ type: 'open', target: { kind: 'url', url: 'javascript:alert(1)' } })).toBe(
				false,
			);
		});

		it.each([
			['https://x.test/a', true],
			['http://x.test', true],
			['javascript:alert(1)', false],
			['data:text/html,x', false],
			['not a url', false],
		])('treats %s as openable: %s', (url, expected) => {
			expect(isUiExtensionOpenableUrl(url)).toBe(expected);
		});
	});
});
