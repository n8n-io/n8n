import type { InstanceAiPermissions } from '@n8n/api-types';
import { UnexpectedError, UserError } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { executeTool } from '../../__tests__/tool-test-utils';
import type { InstanceAiAppService, InstanceAiContext } from '../../types';
import { createAppsTool } from '../apps.tool';

// ── Helpers ──────────────────────────────────────────────────────────────────

class AppContentInvalidError extends Error {
	constructor(readonly meta: { pages: Array<{ pageId: string; issues: unknown }> }) {
		super("This app's draft content does not match the block schema; fix it before publishing.");
		this.name = 'AppContentInvalidError';
	}
}

function createMockAppService(): {
	[K in keyof InstanceAiAppService]: Mock;
} {
	return {
		listApps: vi.fn().mockResolvedValue([]),
		createApp: vi.fn(),
		getApp: vi.fn(),
		updateApp: vi.fn(),
		listPages: vi.fn().mockResolvedValue([]),
		getPage: vi.fn(),
		createPage: vi.fn(),
		updatePage: vi.fn(),
		deletePage: vi.fn().mockResolvedValue(undefined),
		publish: vi.fn(),
		previewPage: vi.fn(),
		codeApi: vi.fn().mockReturnValue('declare global {}'),
	};
}

function createMockContext(
	overrides: Partial<Omit<InstanceAiContext, 'permissions'>> & {
		permissions?: Partial<InstanceAiPermissions>;
	} = {},
): InstanceAiContext {
	return {
		userId: 'user-1',
		projectId: 'proj-1',
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		credentialService: {} as InstanceAiContext['credentialService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
		appService: createMockAppService(),
		permissions: {},
		...overrides,
	} as unknown as InstanceAiContext;
}

function suspendCtx(suspendFn: Mock) {
	return { resumeData: undefined, suspend: suspendFn } as never;
}

function resumeCtx(approved: boolean, scope?: 'once' | 'session') {
	return { resumeData: { approved, ...(scope ? { scope } : {}) } } as never;
}

function noSuspendCtx() {
	return { resumeData: undefined, suspend: undefined } as never;
}

const appSummary = {
	id: 'app-1',
	name: 'Orders dashboard',
	namespace: 'orders-dashboard',
	projectId: 'proj-1',
	url: '/apps/orders-dashboard/',
	activeVersionId: null,
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('apps tool', () => {
	describe('tool construction', () => {
		it('should require loading app-builder before use', () => {
			const context = createMockContext();
			const tool = createAppsTool(context);

			expect(tool.description).toContain('Load `app-builder`');
			expect(tool.description).toContain('load_skill');
		});

		it('should throw when appService is absent', () => {
			const context = createMockContext({ appService: undefined });

			expect(() => createAppsTool(context)).toThrow(UnexpectedError);
		});
	});

	// ── list ────────────────────────────────────────────────────────────────

	describe('list action', () => {
		it('resolves the bound project when projectId is omitted', async () => {
			const context = createMockContext();
			(context.appService?.listApps as Mock).mockResolvedValue([appSummary]);

			const tool = createAppsTool(context);
			const result = await executeTool(tool, { action: 'list' as const }, noSuspendCtx());

			expect(context.appService?.listApps).toHaveBeenCalledWith('proj-1');
			expect(result).toEqual({ apps: [appSummary] });
		});

		it('uses the explicit projectId when provided', async () => {
			const context = createMockContext();
			(context.appService?.listApps as Mock).mockResolvedValue([]);

			const tool = createAppsTool(context);
			await executeTool(tool, { action: 'list' as const, projectId: 'proj-2' }, noSuspendCtx());

			expect(context.appService?.listApps).toHaveBeenCalledWith('proj-2');
		});

		it('throws when there is no project context at all', async () => {
			const context = createMockContext({ projectId: undefined });

			const tool = createAppsTool(context);
			await expect(executeTool(tool, { action: 'list' as const }, noSuspendCtx())).rejects.toThrow(
				UserError,
			);
		});
	});

	// ── create ──────────────────────────────────────────────────────────────

	describe('create action', () => {
		const createInput = { action: 'create' as const, name: 'Orders dashboard' };

		it('returns denied when permission is blocked', async () => {
			const context = createMockContext({ permissions: { createApp: 'blocked' } });

			const tool = createAppsTool(context);
			const result = await executeTool(tool, createInput, noSuspendCtx());

			expect(result).toEqual({ denied: true, reason: 'Action blocked by admin' });
			expect(context.appService?.createApp).not.toHaveBeenCalled();
		});

		it('suspends for confirmation and slugifies the namespace', async () => {
			const context = createMockContext({ permissions: {} });
			const suspendFn = vi.fn();

			const tool = createAppsTool(context);
			await executeTool(tool, createInput, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Create app "Orders dashboard" (namespace `orders-dashboard`)',
					severity: 'info',
				}),
			);
			expect(context.appService?.createApp).not.toHaveBeenCalled();
		});

		it('executes immediately when permission is always_allow', async () => {
			const context = createMockContext({ permissions: { createApp: 'always_allow' } });
			(context.appService?.createApp as Mock).mockResolvedValue({ app: appSummary });

			const tool = createAppsTool(context);
			const result = await executeTool(tool, createInput, noSuspendCtx());

			expect(context.appService?.createApp).toHaveBeenCalledWith({
				projectId: 'proj-1',
				name: 'Orders dashboard',
				namespace: 'orders-dashboard',
			});
			expect(result).toEqual({
				appId: 'app-1',
				name: 'Orders dashboard',
				namespace: 'orders-dashboard',
				projectId: 'proj-1',
				url: '/apps/orders-dashboard/',
			});
		});

		it('honors an explicit namespace', async () => {
			const context = createMockContext({ permissions: { createApp: 'always_allow' } });
			(context.appService?.createApp as Mock).mockResolvedValue({ app: appSummary });

			const tool = createAppsTool(context);
			await executeTool(tool, { ...createInput, namespace: 'custom-ns' }, noSuspendCtx());

			expect(context.appService?.createApp).toHaveBeenCalledWith(
				expect.objectContaining({ namespace: 'custom-ns' }),
			);
		});

		it('creates after the user approves on resume', async () => {
			const context = createMockContext({ permissions: {} });
			(context.appService?.createApp as Mock).mockResolvedValue({ app: appSummary });

			const tool = createAppsTool(context);
			const result = await executeTool(tool, createInput, resumeCtx(true));

			expect(context.appService?.createApp).toHaveBeenCalled();
			expect(result).toMatchObject({ appId: 'app-1' });
		});

		it('returns denied when the user denies on resume', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createAppsTool(context);
			const result = await executeTool(tool, createInput, resumeCtx(false));

			expect(result).toEqual({ denied: true, reason: 'User denied the action' });
			expect(context.appService?.createApp).not.toHaveBeenCalled();
		});

		it('persists a session grant on scope=session', async () => {
			const grantSessionToolApproval = vi.fn().mockResolvedValue(undefined);
			const context = createMockContext({ permissions: {}, grantSessionToolApproval });
			(context.appService?.createApp as Mock).mockResolvedValue({ app: appSummary });

			const tool = createAppsTool(context);
			await executeTool(tool, createInput, resumeCtx(true, 'session'));

			expect(grantSessionToolApproval).toHaveBeenCalledWith('apps:create');
		});

		it('skips HITL when a session grant already exists', async () => {
			const context = createMockContext({
				permissions: {},
				sessionApprovedToolKeys: new Set(['apps:create']),
			});
			(context.appService?.createApp as Mock).mockResolvedValue({ app: appSummary });

			const tool = createAppsTool(context);
			const result = await executeTool(tool, createInput, noSuspendCtx());

			expect(result).toMatchObject({ appId: 'app-1' });
		});

		it('forwards the layout preset to the service', async () => {
			const context = createMockContext({ permissions: { createApp: 'always_allow' } });
			(context.appService?.createApp as Mock).mockResolvedValue({ app: appSummary });

			const tool = createAppsTool(context);
			await executeTool(tool, { ...createInput, layoutPreset: 'sidebar' }, noSuspendCtx());

			expect(context.appService?.createApp).toHaveBeenCalledWith({
				projectId: 'proj-1',
				name: 'Orders dashboard',
				namespace: 'orders-dashboard',
				layoutPreset: 'sidebar',
			});
		});

		it('returns denied on a namespace conflict', async () => {
			const context = createMockContext({ permissions: { createApp: 'always_allow' } });
			(context.appService?.createApp as Mock).mockResolvedValue({ conflict: true });

			const tool = createAppsTool(context);
			const result = await executeTool(tool, createInput, noSuspendCtx());

			expect(result).toEqual({
				denied: true,
				reason:
					'Namespace "orders-dashboard" is already in use by another app. Choose a different namespace.',
			});
		});
	});

	// ── get ─────────────────────────────────────────────────────────────────

	describe('get action', () => {
		it('composes the app and its pages', async () => {
			const pages = [{ id: 'page-1', route: '', parentPageId: null, path: '/', hasContent: true }];
			const context = createMockContext();
			(context.appService?.getApp as Mock).mockResolvedValue({
				...appSummary,
				components: 'export const Card = () => <div />;',
			});
			(context.appService?.listPages as Mock).mockResolvedValue(pages);

			const tool = createAppsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'get' as const, appId: 'app-1' },
				noSuspendCtx(),
			);

			expect(context.appService?.getApp).toHaveBeenCalledWith('app-1');
			expect(context.appService?.listPages).toHaveBeenCalledWith('app-1');
			expect(result).toEqual({
				appId: 'app-1',
				name: 'Orders dashboard',
				namespace: 'orders-dashboard',
				projectId: 'proj-1',
				url: '/apps/orders-dashboard/',
				activeVersionId: null,
				components: 'export const Card = () => <div />;',
				pages,
			});
		});
	});

	// ── update-app ──────────────────────────────────────────────────────────

	describe('update-app action', () => {
		it('updates and returns the flat app summary', async () => {
			const context = createMockContext();
			(context.appService?.updateApp as Mock).mockResolvedValue({
				...appSummary,
				name: 'Renamed',
			});

			const tool = createAppsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'update-app' as const, appId: 'app-1', name: 'Renamed' },
				noSuspendCtx(),
			);

			expect(context.appService?.updateApp).toHaveBeenCalledWith('app-1', {
				name: 'Renamed',
				theme: undefined,
				components: undefined,
				auth: undefined,
			});
			expect(result).toEqual({
				appId: 'app-1',
				name: 'Renamed',
				namespace: 'orders-dashboard',
				projectId: 'proj-1',
				url: '/apps/orders-dashboard/',
			});
		});

		it('passes the components source through', async () => {
			const context = createMockContext();
			(context.appService?.updateApp as Mock).mockResolvedValue(appSummary);
			const components = 'export function Card() { return <div />; }';

			const tool = createAppsTool(context);
			await executeTool(
				tool,
				{ action: 'update-app' as const, appId: 'app-1', components },
				noSuspendCtx(),
			);

			expect(context.appService?.updateApp).toHaveBeenCalledWith(
				'app-1',
				expect.objectContaining({ components }),
			);
		});

		it('returns denied with issues when the adapter rejects the input', async () => {
			const context = createMockContext();
			const error = new UserError('Invalid app input');
			Object.assign(error, { issues: [{ path: ['name'], message: 'Too short' }] });
			(context.appService?.updateApp as Mock).mockRejectedValue(error);

			const tool = createAppsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'update-app' as const, appId: 'app-1', name: 'Renamed' },
				noSuspendCtx(),
			);

			expect(result).toEqual({
				denied: true,
				reason: 'Invalid app input',
				issues: [{ path: ['name'], message: 'Too short' }],
			});
		});
	});

	// ── create-page ─────────────────────────────────────────────────────────

	describe('create-page action', () => {
		it('creates a page and enriches the result with app info', async () => {
			const page = {
				id: 'page-1',
				route: 'clients',
				parentPageId: null,
				path: '/clients',
				hasContent: false,
			};
			const context = createMockContext();
			(context.appService?.createPage as Mock).mockResolvedValue(page);
			(context.appService?.getApp as Mock).mockResolvedValue(appSummary);

			const tool = createAppsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'create-page' as const, appId: 'app-1', route: 'clients' },
				noSuspendCtx(),
			);

			expect(context.appService?.createPage).toHaveBeenCalledWith('app-1', {
				route: 'clients',
				parentPageId: undefined,
				content: undefined,
			});
			expect(result).toEqual({
				appId: 'app-1',
				pageId: 'page-1',
				route: 'clients',
				path: '/clients',
				projectId: 'proj-1',
				namespace: 'orders-dashboard',
			});
		});

		it('forwards the title and returns it', async () => {
			const page = {
				id: 'page-1',
				route: 'clients',
				title: 'Clients',
				parentPageId: null,
				path: '/clients',
				hasContent: false,
			};
			const context = createMockContext();
			(context.appService?.createPage as Mock).mockResolvedValue(page);
			(context.appService?.getApp as Mock).mockResolvedValue(appSummary);

			const tool = createAppsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'create-page' as const, appId: 'app-1', route: 'clients', title: 'Clients' },
				noSuspendCtx(),
			);

			expect(context.appService?.createPage).toHaveBeenCalledWith(
				'app-1',
				expect.objectContaining({ route: 'clients', title: 'Clients' }),
			);
			expect(result).toMatchObject({ pageId: 'page-1', title: 'Clients' });
		});

		it('generates missing block ids before validating content', async () => {
			const page = {
				id: 'page-1',
				route: 'clients',
				parentPageId: null,
				path: '/clients',
				hasContent: true,
			};
			const context = createMockContext();
			(context.appService?.createPage as Mock).mockResolvedValue(page);
			(context.appService?.getApp as Mock).mockResolvedValue(appSummary);

			const tool = createAppsTool(context);
			await executeTool(
				tool,
				{
					action: 'create-page' as const,
					appId: 'app-1',
					route: 'clients',
					content: [{ type: 'paragraph', data: { text: 'Hi' } }],
				},
				noSuspendCtx(),
			);

			const call = (context.appService?.createPage as Mock).mock.calls[0][1];
			expect(call.content).toHaveLength(1);
			expect(typeof call.content[0].id).toBe('string');
			expect(call.content[0].id.length).toBeGreaterThan(0);
		});

		it('keeps an existing block id', async () => {
			const page = {
				id: 'page-1',
				route: 'clients',
				parentPageId: null,
				path: '/clients',
				hasContent: true,
			};
			const context = createMockContext();
			(context.appService?.createPage as Mock).mockResolvedValue(page);
			(context.appService?.getApp as Mock).mockResolvedValue(appSummary);

			const tool = createAppsTool(context);
			await executeTool(
				tool,
				{
					action: 'create-page' as const,
					appId: 'app-1',
					route: 'clients',
					content: [{ id: 'block-1', type: 'paragraph', data: { text: 'Hi' } }],
				},
				noSuspendCtx(),
			);

			const call = (context.appService?.createPage as Mock).mock.calls[0][1];
			expect(call.content[0].id).toBe('block-1');
		});

		it('returns denied with zod issues on invalid content, without calling the adapter', async () => {
			const context = createMockContext();

			const tool = createAppsTool(context);
			const result = await executeTool(
				tool,
				{
					action: 'create-page' as const,
					appId: 'app-1',
					route: 'clients',
					content: [{ id: 'block-1', type: 'not-a-real-type', data: {} }],
				},
				noSuspendCtx(),
			);

			expect(result).toMatchObject({ denied: true, reason: 'Invalid page content' });
			expect(result).toHaveProperty('issues');
			expect(context.appService?.createPage).not.toHaveBeenCalled();
		});

		it('validates, backfills ids and passes a layout', async () => {
			const context = createMockContext();
			(context.appService?.createPage as Mock).mockResolvedValue({
				id: 'page-1',
				route: 'clients',
				parentPageId: null,
				path: '/clients',
				hasContent: false,
			});
			(context.appService?.getApp as Mock).mockResolvedValue(appSummary);

			const tool = createAppsTool(context);
			await executeTool(
				tool,
				{
					action: 'create-page' as const,
					appId: 'app-1',
					route: 'clients',
					layout: [
						{ type: 'header', data: { text: 'Banner', level: 2 } },
						{ id: 'slot', type: 'slot', data: {} },
					],
				},
				noSuspendCtx(),
			);

			const call = (context.appService?.createPage as Mock).mock.calls[0][1];
			expect(call.layout).toHaveLength(2);
			expect(typeof call.layout[0].id).toBe('string');
			expect(call.layout[1]).toEqual({ id: 'slot', type: 'slot', data: {} });
		});

		it('returns denied when the layout has no slot, without calling the adapter', async () => {
			const context = createMockContext();

			const tool = createAppsTool(context);
			const result = await executeTool(
				tool,
				{
					action: 'create-page' as const,
					appId: 'app-1',
					route: 'clients',
					layout: [{ id: 'h', type: 'header', data: { text: 'Banner', level: 2 } }],
				},
				noSuspendCtx(),
			);

			expect(result).toMatchObject({ denied: true, reason: 'Invalid page layout' });
			expect(context.appService?.createPage).not.toHaveBeenCalled();
		});
	});

	// ── get-page ────────────────────────────────────────────────────────────

	describe('get-page action', () => {
		it('returns the flat page view', async () => {
			const page = {
				id: 'page-1',
				route: 'clients',
				parentPageId: null,
				path: '/clients',
				hasContent: true,
				content: [{ id: 'b1', type: 'paragraph', data: { text: 'Hi' } }],
				layout: [{ id: 's1', type: 'slot', data: {} }],
			};
			const context = createMockContext();
			(context.appService?.getPage as Mock).mockResolvedValue(page);

			const tool = createAppsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'get-page' as const, appId: 'app-1', pageId: 'page-1' },
				noSuspendCtx(),
			);

			expect(result).toEqual({
				appId: 'app-1',
				pageId: 'page-1',
				route: 'clients',
				path: '/clients',
				content: page.content,
				layout: page.layout,
			});
		});
	});

	// ── set-content ─────────────────────────────────────────────────────────

	describe('set-content action', () => {
		it('validates, backfills ids, and returns the block count', async () => {
			const page = {
				id: 'page-1',
				route: 'clients',
				parentPageId: null,
				path: '/clients',
				hasContent: true,
			};
			const context = createMockContext();
			(context.appService?.updatePage as Mock).mockResolvedValue(page);

			const tool = createAppsTool(context);
			const result = await executeTool(
				tool,
				{
					action: 'set-content' as const,
					appId: 'app-1',
					pageId: 'page-1',
					content: [
						{ type: 'header', data: { text: 'Hi', level: 1 } },
						{ id: 'b2', type: 'divider', data: {} },
					],
				},
				noSuspendCtx(),
			);

			expect(context.appService?.updatePage).toHaveBeenCalledWith('app-1', 'page-1', {
				content: expect.arrayContaining([expect.objectContaining({ id: 'b2', type: 'divider' })]),
			});
			expect(result).toEqual({ appId: 'app-1', pageId: 'page-1', path: '/clients', blockCount: 2 });
		});

		it('returns denied with issues on invalid content', async () => {
			const context = createMockContext();

			const tool = createAppsTool(context);
			const result = await executeTool(
				tool,
				{
					action: 'set-content' as const,
					appId: 'app-1',
					pageId: 'page-1',
					content: [{ id: 'b1', type: 'header', data: { text: 'Hi' } }],
				},
				noSuspendCtx(),
			);

			expect(result).toMatchObject({ denied: true, reason: 'Invalid page content' });
			expect(context.appService?.updatePage).not.toHaveBeenCalled();
		});
	});

	// ── set-layout ──────────────────────────────────────────────────────────

	describe('set-layout action', () => {
		const page = {
			id: 'page-1',
			route: 'clients',
			parentPageId: null,
			path: '/clients',
			hasContent: false,
		};

		it('validates, backfills ids, and stores the layout', async () => {
			const context = createMockContext();
			(context.appService?.updatePage as Mock).mockResolvedValue(page);

			const tool = createAppsTool(context);
			const result = await executeTool(
				tool,
				{
					action: 'set-layout' as const,
					appId: 'app-1',
					pageId: 'page-1',
					layout: [
						{ type: 'header', data: { text: 'Banner', level: 2 } },
						{ id: 'slot', type: 'slot', data: {} },
					],
				},
				noSuspendCtx(),
			);

			const call = (context.appService?.updatePage as Mock).mock.calls[0][2];
			expect(call.layout).toHaveLength(2);
			expect(typeof call.layout[0].id).toBe('string');
			expect(call.layout[1]).toEqual({ id: 'slot', type: 'slot', data: {} });
			expect(result).toEqual({ appId: 'app-1', pageId: 'page-1', path: '/clients', blockCount: 2 });
		});

		it('passes null through to inherit the parent layout', async () => {
			const context = createMockContext();
			(context.appService?.updatePage as Mock).mockResolvedValue(page);

			const tool = createAppsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'set-layout' as const, appId: 'app-1', pageId: 'page-1', layout: null },
				noSuspendCtx(),
			);

			expect(context.appService?.updatePage).toHaveBeenCalledWith('app-1', 'page-1', {
				layout: null,
			});
			expect(result).toEqual({
				appId: 'app-1',
				pageId: 'page-1',
				path: '/clients',
				blockCount: null,
			});
		});

		it('returns denied with issues when the layout has no slot', async () => {
			const context = createMockContext();

			const tool = createAppsTool(context);
			const result = await executeTool(
				tool,
				{
					action: 'set-layout' as const,
					appId: 'app-1',
					pageId: 'page-1',
					layout: [{ id: 'h', type: 'header', data: { text: 'Banner', level: 2 } }],
				},
				noSuspendCtx(),
			);

			expect(result).toMatchObject({ denied: true, reason: 'Invalid page layout' });
			expect(result).toHaveProperty('issues');
			expect(context.appService?.updatePage).not.toHaveBeenCalled();
		});
	});

	// ── update-page ─────────────────────────────────────────────────────────

	describe('update-page action', () => {
		it('updates the route', async () => {
			const page = {
				id: 'page-1',
				route: 'new-route',
				parentPageId: null,
				path: '/new-route',
				hasContent: false,
			};
			const context = createMockContext();
			(context.appService?.updatePage as Mock).mockResolvedValue(page);

			const tool = createAppsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'update-page' as const, appId: 'app-1', pageId: 'page-1', route: 'new-route' },
				noSuspendCtx(),
			);

			expect(context.appService?.updatePage).toHaveBeenCalledWith('app-1', 'page-1', {
				route: 'new-route',
			});
			expect(result).toEqual({
				appId: 'app-1',
				pageId: 'page-1',
				route: 'new-route',
				path: '/new-route',
			});
		});

		it('updates the title alone, and null resets it', async () => {
			const page = {
				id: 'page-1',
				route: 'clients',
				title: 'Customers',
				parentPageId: null,
				path: '/clients',
				hasContent: false,
			};
			const context = createMockContext();
			(context.appService?.updatePage as Mock).mockResolvedValue(page);

			const tool = createAppsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'update-page' as const, appId: 'app-1', pageId: 'page-1', title: 'Customers' },
				noSuspendCtx(),
			);
			await executeTool(
				tool,
				{ action: 'update-page' as const, appId: 'app-1', pageId: 'page-1', title: null },
				noSuspendCtx(),
			);

			expect(context.appService?.updatePage).toHaveBeenNthCalledWith(1, 'app-1', 'page-1', {
				route: undefined,
				title: 'Customers',
			});
			expect(context.appService?.updatePage).toHaveBeenNthCalledWith(2, 'app-1', 'page-1', {
				route: undefined,
				title: null,
			});
			expect(result).toMatchObject({ pageId: 'page-1', route: 'clients', title: 'Customers' });
		});

		it('denies a call that changes neither the route nor the title', async () => {
			const context = createMockContext();

			const tool = createAppsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'update-page' as const, appId: 'app-1', pageId: 'page-1' },
				noSuspendCtx(),
			);

			expect(result).toEqual({ denied: true, reason: 'Pass a route, a title, or both' });
			expect(context.appService?.updatePage).not.toHaveBeenCalled();
		});
	});

	// ── delete-page ─────────────────────────────────────────────────────────

	describe('delete-page action', () => {
		const deleteInput = { action: 'delete-page' as const, appId: 'app-1', pageId: 'page-1' };

		it('returns denied when permission is blocked', async () => {
			const context = createMockContext({ permissions: { deleteAppPage: 'blocked' } });

			const tool = createAppsTool(context);
			const result = await executeTool(tool, deleteInput, noSuspendCtx());

			expect(result).toEqual({ success: false, denied: true, reason: 'Action blocked by admin' });
			expect(context.appService?.deletePage).not.toHaveBeenCalled();
		});

		it('suspends with the page route in the message', async () => {
			const context = createMockContext({ permissions: {} });
			(context.appService?.getPage as Mock).mockResolvedValue({
				id: 'page-1',
				route: 'clients',
				parentPageId: null,
				path: '/clients',
				hasContent: false,
				content: null,
			});
			const suspendFn = vi.fn();

			const tool = createAppsTool(context);
			await executeTool(tool, deleteInput, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Delete page "clients" from app app-1',
					severity: 'destructive',
				}),
			);
			expect(context.appService?.deletePage).not.toHaveBeenCalled();
		});

		it('names the page by its title in the message when it has one', async () => {
			const context = createMockContext({ permissions: {} });
			(context.appService?.getPage as Mock).mockResolvedValue({
				id: 'page-1',
				route: 'clients',
				title: 'Clients',
				parentPageId: null,
				path: '/clients',
				hasContent: false,
				content: null,
			});
			const suspendFn = vi.fn();

			const tool = createAppsTool(context);
			await executeTool(tool, deleteInput, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Delete page "Clients" from app app-1' }),
			);
		});

		it('falls back to a plain message when the page lookup fails', async () => {
			const context = createMockContext({ permissions: {} });
			(context.appService?.getPage as Mock).mockRejectedValue(new Error('not found'));
			const suspendFn = vi.fn();

			const tool = createAppsTool(context);
			await executeTool(tool, deleteInput, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalledWith(
				expect.objectContaining({ message: 'Delete page page-1 from app app-1' }),
			);
		});

		it('executes immediately when permission is always_allow', async () => {
			const context = createMockContext({ permissions: { deleteAppPage: 'always_allow' } });

			const tool = createAppsTool(context);
			const result = await executeTool(tool, deleteInput, noSuspendCtx());

			expect(context.appService?.deletePage).toHaveBeenCalledWith('app-1', 'page-1');
			expect(result).toEqual({ appId: 'app-1', pageId: 'page-1', deleted: true });
		});

		it('returns denied when the user denies on resume', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createAppsTool(context);
			const result = await executeTool(tool, deleteInput, resumeCtx(false));

			expect(result).toEqual({ success: false, denied: true, reason: 'User denied the action' });
			expect(context.appService?.deletePage).not.toHaveBeenCalled();
		});
	});

	// ── publish ─────────────────────────────────────────────────────────────

	describe('publish action', () => {
		const publishInput = { action: 'publish' as const, appId: 'app-1' };

		it('returns denied when permission is blocked', async () => {
			const context = createMockContext({ permissions: { publishApp: 'blocked' } });

			const tool = createAppsTool(context);
			const result = await executeTool(tool, publishInput, noSuspendCtx());

			expect(result).toEqual({ denied: true, reason: 'Action blocked by admin' });
			expect(context.appService?.publish).not.toHaveBeenCalled();
		});

		it('suspends with the app name in the message', async () => {
			const context = createMockContext({ permissions: {} });
			(context.appService?.getApp as Mock).mockResolvedValue(appSummary);
			const suspendFn = vi.fn();

			const tool = createAppsTool(context);
			await executeTool(tool, publishInput, suspendCtx(suspendFn));

			expect(suspendFn).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Publish app "Orders dashboard"',
					severity: 'warning',
				}),
			);
		});

		it('publishes after approval and returns appId/versionId/url', async () => {
			const context = createMockContext({ permissions: { publishApp: 'always_allow' } });
			(context.appService?.publish as Mock).mockResolvedValue({
				versionId: 'v1',
				url: '/apps/orders-dashboard/',
			});

			const tool = createAppsTool(context);
			const result = await executeTool(tool, publishInput, noSuspendCtx());

			expect(result).toEqual({ appId: 'app-1', versionId: 'v1', url: '/apps/orders-dashboard/' });
		});

		it('returns denied with page issues when publish content is invalid', async () => {
			const context = createMockContext({ permissions: { publishApp: 'always_allow' } });
			const pages = [{ pageId: 'page-1', issues: [{ message: 'bad block' }] }];
			(context.appService?.publish as Mock).mockRejectedValue(
				new AppContentInvalidError({ pages }),
			);

			const tool = createAppsTool(context);
			const result = await executeTool(tool, publishInput, noSuspendCtx());

			expect(result).toMatchObject({
				denied: true,
				issues: pages,
			});
		});
	});

	// ── preview-page ────────────────────────────────────────────────────────

	describe('preview-page action', () => {
		it('returns the render errors and logs per block, without html', async () => {
			const context = createMockContext();
			(context.appService?.previewPage as Mock).mockResolvedValue({
				errors: { b1: 'boom' },
				logs: { b2: ['["debug"]'] },
			});

			const tool = createAppsTool(context);
			const result = await executeTool(
				tool,
				{ action: 'preview-page' as const, appId: 'app-1', pageId: 'page-1', path: '/apps/x/c/42' },
				noSuspendCtx(),
			);

			expect(context.appService?.previewPage).toHaveBeenCalledWith(
				'app-1',
				'page-1',
				'/apps/x/c/42',
			);
			expect(result).toEqual({
				appId: 'app-1',
				pageId: 'page-1',
				errors: { b1: 'boom' },
				logs: { b2: ['["debug"]'] },
			});
		});
	});

	// ── code-api ────────────────────────────────────────────────────────────

	describe('code-api action', () => {
		it('returns the PageContext type text', async () => {
			const context = createMockContext();
			(context.appService?.codeApi as Mock).mockReturnValue('declare global { /* ... */ }');

			const tool = createAppsTool(context);
			const result = await executeTool(tool, { action: 'code-api' as const }, noSuspendCtx());

			expect(result).toEqual({ types: 'declare global { /* ... */ }' });
		});
	});
});
