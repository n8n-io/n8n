import { PaginationDto, type WorkflowPortalResponse } from '@n8n/api-types';
import { UrlService } from '@n8n/backend-services';
import { Time } from '@n8n/constants';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { AuthError, BadRequestError } from '@n8n/errors';
import { isRecord } from '@n8n/utils/is-record';
import type { CookieOptions, Request, Response } from 'express';
import { jsonParse } from 'n8n-workflow';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { OAuthTokenVerifierProxy } from '@/services/oauth-token-verifier-proxy.service';
import { OAuth2FlowProxy } from '@/services/oauth2-flow-proxy.service';
import { WorkflowService } from '@/workflows/workflow.service';

import { WorkflowPortalConfig } from './workflow-portal.config';
import { WORKFLOW_PORTAL_COOKIE, WORKFLOW_PORTAL_STATE_COOKIE } from './workflow-portal.constants';

@Service()
export class WorkflowPortalService {
	readonly assetsDir = resolve(__dirname, 'assets');

	constructor(
		private readonly config: WorkflowPortalConfig,
		private readonly oauthFlow: OAuth2FlowProxy,
		private readonly tokenVerifier: OAuthTokenVerifierProxy,
		private readonly workflowService: WorkflowService,
		private readonly urlService: UrlService,
	) {}

	async getDisplayName(): Promise<string> {
		const messages = jsonParse<Record<string, string>>(
			await readFile(resolve(this.assetsDir, 'messages.json'), 'utf8'),
		);
		return messages['workflowPortal.name'];
	}

	async getIndexHtml() {
		return await readFile(resolve(this.assetsDir, 'index.html'), 'utf8');
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

	async beginLogin(res: Response) {
		const authorizeUrl = await this.oauthFlow.begin(this.config.callbackUrl);
		res.cookie(WORKFLOW_PORTAL_STATE_COOKIE, new URL(authorizeUrl).searchParams.get('state'), {
			...this.cookieOptions,
			maxAge: 5 * Time.minutes.toMilliseconds,
		});
		return authorizeUrl;
	}

	async completeLogin(req: Request, res: Response) {
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
	}

	async getAuthenticatedUser(req: Request): Promise<User | null> {
		const token = this.readCookie(req, WORKFLOW_PORTAL_COOKIE);
		if (!token) return null;
		const { user } = await this.tokenVerifier.verifyOAuthAccessToken(
			token,
			this.config.callbackUrl,
		);
		return user && !user.disabled ? user : null;
	}

	clearCookie(res: Response) {
		res.clearCookie(WORKFLOW_PORTAL_COOKIE, this.cookieOptions);
	}

	async listWorkflows(user: User, requestQuery: Request['query']): Promise<WorkflowPortalResponse> {
		const query = PaginationDto.safeParse({ take: '50', ...requestQuery });
		if (!query.success || query.data.take < 1) {
			throw new BadRequestError('Use a non-negative skip and a positive take.');
		}
		const { workflows, count } = await this.workflowService.getMany(user, {
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
