import { SCIM_OPT_IN_FLAG } from '@n8n/api-types';
import type { ScimOptInSource } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { NextFunction, Request, Response } from 'express';

import { PostHogClient } from '@/posthog';

import { ScimConfig } from './scim.config';

export interface ScimOptIn {
	available: boolean;
	source: ScimOptInSource | null;
}

/** Same as the PostHog flag cache, so a refresh can see each new flag value. */
export const SCIM_OPT_IN_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Pre-GA opt-in for SCIM. The `feat:scim` license flag activates the module,
 * and this opt-in decides if its routes answer. IAM-1565 removes it at GA.
 *
 * The routes need one value for the whole instance, so this evaluates the
 * PostHog flag for the instance, not for a user. `PostHogClient` applies
 * `N8N_FEATURE_FLAG_OVERRIDES`, also when PostHog is not available (for
 * example, with diagnostics off).
 */
@Service()
export class ScimOptInService {
	private refreshTimer?: NodeJS.Timeout;

	/**
	 * The last flag result. `PostHogClient` does not cache an empty result,
	 * for example when PostHog cannot be reached or does not know the flag.
	 * Without this cache, each SCIM request of a full sync would wait for its
	 * own PostHog call.
	 */
	private flagResult?: { optIn: ScimOptIn; expiresAt: number };

	/** The flag evaluation in progress, so that parallel requests share one call. */
	private flagEvaluation?: Promise<ScimOptIn>;

	constructor(
		private readonly logger: Logger,
		private readonly scimConfig: ScimConfig,
		private readonly postHogClient: PostHogClient,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	async evaluate(): Promise<ScimOptIn> {
		if (this.scimConfig.optIn) return { available: true, source: 'config' };

		if (this.flagResult && this.flagResult.expiresAt > Date.now()) return this.flagResult.optIn;

		this.flagEvaluation ??= this.evaluateFlag().finally(() => {
			this.flagEvaluation = undefined;
		});

		return await this.flagEvaluation;
	}

	/** A failure counts as off, and it is kept for the same time as a result. */
	private async evaluateFlag(): Promise<ScimOptIn> {
		let flagOn = false;
		try {
			flagOn = (await this.postHogClient.getFeatureFlagForInstance(SCIM_OPT_IN_FLAG)) === true;
		} catch (error) {
			this.logger.warn('SCIM: Failed to evaluate the opt-in flag', { error });
		}

		const optIn: ScimOptIn = flagOn
			? { available: true, source: 'flag' }
			: { available: false, source: null };
		this.flagResult = { optIn, expiresAt: Date.now() + SCIM_OPT_IN_REFRESH_INTERVAL_MS };

		return optIn;
	}

	/**
	 * Answers 404 while the opt-in is off, so the SCIM routes look unknown.
	 * Put it before authentication: before the token check on the `/scim/v2`
	 * routes and before the session and scope checks on `/rest/scim`, so that
	 * no client can tell that the routes exist.
	 *
	 * Rollback effect: when the opt-in turns off for an instance that already
	 * provisions users, the identity provider gets 404 and provisioning stops.
	 * GA (IAM-1565) decides the ramp-down rule.
	 */
	async gate(_req: Request, res: Response, next: NextFunction) {
		if ((await this.evaluate()).available) return next();

		res.status(404).send('Not found');
	}

	/**
	 * `/rest/module-settings` serves a snapshot that the module makes at
	 * startup. The PostHog flag can change at any time, so make the snapshot
	 * again at the flag cache interval. The refresh evaluates the flag again,
	 * so the routes and the snapshot use the same value. The config switch
	 * changes only with a restart, so it needs no refresh.
	 */
	startSettingsRefresh() {
		if (this.scimConfig.optIn || this.refreshTimer) return;

		this.refreshTimer = setInterval(() => {
			void this.refreshSettings();
		}, SCIM_OPT_IN_REFRESH_INTERVAL_MS);
		// The refresh must not keep the process alive.
		this.refreshTimer.unref();
	}

	/** Evaluates the flag again and makes the module settings again with the new value. */
	async refreshSettings() {
		this.flagResult = undefined;
		try {
			await this.moduleRegistry.refreshModuleSettings('scim');
		} catch (error) {
			this.logger.warn('SCIM: Failed to refresh the module settings', { error });
		}
	}

	@OnShutdown()
	stopSettingsRefresh() {
		clearInterval(this.refreshTimer);
		this.refreshTimer = undefined;
	}
}
