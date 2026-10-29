import {
	APP_RUNTIME_REQUEST_HEADER,
	appAgentChatRequestSchema,
	appAgentMessagesQuerySchema,
	appAgentResumeRequestSchema,
	appRuntimeDeleteRowsSchema,
	appRuntimeInsertRowsSchema,
	appRuntimeUpdateRowsSchema,
	ListDataTableContentQueryDto,
	type AgentSseEvent,
	type AppAgentPermission,
	type AppBinding,
	type AppBindingKind,
	type AppDataTablePermission,
	type AppRuntimeMeResponse,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import {
	createIpRateLimit,
	Get,
	Middleware,
	Patch,
	Post,
	RootLevelController,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import type { Principal } from '@n8n/permissions';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import cookieParser from 'cookie-parser';
import express, {
	type NextFunction,
	type Request,
	type RequestHandler,
	type Response,
} from 'express';
import type { z } from 'zod';

import { AppsConfig } from '../apps.config';
import type { App } from '../app.entity';
import { AppAuthService } from '../auth/app-auth.service';
import {
	AppAgentPort,
	AppDataTablePort,
	AppWorkflowPort,
	type AppAgentTurn,
	type AppCallContext,
	type AppVisitor,
} from '../bindings/app-binding-ports';
import { toRuntimeBinding } from '../bindings/app-bindings.service';
import { AppRuntimeError } from '../bindings/app-runtime.error';
import { AppHostService } from '../serving/app-host.service';

export const APP_RUNTIME_MAX_BODY_BYTES = 1024 * 1024;
const SSE_HEARTBEAT_INTERVAL_MS = 30_000;
const VISITOR_ERROR_MESSAGE = 'The agent could not answer.';

const parseCookies = cookieParser();
const parseJson = express.json({ limit: APP_RUNTIME_MAX_BODY_BYTES });
const ipRateLimit = createIpRateLimit(Container.get(AppsConfig).rateLimitApi, 60_000);
const routeOptions = { skipAuth: true, ipRateLimit } as const;

interface AppRuntimeContext {
	app: App;
	visitor: AppVisitor;
	user?: Principal;
}

export interface AppRuntimeRequest<P = Record<string, string>> extends Request<P> {
	appRuntime?: AppRuntimeContext;
}

type KeyRequest = AppRuntimeRequest<{ key: string }>;
type RunRequest = AppRuntimeRequest<{ key: string; executionId: string }>;

async function run(handler: RequestHandler, req: Request, res: Response) {
	await new Promise<void>((resolve, reject) => {
		void handler(req, res, (error?: unknown) => (error ? reject(ensureError(error)) : resolve()));
	});
}

function parse<T>(
	schema: { safeParse(value: unknown): z.SafeParseReturnType<unknown, T> },
	value: unknown,
	message: string,
): T {
	const parsed = schema.safeParse(value);
	if (!parsed.success) throw AppRuntimeError.invalidInput(message, parsed.error);
	return parsed.data;
}

function hasType(error: unknown, type: string) {
	return typeof error === 'object' && error !== null && 'type' in error && error.type === type;
}

/**
 * The API that app frontends call through `@n8n/app-sdk`. It is served only on
 * app hosts. The stored bindings of the app are the only source of authority:
 * a request names a binding key, never a resource ID.
 */
@RootLevelController('/_n8n/api/v1', { surface: 'apps' })
export class AppRuntimeController {
	constructor(
		private readonly auth: AppAuthService,
		private readonly hosts: AppHostService,
		private readonly dataTables: AppDataTablePort,
		private readonly workflows: AppWorkflowPort,
		private readonly agents: AppAgentPort,
		private readonly logger: Logger,
	) {}

	/** App hosts bypass the main server middleware, so this parses cookies and bodies itself. */
	@Middleware()
	async prepare(req: AppRuntimeRequest, res: Response, next: NextFunction) {
		try {
			res.set('Cache-Control', 'no-store');
			this.assertSameOriginRequest(req);
			await run(parseCookies, req, res);
			const admission = await this.admit(req);
			if (!admission.ok) {
				throw admission.reason === 'insufficient_scope'
					? new AppRuntimeError(403, 'forbidden', "You don't have access to this app.")
					: new AppRuntimeError(401, 'unauthenticated', 'Sign in to access this app.');
			}
			await this.parseBody(req, res);
			const user = admission.security?.subject;
			req.appRuntime = {
				app: admission.app,
				user,
				visitor: user
					? { type: 'user', userId: user.id }
					: { type: 'anonymous', id: this.auth.anonymousVisitorId(req, res) },
			};
			next();
		} catch (error) {
			this.sendError(res, error);
		}
	}

	@Get('/me', routeOptions)
	async me(req: AppRuntimeRequest, res: Response) {
		await this.answer(res, () => {
			const { app, user } = this.context(req);
			const body: AppRuntimeMeResponse = {
				user: user
					? {
							id: user.id,
							email: user.email ?? null,
							firstName: user.firstName ?? null,
							lastName: user.lastName ?? null,
						}
					: null,
				visibility: app.visibility,
			};
			return body;
		});
	}

	@Get('/bindings', routeOptions)
	async bindings(req: AppRuntimeRequest, res: Response) {
		await this.answer(res, () => this.context(req).app.bindings.map(toRuntimeBinding));
	}

	@Get('/tables/:key/rows', routeOptions)
	async listRows(req: KeyRequest, res: Response) {
		await this.answer(res, async () => {
			const { ctx, binding } = this.resolve(req, 'dataTable', 'read');
			const query = parse(ListDataTableContentQueryDto, req.query, 'The query is invalid.');
			return await this.dataTables.listRows(ctx, binding.dataTableId, query);
		});
	}

	@Post('/tables/:key/rows', routeOptions)
	async insertRows(req: KeyRequest, res: Response) {
		await this.answer(
			res,
			async () => {
				const { ctx, binding } = this.resolve(req, 'dataTable', 'insert');
				const { data } = parse(appRuntimeInsertRowsSchema, req.body, 'The rows are invalid.');
				return { data: await this.dataTables.insertRows(ctx, binding.dataTableId, data) };
			},
			201,
		);
	}

	@Patch('/tables/:key/rows', routeOptions)
	async updateRows(req: KeyRequest, res: Response) {
		await this.answer(res, async () => {
			const { ctx, binding } = this.resolve(req, 'dataTable', 'update');
			const { filter, data } = parse(
				appRuntimeUpdateRowsSchema,
				req.body,
				'The update is invalid.',
			);
			return { data: await this.dataTables.updateRows(ctx, binding.dataTableId, filter, data) };
		});
	}

	@Post('/tables/:key/rows/delete', routeOptions)
	async deleteRows(req: KeyRequest, res: Response) {
		await this.answer(res, async () => {
			const { ctx, binding } = this.resolve(req, 'dataTable', 'delete');
			const { filter } = parse(appRuntimeDeleteRowsSchema, req.body, 'The filter is invalid.');
			return { data: await this.dataTables.deleteRows(ctx, binding.dataTableId, filter) };
		});
	}

	@Post('/workflows/:key/run', routeOptions)
	async runWorkflow(req: KeyRequest, res: Response) {
		await this.answer(res, async () => {
			const { ctx, binding } = this.resolve(req, 'workflow');
			const result = await this.workflows.run(ctx, binding.workflowId, req.body ?? {});
			if (result.status === 'running') res.status(202);
			return result;
		});
	}

	@Get('/workflows/:key/runs/:executionId', routeOptions)
	async getRun(req: RunRequest, res: Response) {
		await this.answer(res, async () => {
			const { ctx, binding } = this.resolve(req, 'workflow');
			const result = await this.workflows.getRun(ctx, binding.workflowId, req.params.executionId);
			if (result.status === 'running') res.status(202);
			return result;
		});
	}

	@Post('/agents/:key/chat', routeOptions)
	async chat(req: KeyRequest, res: Response) {
		await this.stream(res, async (signal) => {
			const { ctx, binding } = this.resolve(req, 'agent', 'chat');
			const body = parse(appAgentChatRequestSchema, req.body, 'The message is invalid.');
			return await this.agents.chat(ctx, binding.agentId, body, signal);
		});
	}

	@Post('/agents/:key/chat/resume', routeOptions)
	async resume(req: KeyRequest, res: Response) {
		await this.stream(res, async (signal) => {
			const { ctx, binding } = this.resolve(req, 'agent', 'chat');
			const body = parse(appAgentResumeRequestSchema, req.body, 'The resume request is invalid.');
			return await this.agents.resume(ctx, binding.agentId, body, signal);
		});
	}

	@Get('/agents/:key/messages', routeOptions)
	async messages(req: KeyRequest, res: Response) {
		await this.answer(res, async () => {
			const { ctx, binding } = this.resolve(req, 'agent', 'history');
			const { sessionId } = parse(appAgentMessagesQuerySchema, req.query, 'The query is invalid.');
			return await this.agents.messages(ctx, binding.agentId, sessionId);
		});
	}

	/**
	 * Other apps share the parent domain, so the browser sends this app's cookies
	 * with their cross-origin requests. The custom header forces a CORS preflight,
	 * which this API never approves.
	 */
	private assertSameOriginRequest(req: Request) {
		if (req.get(APP_RUNTIME_REQUEST_HEADER) !== '1') {
			throw new AppRuntimeError(
				403,
				'forbidden_origin',
				`Send the ${APP_RUNTIME_REQUEST_HEADER} header with every app API request.`,
			);
		}
		const fetchSite = req.get('sec-fetch-site');
		const origin = req.get('origin');
		const namespace = this.hosts.namespace(req);
		const expectedOrigin = namespace ? this.hosts.origin(namespace) : null;
		if (
			(fetchSite !== undefined && fetchSite !== 'same-origin') ||
			(origin !== undefined && origin !== expectedOrigin)
		) {
			throw new AppRuntimeError(403, 'forbidden_origin', 'Call the app API from the app itself.');
		}
		// `req.is` returns null for a request without a body, which needs no content type.
		if (
			['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) &&
			req.is('application/json') === false
		) {
			throw new AppRuntimeError(
				415,
				'unsupported_media_type',
				'Send the request body as application/json.',
			);
		}
	}

	/** Only here does a `NotFoundError` mean that the host has no published app. */
	private async admit(req: Request) {
		try {
			return await this.auth.admit(req);
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw new AppRuntimeError(404, 'app_not_found', 'App not found.');
			}
			throw error;
		}
	}

	private async parseBody(req: Request, res: Response) {
		try {
			await run(parseJson, req, res);
		} catch (error) {
			if (hasType(error, 'entity.too.large')) {
				throw new AppRuntimeError(
					413,
					'payload_too_large',
					`The request body must be at most ${APP_RUNTIME_MAX_BODY_BYTES} bytes.`,
				);
			}
			throw AppRuntimeError.invalidInput('The request body is not valid JSON.');
		}
	}

	private context(req: AppRuntimeRequest): AppRuntimeContext {
		if (!req.appRuntime)
			throw new AppRuntimeError(401, 'unauthenticated', 'Sign in to access this app.');
		return req.appRuntime;
	}

	private resolve<K extends AppBindingKind>(
		req: KeyRequest,
		kind: K,
		permission?: K extends 'dataTable'
			? AppDataTablePermission
			: K extends 'agent'
				? AppAgentPermission
				: never,
	): { ctx: AppCallContext; binding: Extract<AppBinding, { kind: K }> } {
		const { app, visitor } = this.context(req);
		const { key } = req.params;
		const binding = app.bindings.find(
			(candidate): candidate is Extract<AppBinding, { kind: K }> =>
				candidate.key === key && candidate.kind === kind,
		);
		if (!binding) {
			throw new AppRuntimeError(
				404,
				'binding_not_found',
				`The app has no ${kind} bound as "${key}".`,
			);
		}
		if (
			permission !== undefined &&
			'permissions' in binding &&
			!(binding.permissions as string[]).includes(permission)
		) {
			throw new AppRuntimeError(
				403,
				'permission_denied',
				`The binding "${key}" does not allow ${permission} access.`,
			);
		}
		return {
			binding,
			ctx: {
				appId: app.id,
				namespace: app.namespace,
				projectId: app.projectId,
				bindingKey: key,
				visitor,
			},
		};
	}

	private async answer(res: Response, call: () => unknown, status = 200) {
		try {
			const body = await call();
			if (res.statusCode === 200) res.status(status);
			res.json(body);
		} catch (error) {
			this.sendError(res, error);
		}
	}

	/** Refusals answer as JSON before the stream opens. Failures inside the run become SSE `error` events. */
	private async stream(res: Response, open: (signal: AbortSignal) => Promise<AppAgentTurn>) {
		const abortController = new AbortController();
		res.once('close', () => abortController.abort());

		let turn: AppAgentTurn;
		try {
			turn = await open(abortController.signal);
		} catch (error) {
			this.sendError(res, error);
			return;
		}

		res.status(200).set({
			'Content-Type': 'text/event-stream; charset=UTF-8',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no',
		});
		res.flushHeaders();
		const write = (chunk: string) => {
			if (!res.writableEnded && !res.destroyed) res.write(chunk);
		};
		const send = (event: AgentSseEvent) => write(`data: ${JSON.stringify(event)}\n\n`);
		write(':ok\n\n');
		const heartbeat = setInterval(() => write(':ping\n\n'), SSE_HEARTBEAT_INTERVAL_MS);
		try {
			for await (const event of turn.events) send(event);
		} catch (error) {
			this.logger.error('App agent stream failed.', { error });
			send({ type: 'error', message: VISITOR_ERROR_MESSAGE });
		} finally {
			clearInterval(heartbeat);
			res.end();
		}
	}

	private sendError(res: Response, error: unknown) {
		if (res.headersSent) {
			res.destroy();
			return;
		}
		res.set('Cache-Control', 'no-store');
		if (error instanceof AppRuntimeError) {
			res.status(error.status).json(error.toBody());
			return;
		}
		if (error instanceof NotFoundError) {
			res
				.status(404)
				.json({ code: 'resource_missing', message: 'A resource that the app uses is missing.' });
			return;
		}
		this.logger.error('App API request failed.', { error });
		res.status(500).json({ code: 'execution_failed', message: 'The request failed.' });
	}
}
