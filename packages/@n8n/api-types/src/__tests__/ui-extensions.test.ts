import {
	isUiExtensionOpenableUrl,
	UI_EXTENSION_DATA_LIMITS,
	uiExtensionFrameMessageSchema,
	uiExtensionOverviewDataSchema,
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

	it('reads a stored record without a kind as a view, and accepts a page', () => {
		const view = { id: 'v', title: 'T', source: 'x', updatedAt: '' };

		expect(uiExtensionViewSchema.parse(view).kind).toBe('view');
		expect(uiExtensionViewSchema.parse({ ...view, kind: 'page' }).kind).toBe('page');
		expect(uiExtensionViewSchema.safeParse({ ...view, kind: 'tab' }).success).toBe(false);
	});

	describe('overview data', () => {
		const overview = () => ({
			workflows: { total: 3, active: 1, scanned: 3 },
			runs: { scanned: 0, succeeded: 0, failed: 0, items: [] },
			services: [
				{
					nodeType: 'n8n-nodes-base.slack',
					displayName: 'Slack',
					workflowCount: 1,
					activeWorkflowCount: 1,
					health: 'ok',
					accounts: ['Slack account'],
					workflows: [
						{ id: 'w', name: 'W', active: true, lastRun: { status: 'success', stoppedAt: null } },
					],
				},
			],
			failures: [],
		});

		it('accepts overview data as part of the panel data', () => {
			expect(uiExtensionOverviewDataSchema.safeParse(overview()).success).toBe(true);
			expect(
				uiExtensionPanelDataSchema.safeParse({
					state: 'ready',
					runs: null,
					services: null,
					overview: overview(),
				}).success,
			).toBe(true);
		});

		it.each([
			[
				'too many services',
				{
					services: Array(UI_EXTENSION_DATA_LIMITS.overviewServices + 1).fill(
						overview().services[0],
					),
				},
			],
			[
				'too many accounts',
				{
					services: [
						{
							...overview().services[0],
							accounts: Array(UI_EXTENSION_DATA_LIMITS.overviewAccountsPerService + 1).fill('a'),
						},
					],
				},
			],
			['an unknown health', { services: [{ ...overview().services[0], health: 'great' }] }],
			['a negative count', { workflows: { total: -1, active: 0, scanned: 0 } }],
		])('rejects overview data with %s', (_case, overrides) => {
			expect(uiExtensionOverviewDataSchema.safeParse({ ...overview(), ...overrides }).success).toBe(
				false,
			);
		});
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
				'a negative run time',
				{
					services: [
						service({
							lastRun: {
								executionId: '1',
								status: 'success',
								finishedAt: null,
								itemCount: 0,
								items: [],
								durationMs: -1,
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
			expect(parse({ type: 'open', target: { kind: 'workflow', workflowId: 'w' } })).toBe(true);
			expect(parse({ type: 'open', target: { kind: 'workflow' } })).toBe(false);
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
