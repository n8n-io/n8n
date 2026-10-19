import {
	scimAuthFailureSchema,
	scimDeprovisioningPolicySchema,
	type ScimAuthFailure,
	type ScimDeprovisioningPolicy,
} from '@n8n/api-types';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { CacheService } from '@n8n/backend-services';

const ENABLED_KEY = 'scim.provisioning.enabled';
const LAST_AUTH_FAILURE_KEY = 'scim.provisioning.lastAuthFailure';
const DEPROVISIONING_POLICY_KEY = 'scim.provisioning.deprovisioningPolicy';

/**
 * The policy while none is stored. `disable` keeps the work of the user and
 * keeps the behaviour of instances that never saved a policy. Without a
 * transfer project, a deletion sends the work to the personal project of the
 * owner.
 */
export const DEFAULT_SCIM_DEPROVISIONING_POLICY: Readonly<ScimDeprovisioningPolicy> = {
	onDelete: 'disable',
	dataAction: 'transfer',
	transferProjectId: null,
};

/**
 * Persists instance-wide SCIM settings. Provisioning is disabled by
 * default; while disabled, all /scim/v2 endpoints reject requests but the
 * stored token is kept.
 */
@Service()
export class ScimSettingsService {
	constructor(
		private readonly settingsRepository: SettingsRepository,
		private readonly cacheService: CacheService,
	) {}

	async isEnabled(): Promise<boolean> {
		const cached = await this.cacheService.get<string>(ENABLED_KEY);
		if (cached !== undefined) return cached === 'true';

		const row = await this.settingsRepository.findByKey(ENABLED_KEY);
		const enabled = row?.value === 'true';

		await this.cacheService.set(ENABLED_KEY, enabled.toString());

		return enabled;
	}

	async setEnabled(enabled: boolean): Promise<void> {
		await this.settingsRepository.upsert(
			{ key: ENABLED_KEY, value: enabled.toString(), loadOnStartup: true },
			['key'],
		);

		await this.cacheService.set(ENABLED_KEY, enabled.toString());
	}

	/** The last SCIM request that failed the bearer check, or null. */
	async getLastAuthFailure(): Promise<ScimAuthFailure | null> {
		const row = await this.settingsRepository.findByKey(LAST_AUTH_FAILURE_KEY);
		if (!row) return null;

		// A value that does not parse is treated as no failure, so that it
		// cannot break the settings page.
		const parsed = scimAuthFailureSchema.safeParse(
			jsonParse<unknown>(row.value, { fallbackValue: null }),
		);
		return parsed.success ? parsed.data : null;
	}

	async setLastAuthFailure(failure: ScimAuthFailure): Promise<void> {
		await this.settingsRepository.upsert(
			{ key: LAST_AUTH_FAILURE_KEY, value: JSON.stringify(failure), loadOnStartup: false },
			['key'],
		);
	}

	async clearLastAuthFailure(): Promise<void> {
		await this.settingsRepository.delete({ key: LAST_AUTH_FAILURE_KEY });
	}

	/** What SCIM DELETE does. The default applies while no policy is stored. */
	async getDeprovisioningPolicy(): Promise<ScimDeprovisioningPolicy> {
		const row = await this.settingsRepository.findByKey(DEPROVISIONING_POLICY_KEY);
		if (!row) return { ...DEFAULT_SCIM_DEPROVISIONING_POLICY };

		// A value that does not parse falls back to the default, which keeps
		// the work of the user.
		const parsed = scimDeprovisioningPolicySchema.safeParse(
			jsonParse<unknown>(row.value, { fallbackValue: null }),
		);
		return parsed.success ? parsed.data : { ...DEFAULT_SCIM_DEPROVISIONING_POLICY };
	}

	/** All fields of the policy are in one row, so that a save never stores a part of them. */
	async setDeprovisioningPolicy(policy: ScimDeprovisioningPolicy): Promise<void> {
		await this.settingsRepository.upsert(
			{ key: DEPROVISIONING_POLICY_KEY, value: JSON.stringify(policy), loadOnStartup: false },
			['key'],
		);
	}
}
