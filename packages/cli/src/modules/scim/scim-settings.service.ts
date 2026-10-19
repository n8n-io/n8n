import {
	scimAuthFailureSchema,
	scimDeprovisioningPolicySchema,
	type ScimAuthFailure,
	type ScimDeprovisioningPolicy,
} from '@n8n/api-types';
import { SettingsRepository, TransactionRunner, type OperationContext } from '@n8n/db';
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

export interface ScimSettingsChange {
	enabled?: boolean;
	/** A field that the change does not set keeps its stored value. */
	policy?: Partial<ScimDeprovisioningPolicy>;
}

export interface ScimSettingsChangeResult {
	/** The switch before the change. */
	wasEnabled: boolean;
	enabled: boolean;
	policy: ScimDeprovisioningPolicy;
}

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
		private readonly transactionRunner: TransactionRunner,
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
		return parseDeprovisioningPolicy(row?.value);
	}

	/**
	 * Saves the switch and the policy in one transaction, so that a request
	 * never saves only a part of its change. All fields of the policy are in
	 * one row. That row stays locked from the read to the write, so that two
	 * changes at the same time cannot lose a field.
	 */
	async update({ enabled, policy = {} }: ScimSettingsChange): Promise<ScimSettingsChangeResult> {
		const result = await this.transactionRunner.run({}, async (ctx) => {
			const savedPolicy = await this.mergeDeprovisioningPolicy(policy, ctx);

			const enabledRow = await this.settingsRepository.findByKeyInContext(ENABLED_KEY, ctx);
			const wasEnabled = enabledRow?.value === 'true';
			if (enabled !== undefined) {
				await this.settingsRepository.upsertByKey(ENABLED_KEY, enabled.toString(), true, ctx);
			}

			return { wasEnabled, enabled: enabled ?? wasEnabled, policy: savedPolicy };
		});

		// After the commit, so that the cache never holds a value that is not saved.
		if (enabled !== undefined) await this.cacheService.set(ENABLED_KEY, enabled.toString());

		return result;
	}

	private async mergeDeprovisioningPolicy(
		{ onDelete, dataAction, transferProjectId }: Partial<ScimDeprovisioningPolicy>,
		ctx: OperationContext,
	): Promise<ScimDeprovisioningPolicy> {
		if (onDelete === undefined && dataAction === undefined && transferProjectId === undefined) {
			const row = await this.settingsRepository.findByKeyInContext(DEPROVISIONING_POLICY_KEY, ctx);
			return parseDeprovisioningPolicy(row?.value);
		}

		const row = await this.settingsRepository.getOrCreateWithWriteLock(
			DEPROVISIONING_POLICY_KEY,
			JSON.stringify(DEFAULT_SCIM_DEPROVISIONING_POLICY),
			false,
			ctx,
		);
		const current = parseDeprovisioningPolicy(row.value);
		const merged: ScimDeprovisioningPolicy = {
			onDelete: onDelete ?? current.onDelete,
			dataAction: dataAction ?? current.dataAction,
			// `null` clears the target, so only `undefined` keeps it.
			transferProjectId:
				transferProjectId === undefined ? current.transferProjectId : transferProjectId,
		};

		await this.settingsRepository.upsertByKey(
			DEPROVISIONING_POLICY_KEY,
			JSON.stringify(merged),
			false,
			ctx,
		);

		return merged;
	}
}

/**
 * A missing value, or a value that does not parse, gives the default, which
 * keeps the work of the user.
 */
function parseDeprovisioningPolicy(value: string | undefined): ScimDeprovisioningPolicy {
	if (value === undefined) return { ...DEFAULT_SCIM_DEPROVISIONING_POLICY };

	const parsed = scimDeprovisioningPolicySchema.safeParse(
		jsonParse<unknown>(value, { fallbackValue: null }),
	);
	return parsed.success ? parsed.data : { ...DEFAULT_SCIM_DEPROVISIONING_POLICY };
}
