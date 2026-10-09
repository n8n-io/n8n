import { PaginationDto, type WorkflowPortalResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { UrlService } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import { Service } from '@n8n/di';
import { AuthError, BadRequestError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import cookieParser from 'cookie-parser';
import express, {
	type CookieOptions,
	type NextFunction,
	type Request,
	type Response,
} from 'express';
import helmet from 'helmet';
import { jsonParse } from 'n8n-workflow';
import { access, readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { resolve } from 'node:path';

import { send } from '@/response-helper';
import { OAuthTokenVerifierProxy } from '@/services/oauth-token-verifier-proxy.service';
import { OAuth2FlowProxy } from '@/services/oauth2-flow-proxy.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { WorkflowPortalConfig } from './workflow-portal.config';
import {
	WORKFLOW_PORTAL_CALLBACK_PATH,
	WORKFLOW_PORTAL_COOKIE,
	WORKFLOW_PORTAL_PATH,
	WORKFLOW_PORTAL_STATE_COOKIE,
} from './workflow-portal.constants';

@Service()
export class WorkflowPortalServer {
	private server?: Server;

	private readonly assetsDir = resolve(__dirname, 'assets');

	constructor(
		private readonly config: WorkflowPortalConfig,
		private readonly oauthFlow: OAuth2FlowProxy,
		private readonly tokenVerifier: OAuthTokenVerifierProxy,
		private readonly workflowService: WorkflowService,
		private readonly urlService: UrlService,
		private readonly logger: Logger,
	) {}

	async getDisplayName(): Promise<string> {
		const messages = jsonParse<Record<string, string>>(
			await readFile(resolve(this.assetsDir, 'messages.json'), 'utf8'),
		);
		return messages['workflowPortal.name'];
	}

	async start() {
		await access(resolve(this.assetsDir, 'index.html'));
		const app = express();
		app.disable('x-powered-by');
		app.use((req, res, next) => {
			res.setHeader('Cache-Control', 'private, no-store');
			if (!this.config.isPortalHost(req.headers.host)) {
				res.status(404).end();
				return;
			}
			next();
		});
		app.use(
			helmet({
				strictTransportSecurity: false,
				contentSecurityPolicy: {
					directives: {
						defaultSrc: ["'none'"],
						scriptSrc: ["'self'"],
						connectSrc: ["'self'"],
						frameAncestors: ["'none'"],
						upgradeInsecureRequests: null,
					},
				},
			}),
			cookieParser(),
		);

		app.get(`${WORKFLOW_PORTAL_PATH}/login`, send(this.login.bind(this)));
		app.get(WORKFLOW_PORTAL_CALLBACK_PATH, send(this.handleCallback.bind(this)));
		app.get('/', this.authenticate(true), (_req, res) => {
			res.sendFile(resolve(this.assetsDir, 'index.html'), { cacheControl: false });
		});
		app.get(
			`${WORKFLOW_PORTAL_PATH}/workflows`,
			this.authenticate(false),
			send(this.listWorkflows.bind(this), true),
		);
		app.use(
			`${WORKFLOW_PORTAL_PATH}/assets`,
			this.authenticate(false),
			express.static(this.assetsDir, { index: false, cacheControl: false, dotfiles: 'deny' }),
		);
		app.use((_req, res) => {
			res.status(404).end();
		});

		const server = createServer(app);
		this.server = server;
		await new Promise<void>((done, reject) => {
			server.once('error', reject);
			server.listen(this.config.port, this.config.listenAddress, () => {
				server.off('error', reject);
				done();
			});
		});
		server.on('error', (error) => this.logger.error('Workflow portal server error', { error }));
		this.logger.info(`Workflow portal: ${this.config.baseUrl} (internal port ${this.config.port})`);
	}

	async stop() {
		if (!this.server) return;
		const server = this.server;
		await new Promise<void>((done, reject) => {
			server.close((error) => (error ? reject(error) : done()));
		});
		this.server = undefined;
	}

	private get cookieOptions(): CookieOptions {
		return {
			httpOnly: true,
			secure: this.config.baseUrl.startsWith('https:'),
			sameSite: 'lax',
			path: '/',
		};
	}

	private readCookie(req: Request, name: string): string | undefined {
		const cookies: unknown = req.cookies;
		return isRecord(cookies) && typeof cookies[name] === 'string' ? cookies[name] : undefined;
	}

	private async login(_req: Request, res: Response) {
		const authorizeUrl = await this.oauthFlow.begin(this.config.callbackUrl);
		res.cookie(WORKFLOW_PORTAL_STATE_COOKIE, new URL(authorizeUrl).searchParams.get('state'), {
			...this.cookieOptions,
			maxAge: 5 * Time.minutes.toMilliseconds,
		});
		res.redirect(authorizeUrl);
	}

	private async handleCallback(req: Request, res: Response) {
		const { code, state, iss } = req.query;
		const expectedState = this.readCookie(req, WORKFLOW_PORTAL_STATE_COOKIE);
		res.clearCookie(WORKFLOW_PORTAL_STATE_COOKIE, this.cookieOptions);
		if (
			typeof code !== 'string' ||
			typeof state !== 'string' ||
			!expectedState ||
			state !== expectedState ||
			iss !== this.urlService.getInstanceBaseUrl()
		) {
			throw new AuthError('Sign-in failed. Open the app again to sign in.');
		}
		const result = await this.oauthFlow.complete(code, state);
		if (!result.valid) throw new AuthError('Sign-in failed. Open the app again to sign in.');
		res.cookie(WORKFLOW_PORTAL_COOKIE, result.token, {
			...this.cookieOptions,
			maxAge: result.expiresIn * Time.seconds.toMilliseconds,
		});
		res.redirect('/');
	}

	private authenticate(redirectToLogin: boolean) {
		return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
			const token = this.readCookie(req, WORKFLOW_PORTAL_COOKIE);
			if (token) {
				const { user } = await this.tokenVerifier.verifyOAuthAccessToken(
					token,
					this.config.callbackUrl,
				);
				if (user && !user.disabled) {
					req.user = user;
					next();
					return;
				}
			}
			res.clearCookie(WORKFLOW_PORTAL_COOKIE, this.cookieOptions);
			if (redirectToLogin) res.redirect(`${WORKFLOW_PORTAL_PATH}/login`);
			else res.status(401).json({ message: 'Unauthorized' });
		};
	}

	private async listWorkflows(req: AuthenticatedRequest): Promise<WorkflowPortalResponse> {
		const query = PaginationDto.safeParse({ take: '50', ...req.query });
		if (!query.success || query.data.take < 1) {
			throw new BadRequestError('Use a non-negative skip and a positive take.');
		}
		const { workflows, count } = await this.workflowService.getMany(req.user, {
			...query.data,
			sortBy: 'name:asc',
			select: { name: true, activeVersionId: true, updatedAt: true },
		});
		return {
			count,
			data: workflows.map((workflow) => ({
				id: workflow.id,
				name: workflow.name ?? workflow.id,
				published: 'activeVersionId' in workflow && !!workflow.activeVersionId,
				updatedAt: workflow.updatedAt?.toISOString() ?? null,
			})),
		};
	}
}
