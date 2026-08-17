import { Service } from '@n8n/di';
import type { Request } from 'express';
import { ExecutionContextService } from 'n8n-core';
import type { IExecutionContext } from 'n8n-workflow';

import { AuthService } from '@/auth/auth.service';

/**
 * Builds the execution context for work the editor asks the server to do on the
 * requesting user's behalf without running a workflow — loading a resource locator
 * list, a `loadOptions` dropdown, resource-mapper fields, an action handler.
 *
 * Those paths run in mode `internal`, which skips dynamic credential resolution
 * unless an execution context carries a credential context. Without one, an
 * end-user credential falls back to static data that holds no per-user token and
 * the dropdown fails — even though the user has connected the credential.
 */
@Service()
export class DesignTimeExecutionContextService {
	constructor(
		private readonly authService: AuthService,
		private readonly executionContextService: ExecutionContextService,
	) {}

	/**
	 * Seals the requesting user's own identity into an execution context, so
	 * design-time listings resolve against the connection they already made.
	 *
	 * Returns `undefined` for callers without an auth cookie (API keys, for
	 * instance), which keeps them on the existing static-data behaviour rather
	 * than failing them.
	 */
	async buildFor(req: Request): Promise<IExecutionContext | undefined> {
		const authCookie = this.authService.getCookieToken(req);
		if (authCookie === undefined) return undefined;

		// Request-bound rather than `manual-execution`: the browser id, method and
		// endpoint re-checked at resolution time are the same ones this request already
		// authenticated with, so the check cannot newly fail while keeping the cookie
		// usable only for the request it came in on.
		const credentials = await this.executionContextService.buildRequestBoundCredentials(
			authCookie,
			{
				method: this.authService.getMethod(req),
				endpoint: this.authService.getEndpoint(req),
				browserId: this.authService.getBrowserId(req),
			},
		);

		return {
			version: 1,
			establishedAt: Date.now(),
			source: 'internal',
			credentials,
		};
	}
}
