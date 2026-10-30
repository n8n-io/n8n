import type { AgentSseEvent, AppBinding } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { App } from '../../app.entity';
import type { AppAuthService } from '../../auth/app-auth.service';
import type {
	AppAgentPort,
	AppDataTablePort,
	AppWorkflowPort,
} from '../../bindings/app-binding-ports';
import { AppRuntimeError } from '../../bindings/app-runtime.error';
import type { AppPreviewService } from '../../preview/app-preview.service';
import type { AppHostService } from '../../serving/app-host.service';
import type { AppVersion } from '../../versions/app-version.entity';
import type { AppVersionRepository } from '../../versions/app-version.repository';
import { AppRuntimeController, type AppRuntimeRequest } from '../app-runtime.controller';

const ORIGIN = 'https://crm.apps.example.com';

const bindings: AppBinding[] = [
	{ key: 'tasks', kind: 'dataTable', dataTableId: 'table-1', permissions: ['read'] },
	{
		key: 'notes',
		kind: 'dataTable',
		dataTableId: 'table-2',
		permissions: ['read', 'insert', 'update', 'delete'],
	},
	{ key: 'submit', kind: 'workflow', workflowId: 'workflow-1' },
	{ key: 'support', kind: 'agent', agentId: 'agent-1', permissions: ['chat'] },
];

const PUBLISHED_ID = 'version-published';
const DRAFT_ID = 'version-draft';
const PREVIEW_ORIGIN = 'https://crm--preview.apps.example.com';

const app = {
	id: 'app-1',
	namespace: 'crm',
	projectId: 'project-1',
	visibility: 'project',
	draftVersionId: DRAFT_ID,
	publishedVersionId: PUBLISHED_ID,
} as App;

/** The draft binds one more workflow than the published version. */
const draftBindings: AppBinding[] = [
	...bindings,
	{ key: 'draftOnly', kind: 'workflow', workflowId: 'workflow-2' },
];

const user = { id: 'user-1', email: 'a@b.c', firstName: 'Ada', lastName: undefined };

function request(
	options: {
		method?: string;
		headers?: Record<string, string>;
		params?: Record<string, string>;
		query?: Record<string, string>;
		body?: unknown;
		runtime?: boolean;
	} = {},
) {
	const headers: Record<string, string> = { 'x-n8n-app-request': '1', ...options.headers };
	return {
		method: options.method ?? 'GET',
		headers,
		params: options.params ?? {},
		query: options.query ?? {},
		body: options.body,
		get: (name: string) => headers[name.toLowerCase()],
		// Like Express, `is` answers null for a request without a body.
		is: (type: string) =>
			options.body === undefined ? null : headers['content-type']?.startsWith(type) ? type : false,
		appRuntime:
			options.runtime === false
				? undefined
				: { app, bindings, user, visitor: { type: 'user', userId: 'user-1' } },
	} as unknown as AppRuntimeRequest<{ key: string; executionId: string }>;
}

function response() {
	const res = mock<Response>({
		statusCode: 200,
		headersSent: false,
		writableEnded: false,
		destroyed: false,
	});
	res.status.mockImplementation((code) => {
		res.statusCode = code;
		return res;
	});
	res.set.mockReturnValue(res);
	return res;
}

function setup({ host = 'published' }: { host?: 'published' | 'preview' } = {}) {
	const auth = mock<AppAuthService>();
	auth.admit.mockResolvedValue({ ok: true, app, security: { subject: user } as never });
	auth.anonymousVisitorId.mockReturnValue('visitor-1');
	const preview = mock<AppPreviewService>();
	preview.admit.mockResolvedValue({
		app,
		versionId: DRAFT_ID,
		user: { id: 'editor-1', email: 'e@b.c', firstName: 'Eve', lastName: null } as unknown as User,
	});
	const versions = mock<AppVersionRepository>();
	// Plain objects: `mock()` does not keep arrays such as `bindings`.
	versions.findVersionById.mockImplementation(async (id) =>
		id === PUBLISHED_ID || id === DRAFT_ID
			? ({
					id,
					appId: app.id,
					bindings: id === DRAFT_ID ? draftBindings : bindings,
				} as AppVersion)
			: null,
	);
	const hosts = mock<AppHostService>();
	hosts.previewNamespace.mockReturnValue(host === 'preview' ? 'crm' : undefined);
	hosts.namespace.mockReturnValue(host === 'published' ? 'crm' : undefined);
	hosts.origin.mockReturnValue(ORIGIN);
	hosts.previewOrigin.mockReturnValue(PREVIEW_ORIGIN);
	const dataTables = mock<AppDataTablePort>();
	const workflows = mock<AppWorkflowPort>();
	const agents = mock<AppAgentPort>();
	const controller = new AppRuntimeController(
		auth,
		preview,
		versions,
		hosts,
		dataTables,
		workflows,
		agents,
		mock<Logger>(),
	);
	return { controller, auth, preview, versions, dataTables, workflows, agents };
}

describe('AppRuntimeController', () => {
	describe('prepare', () => {
		it.each([
			['the app request header is missing', { 'x-n8n-app-request': '' }],
			['the origin is another app', { origin: 'https://evil.apps.example.com' }],
			['the request comes from another site', { 'sec-fetch-site': 'same-site' }],
		])('rejects a request when %s', async (_, headers) => {
			const { controller, auth } = setup();
			const res = response();
			const next = vi.fn();

			await controller.prepare(request({ headers, runtime: false }), res, next);

			expect(res.status).toHaveBeenCalledWith(403);
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'forbidden_origin' }));
			expect(auth.admit).not.toHaveBeenCalled();
			expect(next).not.toHaveBeenCalled();
		});

		it('rejects a body that is not JSON', async () => {
			const { controller } = setup();
			const res = response();

			await controller.prepare(
				request({
					method: 'POST',
					headers: { 'content-type': 'text/plain' },
					body: 'hello',
					runtime: false,
				}),
				res,
				vi.fn(),
			);

			expect(res.status).toHaveBeenCalledWith(415);
		});

		it('accepts a POST without a body', async () => {
			const { controller } = setup();
			const res = response();
			const next = vi.fn();

			await controller.prepare(
				request({
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					runtime: false,
				}),
				res,
				next,
			);

			expect(res.status).not.toHaveBeenCalledWith(415);
			expect(next).toHaveBeenCalled();
		});

		it.each([
			['unauthenticated', 401, 'unauthenticated'],
			['insufficient_scope', 403, 'forbidden'],
		] as const)('answers %s admission with %i', async (reason, status, code) => {
			const { controller, auth } = setup();
			auth.admit.mockResolvedValue({ ok: false, app, reason });
			const res = response();

			await controller.prepare(request({ runtime: false }), res, vi.fn());

			expect(res.status).toHaveBeenCalledWith(status);
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code }));
		});

		it('answers 404 when the host has no published app', async () => {
			const { controller, auth } = setup();
			auth.admit.mockRejectedValue(new NotFoundError('App not found.'));
			const res = response();

			await controller.prepare(request({ runtime: false }), res, vi.fn());

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'app_not_found' }));
		});

		it('identifies a signed-in visitor by user ID', async () => {
			const { controller } = setup();
			const req = request({
				headers: { origin: ORIGIN, 'sec-fetch-site': 'same-origin' },
				runtime: false,
			});
			const next = vi.fn();

			await controller.prepare(req, response(), next);

			expect(next).toHaveBeenCalled();
			expect(req.appRuntime?.visitor).toEqual({ type: 'user', userId: 'user-1' });
		});

		it('identifies a visitor of a public app by the visitor cookie', async () => {
			const { controller, auth } = setup();
			auth.admit.mockResolvedValue({ ok: true, app: { ...app, visibility: 'public' } as App });
			const req = request({ runtime: false });

			await controller.prepare(req, response(), vi.fn());

			expect(req.appRuntime?.visitor).toEqual({ type: 'anonymous', id: 'visitor-1' });
		});

		it('serves the bindings of the published version', async () => {
			const { controller, versions, preview } = setup();
			const req = request({ runtime: false });

			await controller.prepare(req, response(), vi.fn());

			expect(versions.findVersionById).toHaveBeenCalledWith(PUBLISHED_ID);
			expect(req.appRuntime?.bindings).toEqual(bindings);
			expect(preview.admit).not.toHaveBeenCalled();
		});

		it('answers 404 when the published version belongs to another app', async () => {
			const { controller, versions } = setup();
			versions.findVersionById.mockResolvedValue({
				id: PUBLISHED_ID,
				appId: 'app-2',
				bindings,
			} as AppVersion);
			const res = response();
			const next = vi.fn();

			await controller.prepare(request({ runtime: false }), res, next);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'app_not_found' }));
			expect(next).not.toHaveBeenCalled();
		});
	});

	describe('prepare on a preview host', () => {
		const sameOrigin = { origin: PREVIEW_ORIGIN, 'sec-fetch-site': 'same-origin' };

		it('serves the bindings of the previewed version to the preview user', async () => {
			const { controller, auth, versions } = setup({ host: 'preview' });
			const req = request({ headers: sameOrigin, runtime: false });
			const next = vi.fn();

			await controller.prepare(req, response(), next);

			expect(next).toHaveBeenCalled();
			expect(auth.admit).not.toHaveBeenCalled();
			expect(versions.findVersionById).toHaveBeenCalledWith(DRAFT_ID);
			expect(req.appRuntime?.bindings).toEqual(draftBindings);
			expect(req.appRuntime?.visitor).toEqual({ type: 'user', userId: 'editor-1' });
			expect(req.appRuntime?.user).toEqual({
				id: 'editor-1',
				email: 'e@b.c',
				firstName: 'Eve',
				lastName: undefined,
			});
		});

		it('works for an app that was never published', async () => {
			const { controller, preview } = setup({ host: 'preview' });
			preview.admit.mockResolvedValue({
				app: { ...app, publishedVersionId: null } as App,
				versionId: DRAFT_ID,
				user: { id: 'editor-1', email: 'e@b.c' } as User,
			});
			const req = request({ headers: sameOrigin, runtime: false });
			const next = vi.fn();

			await controller.prepare(req, response(), next);

			expect(next).toHaveBeenCalled();
			expect(req.appRuntime?.bindings).toEqual(draftBindings);
		});

		it('resolves a binding that only the previewed draft has', async () => {
			const { controller, workflows } = setup({ host: 'preview' });
			workflows.run.mockResolvedValue({ executionId: '1', status: 'success', output: [] });
			const req = request({ method: 'POST', headers: sameOrigin, runtime: false });
			await controller.prepare(req, response(), vi.fn());
			const res = response();

			await controller.runWorkflow(
				Object.assign(req, { params: { key: 'draftOnly' }, body: {} }),
				res,
			);

			expect(workflows.run).toHaveBeenCalledWith(
				expect.objectContaining({ bindingKey: 'draftOnly' }),
				'workflow-2',
				{},
			);
		});

		it('rejects the origin of the published host', async () => {
			const { controller, preview } = setup({ host: 'preview' });
			const res = response();

			await controller.prepare(
				request({ headers: { origin: ORIGIN }, runtime: false }),
				res,
				vi.fn(),
			);

			expect(res.status).toHaveBeenCalledWith(403);
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'forbidden_origin' }));
			expect(preview.admit).not.toHaveBeenCalled();
		});

		it('answers 401 when the preview session ended', async () => {
			const { controller, preview } = setup({ host: 'preview' });
			preview.admit.mockResolvedValue(null);
			const res = response();
			const next = vi.fn();

			await controller.prepare(request({ headers: sameOrigin, runtime: false }), res, next);

			expect(res.status).toHaveBeenCalledWith(401);
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'unauthenticated' }));
			expect(next).not.toHaveBeenCalled();
		});
	});

	it('returns the signed-in user', async () => {
		const { controller } = setup();
		const res = response();

		await controller.me(request(), res);

		expect(res.json).toHaveBeenCalledWith({
			user: { id: 'user-1', email: 'a@b.c', firstName: 'Ada', lastName: null },
			visibility: 'project',
		});
	});

	it('lists bindings without resource IDs', async () => {
		const { controller } = setup();
		const res = response();

		await controller.bindings(request(), res);

		expect(res.json).toHaveBeenCalledWith([
			{ key: 'tasks', kind: 'dataTable', permissions: ['read'] },
			{ key: 'notes', kind: 'dataTable', permissions: ['read', 'insert', 'update', 'delete'] },
			{ key: 'submit', kind: 'workflow' },
			{ key: 'support', kind: 'agent', permissions: ['chat'] },
		]);
	});

	describe('tables', () => {
		it('lists rows of the bound table with the parsed query', async () => {
			const { controller, dataTables } = setup();
			dataTables.listRows.mockResolvedValue({ count: 1, data: [{ id: 1 }] });
			const res = response();
			const filter = {
				type: 'and',
				filters: [{ columnName: 'done', condition: 'eq', value: false }],
			};

			await controller.listRows(
				request({ params: { key: 'tasks' }, query: { filter: JSON.stringify(filter), take: '5' } }),
				res,
			);

			expect(dataTables.listRows).toHaveBeenCalledWith(
				expect.objectContaining({ appId: 'app-1', projectId: 'project-1', bindingKey: 'tasks' }),
				'table-1',
				expect.objectContaining({ filter, take: 5 }),
			);
			expect(res.json).toHaveBeenCalledWith({ count: 1, data: [{ id: 1 }] });
		});

		it('rejects an unknown binding key', async () => {
			const { controller, dataTables } = setup();
			const res = response();

			await controller.listRows(request({ params: { key: 'submit' } }), res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'binding_not_found' }));
			expect(dataTables.listRows).not.toHaveBeenCalled();
		});

		it('rejects a write that the binding does not allow', async () => {
			const { controller, dataTables } = setup();
			const res = response();

			await controller.insertRows(
				request({ method: 'POST', params: { key: 'tasks' }, body: { data: [{ title: 'x' }] } }),
				res,
			);

			expect(res.status).toHaveBeenCalledWith(403);
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'permission_denied' }));
			expect(dataTables.insertRows).not.toHaveBeenCalled();
		});

		const filter = {
			type: 'and',
			filters: [{ columnName: 'id', condition: 'eq', value: 1 }],
		};

		it('inserts rows and answers 201', async () => {
			const { controller, dataTables } = setup();
			dataTables.insertRows.mockResolvedValue([{ id: 1, title: 'x' }]);
			const res = response();

			await controller.insertRows(
				request({ method: 'POST', params: { key: 'notes' }, body: { data: [{ title: 'x' }] } }),
				res,
			);

			expect(dataTables.insertRows).toHaveBeenCalledWith(
				expect.objectContaining({ bindingKey: 'notes' }),
				'table-2',
				[{ title: 'x' }],
			);
			expect(res.status).toHaveBeenCalledWith(201);
			expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1, title: 'x' }] });
		});

		it('updates the rows that match the filter', async () => {
			const { controller, dataTables } = setup();
			dataTables.updateRows.mockResolvedValue([{ id: 1, done: true }]);
			const res = response();

			await controller.updateRows(
				request({
					method: 'PATCH',
					params: { key: 'notes' },
					body: { filter, data: { done: true } },
				}),
				res,
			);

			expect(dataTables.updateRows).toHaveBeenCalledWith(
				expect.anything(),
				'table-2',
				expect.objectContaining({ filters: filter.filters }),
				{ done: true },
			);
			expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1, done: true }] });
		});

		it('deletes the rows that match the filter', async () => {
			const { controller, dataTables } = setup();
			dataTables.deleteRows.mockResolvedValue([{ id: 1 }]);
			const res = response();

			await controller.deleteRows(
				request({ method: 'POST', params: { key: 'notes' }, body: { filter } }),
				res,
			);

			expect(dataTables.deleteRows).toHaveBeenCalledWith(
				expect.anything(),
				'table-2',
				expect.objectContaining({ filters: filter.filters }),
			);
			expect(res.json).toHaveBeenCalledWith({ data: [{ id: 1 }] });
		});

		it.each([
			['an update without a filter', 'updateRows', { data: { done: true } }],
			['a delete without a filter', 'deleteRows', {}],
		] as const)('rejects %s', async (_, route, body) => {
			const { controller, dataTables } = setup();
			const res = response();

			await controller[route](request({ method: 'POST', params: { key: 'notes' }, body }), res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'invalid_input' }));
			expect(dataTables.updateRows).not.toHaveBeenCalled();
			expect(dataTables.deleteRows).not.toHaveBeenCalled();
		});

		it('requires the update permission to update rows', async () => {
			const { controller, dataTables } = setup();
			const res = response();

			await controller.updateRows(
				request({ method: 'PATCH', params: { key: 'tasks' }, body: { filter, data: {} } }),
				res,
			);

			expect(res.status).toHaveBeenCalledWith(403);
			expect(dataTables.updateRows).not.toHaveBeenCalled();
		});
	});

	describe('workflows', () => {
		it('answers 202 while the run continues', async () => {
			const { controller, workflows } = setup();
			workflows.run.mockResolvedValue({ executionId: '7', status: 'running' });
			const res = response();

			await controller.runWorkflow(
				request({ method: 'POST', params: { key: 'submit' }, body: { email: 'a@b.c' } }),
				res,
			);

			expect(workflows.run).toHaveBeenCalledWith(expect.anything(), 'workflow-1', {
				email: 'a@b.c',
			});
			expect(res.status).toHaveBeenCalledWith(202);
			expect(res.json).toHaveBeenCalledWith({ executionId: '7', status: 'running' });
		});

		it('answers a poll of an unfinished run with 202', async () => {
			const { controller, workflows } = setup();
			workflows.getRun.mockResolvedValue({ executionId: '7', status: 'running' });
			const res = response();

			await controller.getRun(request({ params: { key: 'submit', executionId: '7' } }), res);

			expect(workflows.getRun).toHaveBeenCalledWith(
				expect.objectContaining({ bindingKey: 'submit' }),
				'workflow-1',
				'7',
			);
			expect(res.status).toHaveBeenCalledWith(202);
			expect(res.json).toHaveBeenCalledWith({ executionId: '7', status: 'running' });
		});

		it('answers a poll of a finished run with 200', async () => {
			const { controller, workflows } = setup();
			workflows.getRun.mockResolvedValue({ executionId: '7', status: 'success', output: [] });
			const res = response();

			await controller.getRun(request({ params: { key: 'submit', executionId: '7' } }), res);

			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith({ executionId: '7', status: 'success', output: [] });
		});

		it('passes refusals from the port to the app', async () => {
			const { controller, workflows } = setup();
			workflows.run.mockRejectedValue(
				new AppRuntimeError(409, 'workflow_not_published', 'Publish it.'),
			);
			const res = response();

			await controller.runWorkflow(request({ method: 'POST', params: { key: 'submit' } }), res);

			expect(res.status).toHaveBeenCalledWith(409);
			expect(res.json).toHaveBeenCalledWith({
				code: 'workflow_not_published',
				message: 'Publish it.',
			});
		});

		it('reports a missing resource, not a missing app, when a port cannot find something', async () => {
			const { controller, workflows } = setup();
			workflows.run.mockRejectedValue(new NotFoundError('Workflow not found'));
			const res = response();

			await controller.runWorkflow(request({ method: 'POST', params: { key: 'submit' } }), res);

			expect(res.status).toHaveBeenCalledWith(404);
			expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'resource_missing' }));
		});

		it('hides unexpected errors', async () => {
			const { controller, workflows } = setup();
			workflows.run.mockRejectedValue(new Error('database password is hunter2'));
			const res = response();

			await controller.runWorkflow(request({ method: 'POST', params: { key: 'submit' } }), res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({
				code: 'execution_failed',
				message: 'The request failed.',
			});
		});
	});

	describe('agents', () => {
		const sessionId = '0190a8d6-4a2e-4000-8000-000000000001';

		it('streams the turn as server-sent events', async () => {
			const { controller, agents } = setup();
			async function* events(): AsyncGenerator<AgentSseEvent> {
				yield { type: 'text-delta', id: '1', delta: 'Hi' };
				yield { type: 'done', sessionId };
			}
			agents.chat.mockResolvedValue({ events: events() });
			const res = response();

			await controller.chat(
				request({
					method: 'POST',
					params: { key: 'support' },
					body: { message: 'Hello', sessionId },
				}),
				res,
			);

			expect(res.set).toHaveBeenCalledWith(
				expect.objectContaining({ 'Content-Type': 'text/event-stream; charset=UTF-8' }),
			);
			expect(res.write).toHaveBeenCalledWith(
				`data: ${JSON.stringify({ type: 'text-delta', id: '1', delta: 'Hi' })}\n\n`,
			);
			expect(res.end).toHaveBeenCalled();
		});

		it('answers a refusal as JSON before the stream opens', async () => {
			const { controller, agents } = setup();
			const res = response();

			await controller.chat(
				request({ method: 'POST', params: { key: 'support' }, body: { message: '', sessionId } }),
				res,
			);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.flushHeaders).not.toHaveBeenCalled();
			expect(agents.chat).not.toHaveBeenCalled();
		});

		it('streams a resumed turn', async () => {
			const { controller, agents } = setup();
			async function* events(): AsyncGenerator<AgentSseEvent> {
				yield { type: 'done', sessionId };
			}
			agents.resume.mockResolvedValue({ events: events() });
			const res = response();
			const body = { sessionId, runId: 'r1', toolCallId: 't1', resumeData: { approved: true } };

			await controller.resume(request({ method: 'POST', params: { key: 'support' }, body }), res);

			expect(agents.resume).toHaveBeenCalledWith(
				expect.objectContaining({ bindingKey: 'support' }),
				'agent-1',
				expect.objectContaining({ runId: 'r1', toolCallId: 't1' }),
				expect.any(AbortSignal),
			);
			expect(res.write).toHaveBeenCalledWith(
				`data: ${JSON.stringify({ type: 'done', sessionId })}\n\n`,
			);
			expect(res.end).toHaveBeenCalled();
		});

		it('refuses an invalid resume request before the stream opens', async () => {
			const { controller, agents } = setup();
			const res = response();

			await controller.resume(
				request({ method: 'POST', params: { key: 'support' }, body: { sessionId } }),
				res,
			);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.flushHeaders).not.toHaveBeenCalled();
			expect(agents.resume).not.toHaveBeenCalled();
		});

		it('requires the history permission to read messages', async () => {
			const { controller, agents } = setup();
			const res = response();

			await controller.messages(request({ params: { key: 'support' }, query: { sessionId } }), res);

			expect(res.status).toHaveBeenCalledWith(403);
			expect(agents.messages).not.toHaveBeenCalled();
		});
	});
});
