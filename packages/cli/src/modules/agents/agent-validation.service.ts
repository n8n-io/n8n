import { type CredentialProvider } from '@n8n/agents';
import {
	AgentModelSchema,
	MANAGED_CREDENTIAL_TOKEN,
	SUB_AGENT_TASK_DIFFICULTIES,
	type AgentJsonConfig,
} from '@n8n/api-types';
import { Service } from '@n8n/di';

import { LLM_PROVIDER_DEFAULTS } from './builder/interactive/llm-provider-defaults';
import { getProviderPrefix } from './json-config/model-id';
import { AgentRepository } from './repositories/agent.repository';
import { AiService } from '@/services/ai.service';
import { getMissingSkillIds } from '@/modules/agents/utils/agent-missing-skill-ids';

@Service()
export class AgentValidationService {
	constructor(
		private readonly agentRepository: AgentRepository,
		private readonly aiService: AiService,
	) {}

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
				if (!(await credentialExists(credentialId))) missing.push('credential');
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

		try {
			const modelsByDifficulty = config.subAgents?.modelsByDifficulty;
			if (modelsByDifficulty) {
				for (const difficulty of SUB_AGENT_TASK_DIFFICULTIES) {
					await this.validateMemoryWorkerModel(
						modelsByDifficulty[difficulty],
						`subAgents.modelsByDifficulty.${difficulty}`,
						findCredential,
						missing,
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
