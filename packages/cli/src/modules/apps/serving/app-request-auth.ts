import type { AppVersionSnapshot } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { Request } from 'express';

import type { App } from '../app.entity';
import { AppRepository } from '../app.repository';
import { AppVersionRepository } from '../app-version.repository';
import { AppTokenService, bearerToken, type AppAccessPayload } from './app-token.service';
import { ViewerService, type Viewer } from './viewer.service';

export type AuthorizedAppRequest = {
	app: App;
	viewer: Viewer | null;
	payload: AppAccessPayload;
	pages: AppVersionSnapshot['pages'];
	components: string | null;
};

export type RejectedAppRequest = { status: 401 | 404; error: string };

/**
 * The credential check every endpoint a served page calls back to shares:
 * the access token in the `Authorization` header is the only credential, it
 * must belong to the App named in the URL, and an `n8n` App needs a viewer.
 */
@Service()
export class AppRequestAuth {
	constructor(
		private readonly appTokenService: AppTokenService,
		private readonly appRepository: AppRepository,
		private readonly appVersionRepository: AppVersionRepository,
		private readonly viewerService: ViewerService,
	) {}

	async authorize(
		req: Request,
		namespace: string,
	): Promise<AuthorizedAppRequest | RejectedAppRequest> {
		const token = bearerToken(req);
		const payload = token === undefined ? null : this.appTokenService.verifyAccess(token);
		const app = payload ? await this.appRepository.findByNamespace(namespace) : null;
		if (!app || !payload || app.id !== payload.appId) {
			return { status: 401, error: 'Invalid access token' };
		}

		const viewer = await this.viewerService.fromToken(payload);
		if (app.auth === 'n8n' && !viewer) return { status: 401, error: 'Sign in required' };

		const version = app.activeVersionId
			? await this.appVersionRepository.findSnapshot(app.activeVersionId)
			: null;
		if (!version) return { status: 404, error: 'This app has no published version' };

		const { pages, components } = version.snapshot;
		return { app, viewer, payload, pages, components };
	}
}
