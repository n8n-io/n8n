import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { INodeExecutionData, ISecureArtifactsV1, jsonParse } from 'n8n-workflow';

import { InboundSecretsConfig } from './inbound-secrets.config';
import { SensitiveFieldRules, sensitiveFieldRulesSchema } from './inbound-secrets.schemas';
import { extractAndClear } from './path-traversal';

type ArtifactItem = ISecureArtifactsV1['artifacts'][string][number];
type ArtifactValue = ArtifactItem[string];

export type StripResult = {
	triggerItems: INodeExecutionData[];
	artifactsByItem: ArtifactItem[];
};

@Service()
export class InboundSecretsService {
	private sensitiveFieldRules: SensitiveFieldRules = {};

	constructor(
		private readonly logger: Logger,
		private readonly config: InboundSecretsConfig,
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

	strip(
		items: INodeExecutionData[],
		triggerNodeType: string,
		descriptionPaths: string[] = [],
	): StripResult {
		const wildcardPaths = this.sensitiveFieldRules['*'] ?? [];
		const typePaths = this.sensitiveFieldRules[triggerNodeType] ?? [];
		const paths = Array.from(new Set([...wildcardPaths, ...typePaths, ...descriptionPaths]));

		const artifactsByItem: ArtifactItem[] = [];

		if (paths.length === 0) {
			for (let i = 0; i < items.length; i++) artifactsByItem.push({});
			return { triggerItems: items, artifactsByItem };
		}

		for (const item of items) {
			const perItem: ArtifactItem = {};
			for (const path of paths) {
				const extracted = extractAndClear(item.json, path);
				if (extracted === undefined) continue;
				const sanitised = toJsonValue(extracted);
				if (sanitised === undefined) continue;
				perItem[path] = sanitised;
			}
			artifactsByItem.push(perItem);
		}
		return { triggerItems: items, artifactsByItem };
	}
}

// Round-trip scrubs Date/non-serialisable leaves so the value conforms to JsonValueSchema.
function toJsonValue(value: unknown): ArtifactValue | undefined {
	try {
		const serialised = JSON.stringify(value);
		if (serialised === undefined) return undefined;
		return JSON.parse(serialised) as ArtifactValue;
	} catch {
		return undefined;
	}
}
