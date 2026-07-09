import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
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

@Service()
export class RuntimeCredentialsService {
	private sensitiveFieldRules: SensitiveFieldRules = {};

	constructor(
		private readonly logger: Logger,
		private readonly config: RuntimeCredentialsConfig,
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

		this.sensitiveFieldRules = parsedRules.data;
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
