import type { AgentSseEvent, AppBinding } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
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
import type { AppHostService } from '../../serving/app-host.service';
import { AppRuntimeController, type AppRuntimeRequest } from '../app-runtime.controller';

const ORIGIN = 'https://crm.apps.example.com';

const bindings: AppBinding[] = [
	{ key: 'tasks', kind: 'dataTable', dataTableId: 'table-1', permissions: ['read'] },
	{ key: 'submit', kind: 'workflow', workflowId: 'workflow-1' },
	{ key: 'support', kind: 'agent', agentId: 'agent-1', permissions: ['chat'] },
];

const app = {
	id: 'app-1',
	namespace: 'crm',
	projectId: 'project-1',
	visibility: 'project',
	bindings,
} as App;

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
				: { app, user, visitor: { type: 'user', userId: 'user-1' } },
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

function setup() {
	const auth = mock<AppAuthService>();
	auth.admit.mockResolvedValue({ ok: true, app, security: { subject: user } as never });
	auth.anonymousVisitorId.mockReturnValue('visitor-1');
	const hosts = mock<AppHostService>();
	hosts.namespace.mockReturnValue('crm');
	hosts.origin.mockReturnValue(ORIGIN);
	const dataTables = mock<AppDataTablePort>();
	const workflows = mock<AppWorkflowPort>();
	const agents = mock<AppAgentPort>();
	const controller = new AppRuntimeController(
		auth,
		hosts,
		dataTables,
		workflows,
		agents,
		mock<Logger>(),
	);
	return { controller, auth, dataTables, workflows, agents };
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

		it('requires the history permission to read messages', async () => {
			const { controller, agents } = setup();
			const res = response();

			await controller.messages(request({ params: { key: 'support' }, query: { sessionId } }), res);

			expect(res.status).toHaveBeenCalledWith(403);
			expect(agents.messages).not.toHaveBeenCalled();
		});
	});
});
