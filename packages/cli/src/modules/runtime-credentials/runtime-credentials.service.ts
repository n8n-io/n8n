import { Logger } from '@n8n/backend-common';
import { RuntimeCredentialRuleRepository } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { createHash } from 'node:crypto';
import { INodeExecutionData, ISecureArtifactsV1, jsonParse } from 'n8n-workflow';

import { extractAndClear } from './path-traversal';
import { RuntimeCredentialsConfig } from './runtime-credentials.config';
import {
	SensitiveFieldRules,
	sensitiveFieldRulesSchema,
	ValueLookupPath,
	valueLookupPathSchema,
} from './runtime-credentials.schemas';

export const stripMarker = (credentialType: string) => `[moved to credential: ${credentialType}]`;

/** Stable id of the stub credential row for a rule. The alias is the rule's identity. */
export const runtimeStubId = (alias: string) =>
	`runtime-${createHash('sha256').update(alias).digest('hex').slice(0, 16)}`;

export type CredentialRule = ValueLookupPath & { credentialType: string };

type ArtifactItem = ISecureArtifactsV1['artifacts'][string];

export type StripResult = {
	triggerItems: INodeExecutionData[];
	artifactsByAlias: Record<string, ArtifactItem>;
};

@Service()
export class RuntimeCredentialsService {
	/** Rules from the environment. Read-only. */
	private environmentRules: SensitiveFieldRules = {};

	/** Rules from the database. Another main may change them, see `reloadDatabaseRules`. */
	private databaseRules: SensitiveFieldRules = {};

	/** Environment and database rules. An environment rule wins on a clash. */
	private sensitiveFieldRules: SensitiveFieldRules = {};

	constructor(
		private readonly logger: Logger,
		private readonly config: RuntimeCredentialsConfig,
		private readonly ruleRepository: RuntimeCredentialRuleRepository,
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

		this.environmentRules = parsedRules.data;
		this.mergeRules();

		for (const [alias, rule] of Object.entries(this.environmentRules)) {
			this.logger.info('Loaded runtime credential rule', {
				alias,
				nodeType: rule.nodeType,
				path: rule.path,
				credentialType: rule.credentialType,
				allowedDomains: rule.allowedDomains,
			});
		}
	}

	/**
	 * Reads the database rules into memory. A row that fails validation is skipped and logged,
	 * so one bad row cannot disable the other rules.
	 */
	async loadDatabaseRules(): Promise<void> {
		const rows = await this.ruleRepository.findAll({});
		const rules: SensitiveFieldRules = {};
		for (const row of rows) {
			if (row.alias === '__proto__') continue;
			const parsed = valueLookupPathSchema.safeParse({
				nodeType: row.nodeType,
				path: row.path,
				credentialType: row.credentialType,
				transform: row.transform ?? undefined,
				allowedDomains: row.allowedDomains ?? undefined,
			});
			if (!parsed.success) {
				this.logger.warn('Skipped invalid runtime credential rule in the database', {
					alias: row.alias,
				});
				continue;
			}
			rules[row.alias] = parsed.data;
		}
		this.databaseRules = rules;
		this.mergeRules();
	}

	/** Runs on every main when another main changes a database rule. */
	@OnPubSubEvent('reload-runtime-credential-rules')
	async reloadDatabaseRules(): Promise<void> {
		try {
			await this.loadDatabaseRules();
		} catch (error) {
			this.logger.error('Failed to reload runtime credential rules', { error });
		}
	}

	/** True when the alias belongs to an environment rule. */
	isEnvironmentRule(alias: string): boolean {
		return Object.hasOwn(this.environmentRules, alias);
	}

	/** True when the alias belongs to a database rule. */
	isDatabaseRule(alias: string): boolean {
		return Object.hasOwn(this.databaseRules, alias) && !this.isEnvironmentRule(alias);
	}

	/** Every rule with its alias. */
	getAllRules(): Array<[string, ValueLookupPath]> {
		return Object.entries(this.sensitiveFieldRules);
	}

	private mergeRules() {
		this.sensitiveFieldRules = { ...this.databaseRules, ...this.environmentRules };
	}

	/** Rules that feed a credential, with their alias. */
	getCredentialRules(): Array<[string, CredentialRule]> {
		return Object.entries(this.sensitiveFieldRules).filter(
			(entry): entry is [string, CredentialRule] => entry[1].credentialType !== undefined,
		);
	}

	/** The rule that a stub credential row belongs to, or undefined when the rule was removed. */
	getRuleForStub(credentialId: string): { alias: string; rule: CredentialRule } | undefined {
		const entry = this.getCredentialRules().find(
			([alias]) => runtimeStubId(alias) === credentialId,
		);
		return entry ? { alias: entry[0], rule: entry[1] } : undefined;
	}

	/** True when the rule behind a stub credential applies to the trigger node type. */
	stubRuleAppliesToTrigger(credentialId: string, triggerNodeType: string): boolean {
		const rule = this.getRuleForStub(credentialId)?.rule;
		return rule !== undefined && (rule.nodeType === '*' || rule.nodeType === triggerNodeType);
	}

	private extractFromItem(
		rule: ValueLookupPath,
		item: INodeExecutionData,
	): ArtifactItem | undefined {
		const replacement = rule.credentialType ? stripMarker(rule.credentialType) : undefined;
		const extracted = extractAndClear(item.json, rule.path, replacement);
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
