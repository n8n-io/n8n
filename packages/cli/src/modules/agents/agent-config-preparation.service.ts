import { reconcileNativeWebSearch } from '@n8n/ai-utilities/agent-config';
import {
	AgentJsonConfigSchema,
	findVectorStoreToolNameCollisions,
	formatAgentConfigZodError,
	sanitizeAgentJsonConfig,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';

import { NodeToolAiGatewayService } from './json-config/node-tool-ai-gateway.service';
import { sanitizeUnknownAgentCredentials } from './json-config/sanitize-unknown-agent-credentials';
import { normalizeWorkflowToolRefs } from './tools/workflow-tool-workflow-resolver';
import { createAgentCredentialProvider } from './utils/agent-credential-provider';
import {
	findHttpRequestToolUrlFromAiViolations,
	validateNodeToolConfigs,
	validateNodeToolExpressions,
} from './utils/node-tool-validation';

@Service()
export class AgentConfigPreparationService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly nodeToolAiGatewayService: NodeToolAiGatewayService,
	) {}

	async prepareConfig(config: unknown, projectId: string, user: User) {
		const credentialProvider = createAgentCredentialProvider(
			this.credentialsService,
			projectId,
			user,
		);
		const accessibleCredentials = await credentialProvider.list();
		const accessibleCredentialIds = new Set(
			accessibleCredentials.map((credential) => credential.id),
		);
		const sanitizedBaseConfig = sanitizeAgentJsonConfig(config);
		const sanitizedConfig = sanitizeUnknownAgentCredentials(
			sanitizedBaseConfig,
			accessibleCredentialIds,
		);

		const result = await this.validateConfig(sanitizedConfig);
		if (!result.valid) {
			throw new UserError(`Invalid agent config: ${result.error}`);
		}

		// Keep persisted provider tools consistent with the web-search settings.
		const validatedConfig = reconcileNativeWebSearch(result.config);

		if (validatedConfig.tools !== undefined) {
			await this.nodeToolAiGatewayService.assignManagedCredentials(
				validatedConfig.tools.filter((tool) => tool.enabled !== false),
				new Set(accessibleCredentials.map((credential) => credential.type)),
			);
		}
		await normalizeWorkflowToolRefs(this.workflowRepository, validatedConfig, projectId);

		return { validatedConfig, credentialProvider };
	}

	/** Validate the config shape and the node tool schemas. */
	async validateConfig(
		raw: unknown,
	): Promise<{ valid: true; config: AgentJsonConfig } | { valid: false; error: string }> {
		if (hasNodeToolInputSchema(raw)) {
			return { valid: false, error: 'Node tool configs must not include inputSchema.' };
		}

		const parsed = AgentJsonConfigSchema.safeParse(sanitizeAgentJsonConfig(raw));
		if (!parsed.success) {
			return { valid: false, error: formatAgentConfigZodError(parsed.error) };
		}

		const config = parsed.data;

		const toolNameCollisions = findVectorStoreToolNameCollisions(config);
		if (toolNameCollisions.length > 0) {
			return {
				valid: false,
				error: `Vector store tool name collides with an existing tool: ${toolNameCollisions.join(', ')}`,
			};
		}

		try {
			validateNodeToolExpressions(config.tools);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				valid: false,
				error: `Invalid $fromAI expression in node tool config: ${message}`,
			};
		}

		const urlViolations = findHttpRequestToolUrlFromAiViolations(config.tools);
		if (urlViolations.length > 0) {
			return {
				valid: false,
				error: urlViolations
					.map(
						({ toolName, path }) =>
							`HTTP Request tool "${toolName}" cannot use $fromAI in ${path}. Enter a fixed URL.`,
					)
					.join('\n'),
			};
		}

		const nodeError = await validateNodeToolConfigs(config.tools);
		if (nodeError) {
			return { valid: false, error: nodeError };
		}

		return { valid: true, config };
	}
}

function hasNodeToolInputSchema(raw: unknown): boolean {
	if (!isRecord(raw) || !Array.isArray(raw.tools)) return false;

	return raw.tools.some((tool) => isRecord(tool) && tool.type === 'node' && 'inputSchema' in tool);
}
