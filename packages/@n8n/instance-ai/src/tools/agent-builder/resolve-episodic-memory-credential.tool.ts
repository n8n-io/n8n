import { Tool } from '@n8n/agents';
import { MANAGED_CREDENTIAL_TOKEN } from '@n8n/api-types';
import { z } from 'zod';

import { resolveAgentBuilderTarget } from './agent-target-binding';
import type { InstanceAiContext } from '../../types';
import { AGENT_BUILDER_TOOL_IDS } from '../tool-ids';

const OPENAI_CREDENTIAL_TYPE = 'openAiApi';

export function createResolveEpisodicMemoryCredentialTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.RESOLVE_EPISODIC_MEMORY_CREDENTIAL)
		.description(
			'Resolve the OpenAI embedding credential required to enable Episodic Memory. ' +
				'Prefers n8n-managed embeddings when available; otherwise auto-selects the only ' +
				'project-scoped OpenAI credential or returns choices. Copy the returned ' +
				'episodicMemory block into `.memory(...)`.',
		)
		.systemInstruction(
			'Call this before enabling Episodic Memory, long-term memory, remembered prior ' +
				'conversations, or cross-session recall. Never guess or reuse another credential.',
		)
		.input(z.object({}))
		.handler(async () => {
			const service = context.agentBuilderService;
			const target = await resolveAgentBuilderTarget(context);
			if (!service || !target) {
				return { ok: false as const, reason: 'not_available' as const };
			}

			if (await service.isEpisodicMemoryManagedCredentialAvailable()) {
				return {
					ok: true as const,
					credentialId: MANAGED_CREDENTIAL_TOKEN,
					credentialName: 'Managed by n8n',
					managed: true,
					episodicMemory: { enabled: true as const, credential: MANAGED_CREDENTIAL_TOKEN },
				};
			}

			const credentials = (
				await context.credentialService.list({
					type: OPENAI_CREDENTIAL_TYPE,
					projectId: target.projectId,
				})
			)
				.filter(({ type }) => type === OPENAI_CREDENTIAL_TYPE)
				.map(({ id, name }) => ({ id, name }));

			if (credentials.length === 1) {
				return {
					ok: true as const,
					credentialId: credentials[0].id,
					credentialName: credentials[0].name,
					managed: false,
					episodicMemory: { enabled: true as const, credential: credentials[0].id },
				};
			}

			return {
				ok: false as const,
				reason:
					credentials.length === 0
						? ('missing_credential' as const)
						: ('ambiguous_credential' as const),
				credentialType: OPENAI_CREDENTIAL_TYPE,
				credentials,
			};
		})
		.build();
}
