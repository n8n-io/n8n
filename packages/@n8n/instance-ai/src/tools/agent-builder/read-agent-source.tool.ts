import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { generateSourceFromAgentConfig } from './agent-source-generation';
import { resolveAgentBuilderTarget } from './agent-target-binding';
import { withConfigHash } from './config-helpers';
import type { InstanceAiContext } from '../../types';
import { writeWorkspaceFile } from '../../workspace/workspace-files';
import { AGENT_BUILDER_TOOL_IDS } from '../tool-ids';

const readAgentSourceInputSchema = z.object({}).strict();

function rootError(message: string) {
	return { ok: false as const, errors: [{ path: '(root)', message }] };
}

export function createReadAgentSourceTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.READ_AGENT_SOURCE)
		.description(
			'Materialize the latest persisted Agent config as editable TypeScript source. ' +
				'Returns filePath and the configHash required by build_agent.',
		)
		.input(readAgentSourceInputSchema)
		.handler(async () => {
			if (!context.agentBuilderService) {
				return rootError('The Agent builder service is unavailable.');
			}
			if (!context.workspace) {
				return rootError(
					'The runtime workspace is unavailable, so Agent source cannot be written.',
				);
			}
			const target = await resolveAgentBuilderTarget(context);
			if (!target) {
				return rootError('No agent is being built yet. Call create_agent first.');
			}

			try {
				const snapshot = await context.agentBuilderService.getConfigSnapshot(
					target.agentId,
					target.projectId,
				);
				if (!snapshot.config) {
					return rootError(
						'The target agent has no config yet. Create its source with build_agent.',
					);
				}

				const filePath = `src/agents/${target.agentId}.agent.ts`;
				await writeWorkspaceFile(
					context.workspace,
					filePath,
					generateSourceFromAgentConfig(snapshot.config),
					{ logger: context.logger, resourceLabel: 'Agent source file' },
				);
				const hashed = withConfigHash(snapshot);
				return {
					ok: true as const,
					filePath,
					configHash: hashed.configHash,
					updatedAt: hashed.updatedAt,
					versionId: hashed.versionId,
				};
			} catch (error) {
				return rootError(error instanceof Error ? error.message : String(error));
			}
		})
		.build();
}
