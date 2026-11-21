import {
	runtimeCredentialRuleSchema,
	type RuntimeCredentialRule,
	type RuntimeCredentialRuleWithSource,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from '@n8n/errors';
import { INodeExecutionData, ISecureArtifactsV1, jsonParse } from 'n8n-workflow';

import { extractAndClear } from './path-traversal';
import { RuntimeCredentialsConfig } from './runtime-credentials.config';
import {
	SensitiveFieldRules,
	sensitiveFieldRulesSchema,
	ValueLookupPath,
} from './runtime-credentials.schemas';

type ArtifactItem = ISecureArtifactsV1['artifacts'][string];

export type StripResult = {
	triggerItems: INodeExecutionData[];
	artifactsByAlias: Record<string, ArtifactItem>;
};

const RULES_SETTINGS_KEY = 'runtimeCredentials.rules';

const storedRulesSchema = runtimeCredentialRuleSchema.array();

@Service()
export class RuntimeCredentialsService {
	/** Rules from `N8N_SECURITY_SENSITIVE_FIELD_RULES`. They win over stored rules. */
	private envRules: SensitiveFieldRules = {};

	/** Rules an admin saved in the UI. */
	private storedRules: RuntimeCredentialRule[] = [];

	private sensitiveFieldRules: SensitiveFieldRules = {};

	constructor(
		private readonly logger: Logger,
		private readonly config: RuntimeCredentialsConfig,
		private readonly settingsRepository: SettingsRepository,
	) {}

	init() {
		const parsedSetting = jsonParse(this.config.sensitiveFieldRules, {
			errorMessage: "Failed to json parse configuration rules 'N8N_SECURITY_SENSITIVE_FIELD_RULES'",
		});
		const parsedRules = sensitiveFieldRulesSchema.safeParse(parsedSetting);
		if (!parsedRules.success) {
			this.logger.error(
				"Failed to validate configuration rules 'N8N_SECURITY_SENSITIVE_FIELD_RULES'",
				{
					error: parsedRules.error,
				},
			);
			throw new Error(
				"Failed to validate configuration rules 'N8N_SECURITY_SENSITIVE_FIELD_RULES'",
			);
		}

		this.envRules = parsedRules.data;
		this.applyRules();
	}

	/** Reads the rules saved in the UI. Call it after `init()` and whenever another process saves. */
	async loadStoredRules() {
		const row = await this.settingsRepository.findByKey(RULES_SETTINGS_KEY);
		const parsed = storedRulesSchema.safeParse(
			row ? jsonParse(row.value, { fallbackValue: [] }) : [],
		);
		if (!parsed.success) {
			// A bad row must not stop the instance. The env rules still apply.
			this.logger.warn('Ignoring invalid stored runtime credential rules', { error: parsed.error });
		}
		this.storedRules = parsed.success ? parsed.data : [];
		this.applyRules();
	}

	getRules(): RuntimeCredentialRuleWithSource[] {
		const envRules = Object.entries(this.envRules).map(([alias, rule]) => ({
			alias,
			...rule,
			source: 'env' as const,
		}));
		const storedRules = this.storedRules.map((rule) => ({ ...rule, source: 'settings' as const }));
		return [...envRules, ...storedRules];
	}

	getAliases(): string[] {
		return Object.keys(this.sensitiveFieldRules);
	}

	async saveRules(rules: RuntimeCredentialRule[]) {
		const seen = new Set<string>();
		for (const { alias } of rules) {
			// Runtime values are stored by alias in a plain object, so this key cannot be one.
			if (alias === '__proto__') {
				throw new UserError(`The alias "${alias}" is not supported`);
			}
			if (Object.hasOwn(this.envRules, alias)) {
				throw new UserError(
					`The alias "${alias}" is already set in N8N_SECURITY_SENSITIVE_FIELD_RULES. Choose another alias.`,
				);
			}
			if (seen.has(alias)) {
				throw new UserError(`The alias "${alias}" is used by more than one rule`);
			}
			seen.add(alias);
		}

		await this.settingsRepository.upsertByKey(RULES_SETTINGS_KEY, JSON.stringify(rules), true, {});
		this.storedRules = rules;
		this.applyRules();
	}

	private applyRules() {
		const fromSettings = Object.fromEntries(
			this.storedRules.map(({ alias, nodeType, path }) => [alias, { nodeType, path }]),
		);
		this.sensitiveFieldRules = { ...fromSettings, ...this.envRules };
	}

	private extractFromItem(
		rule: ValueLookupPath,
		item: INodeExecutionData,
	): ArtifactItem | undefined {
		const extracted = extractAndClear(item.json, rule.path);
		if (extracted === undefined) return undefined;
		return toJsonValue(extracted);
	}

	strip(items: INodeExecutionData[], triggerNodeType: string): StripResult {
		const artifactsByAlias: Record<string, ArtifactItem> = {};

		for (const [alias, rule] of Object.entries(this.sensitiveFieldRules)) {
			if (rule.nodeType !== '*' && rule.nodeType !== triggerNodeType) {
				// This rule does not apply to this trigger
				continue;
			}

			const values = items
				.map((item) => this.extractFromItem(rule, item))
				.filter((value): value is ArtifactItem => value !== undefined);

			if (values.length === 0) continue;

			artifactsByAlias[alias] = values;
		}

		return { triggerItems: items, artifactsByAlias };
	}
}

// Round-trip scrubs Date/non-serialisable leaves so the value conforms to JsonValueSchema.
function toJsonValue(value: unknown): ArtifactItem | undefined {
	if (value === undefined) return undefined;
	try {
		const serialised = JSON.stringify(value);
		if (serialised === undefined) return undefined;
		return JSON.parse(serialised) as ArtifactItem;
	} catch {
		return undefined;
	}
}
