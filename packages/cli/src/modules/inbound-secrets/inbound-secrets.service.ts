import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { INodeExecutionData, jsonParse } from 'n8n-workflow';

import { InboundSecretsConfig } from './inbound-secrets.config';
import { SensitiveFieldRules, sensitiveFieldRulesSchema } from './inbound-secrets.schemas';
import { extractAndClear } from './path-traversal';

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

	strip(items: INodeExecutionData[], triggerNodeType: string): INodeExecutionData[] {
		const wildcardPaths = this.sensitiveFieldRules['*'] ?? [];
		const typePaths = this.sensitiveFieldRules[triggerNodeType] ?? [];
		const paths = [...wildcardPaths, ...typePaths];

		if (paths.length === 0) return items;

		for (const item of items) {
			for (const path of paths) {
				extractAndClear(item.json, path);
			}
		}
		return items;
	}
}
