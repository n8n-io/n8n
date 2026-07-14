import { type CredentialProvider } from '@n8n/agents';
import { getProviderPrefix } from '@n8n/ai-utilities/agent-config';
import {
	AGENT_VECTOR_STORE_CREDENTIAL_TYPES,
	AgentModelSchema,
	AI_GATEWAY_MANAGED_TAG,
	MANAGED_CREDENTIAL_TOKEN,
	SUB_AGENT_TASK_DIFFICULTIES,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { Service } from '@n8n/di';

import { getMissingSkillIds } from '@/modules/agents/utils/agent-missing-skill-ids';
import { AiGatewayService } from '@/services/ai-gateway.service';
import { AiService } from '@/services/ai.service';

import { LLM_PROVIDER_DEFAULTS } from './builder/interactive/llm-provider-defaults';
import { AgentRepository } from './repositories/agent.repository';

@Service()
export class AgentValidationService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly aiService: AiService,
		private readonly aiGatewayService: AiGatewayService,
	) {}

	/** Whether the model can be served by n8n Connect (licensed + provider supported). */
	private async isAiGatewayModelSupported(model: string): Promise<boolean> {
		const provider = getProviderPrefix(model);
		if (!provider) return false;
		return (await this.aiGatewayService.getCredentialTypeForProvider(provider)) !== undefined;
	}

	/**
	 * Check whether an agent has the minimum config it needs to be run.
	 * Returns the list of missing/invalid fields, if any.
	 */
	async validateAgentIsRunnable(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
	): Promise<{ missing: string[] }> {
		const agentEntity = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agentEntity) {
			return { missing: ['agent'] };
		}
		// Schema is persisted as JSON — double-cast rehydrates to the typed config.
		const config = agentEntity.schema as unknown as AgentJsonConfig | null;
		const missing: string[] = [];

		if (!config) {
			return { missing: ['instructions', 'model', 'credential'] };
		}

		if (!config.instructions?.trim()) {
			missing.push('instructions');
		}

		if (!config.model?.trim() || !AgentModelSchema.safeParse(config.model).success) {
			missing.push('model');
		}

		let credentialList: Awaited<ReturnType<CredentialProvider['list']>> | undefined;
		const findCredential = async (credentialId: string) => {
			credentialList ??= await credentialProvider.list();
			return credentialList.find((credential) => credential.id === credentialId);
		};
		const credentialExists = async (credentialId: string) => {
			if (!credentialId || credentialId === MANAGED_CREDENTIAL_TOKEN) return false;
			return (await findCredential(credentialId)) !== undefined;
		};

		if (!config.credential?.trim()) {
			missing.push('credential');
		} else {
			try {
				const credentialId = config.credential.trim();
				if (credentialId === AI_GATEWAY_MANAGED_TAG) {
					if (!(await this.isAiGatewayModelSupported(config.model ?? ''))) {
						missing.push('credential');
					}
				} else if (!(await credentialExists(credentialId))) {
					missing.push('credential');
				}
			} catch {
				// Runtime reconstruction surfaces permission/listing failures with the concrete error.
			}
		}

		const episodicMemory = config.memory?.episodicMemory;
		if (config.memory?.enabled) {
			try {
				await this.validateMemoryWorkerModel(
					config.memory.observationalMemory?.observerModel,
					'memory.observationalMemory.observerModel',
					findCredential,
					missing,
				);
				await this.validateMemoryWorkerModel(
					config.memory.observationalMemory?.reflectorModel,
					'memory.observationalMemory.reflectorModel',
					findCredential,
					missing,
				);
				if (episodicMemory?.enabled === true) {
					const episodicCredentialId = episodicMemory.credential?.trim();
					const isManagedEmbeddingCredential =
						episodicCredentialId === MANAGED_CREDENTIAL_TOKEN && this.aiService.isProxyEnabled();
					if (!isManagedEmbeddingCredential && !(await credentialExists(episodicCredentialId))) {
						missing.push('episodicMemory.credential');
					}
					await this.validateMemoryWorkerModel(
						episodicMemory.extractorModel,
						'memory.episodicMemory.extractorModel',
						findCredential,
						missing,
					);
					await this.validateMemoryWorkerModel(
						episodicMemory.reflectorModel,
						'memory.episodicMemory.reflectorModel',
						findCredential,
						missing,
					);
				}
			} catch {
				// Same behavior as the main model credential: runtime reconstruction surfaces the error.
			}
		}

		const webSearch = config.config?.webSearch;
		if (
			webSearch?.enabled &&
			(webSearch.provider === 'brave' || webSearch.provider === 'searxng')
		) {
			const webSearchCredentialId = webSearch.credential?.trim();
			if (!webSearchCredentialId) {
				missing.push('webSearch.credential');
			} else {
				try {
					if (!(await credentialExists(webSearchCredentialId))) {
						missing.push('webSearch.credential');
					}
				} catch {
					// Keep the same behavior as other credential checks.
				}
			}
		}

		for (const vectorStore of config.vectorStores ?? []) {
			try {
				const credentialId = vectorStore.credential?.trim();
				const credential =
					credentialId && credentialId !== MANAGED_CREDENTIAL_TOKEN
						? await findCredential(credentialId)
						: undefined;
				if (credential?.type !== AGENT_VECTOR_STORE_CREDENTIAL_TYPES[vectorStore.provider]) {
					missing.push(`vectorStores.${vectorStore.name}.credential`);
				}
				const embeddingCredentialId = vectorStore.embedding.credential?.trim();
				if (!embeddingCredentialId || !(await credentialExists(embeddingCredentialId))) {
					missing.push(`vectorStores.${vectorStore.name}.embedding.credential`);
				}
			} catch {
				// Same behavior as other credential checks: runtime reconstruction surfaces the error.
			}
		}

		try {
			const modelsByDifficulty = config.subAgents?.modelsByDifficulty;
			if (modelsByDifficulty) {
				for (const difficulty of SUB_AGENT_TASK_DIFFICULTIES) {
					await this.validateMemoryWorkerModel(
						modelsByDifficulty[difficulty],
						`subAgents.modelsByDifficulty.${difficulty}`,
						findCredential,
						missing,
						true,
					);
				}
			}
		} catch {
			// Same behavior as other credential checks.
		}

		missing.push(
			...getMissingSkillIds(config, agentEntity.skills ?? {}).map((skillId) => `skill:${skillId}`),
		);

		return { missing };
	}

	private async validateMemoryWorkerModel(
		modelConfig: { model?: string | null; credential?: string | null } | string | null | undefined,
		path: string,
		findCredential: (
			credentialId: string,
		) => Promise<Awaited<ReturnType<CredentialProvider['list']>>[number] | undefined>,
		missing: string[],
		allowAiGatewayManaged = false,
	) {
		if (modelConfig === undefined || modelConfig === null) return;

		if (typeof modelConfig === 'string') {
			missing.push(`${path}.credential`);
			return;
		}

		if (!modelConfig.model?.trim() || !AgentModelSchema.safeParse(modelConfig.model).success) {
			missing.push(`${path}.model`);
		}

		const credentialId = modelConfig.credential?.trim();
		if (!credentialId) {
			missing.push(`${path}.credential`);
			return;
		}

		if (allowAiGatewayManaged && credentialId === AI_GATEWAY_MANAGED_TAG) {
			if (!(await this.isAiGatewayModelSupported(modelConfig.model ?? ''))) {
				missing.push(`${path}.credential`);
			}
			return;
		}

		const credential = await findCredential(credentialId);
		if (
			!credential ||
			!this.workerCredentialSupportsModel(credential.type, modelConfig.model ?? '')
		) {
			missing.push(`${path}.credential`);
		}
	}

	private workerCredentialSupportsModel(credentialType: string, model: string) {
		return LLM_PROVIDER_DEFAULTS[credentialType]?.provider === getProviderPrefix(model);
	}
}
