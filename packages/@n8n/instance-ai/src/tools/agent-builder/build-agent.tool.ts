/**
 * build_agent — persist the agent config from a JSON file in the runtime
 * workspace. The file is the editable source of truth (mirroring how
 * build-workflow consumes `.workflow.ts` sources); validation and persistence
 * stay host-side via the shared config pipeline. No sandbox execution happens:
 * the workspace is only the file medium.
 */
import { Tool } from '@n8n/agents';
import { z } from 'zod';

import { baseConfigHashSchema, persistConfigJson } from './config-tools';
import type { InstanceAiContext } from '../../types';
import { readWorkspaceFile } from '../../workspace/workspace-files';
import { normalizeWorkspaceRelativePath } from '../../workspace/workspace-paths';
import { AGENT_BUILDER_TOOL_IDS } from '../tool-ids';

export const buildAgentInputSchema = z.object({
	filePath: z
		.string()
		.describe(
			'Workspace-relative path to the agent config JSON file, e.g. src/agents/support-triage.agent.json',
		),
	baseConfigHash: baseConfigHashSchema,
});

function rootError(message: string) {
	return { ok: false as const, errors: [{ path: '(root)', message }] };
}

export function createBuildAgentTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.BUILD_AGENT)
		.description(
			'Validate and persist the agent configuration from a JSON file in the workspace. ' +
				'Write the complete agent config JSON to a file (convention: src/agents/<slug>.agent.json), ' +
				'edit it with the file tools, then call this with its filePath. ' +
				'Requires baseConfigHash from the immediately preceding read_config result, or from a stale ' +
				'retry response; null only when the agent has no config yet. ' +
				'Do not use a configHash copied from the prompt snapshot. ' +
				'Returns { ok: true, config, configHash, updatedAt, versionId } on success or ' +
				'{ ok: false, stage, errors } with path, message fields on failure. ' +
				'stage is "parse", "stale", "schema", or "validation".',
		)
		.input(buildAgentInputSchema)
		.handler(async ({ filePath, baseConfigHash }) => {
			if (!context.workspace) {
				return rootError(
					'The runtime workspace is unavailable, so agent config files cannot be read. ' +
						'Agent building requires the sandbox workspace.',
				);
			}

			let normalizedFilePath: string;
			try {
				normalizedFilePath = normalizeWorkspaceRelativePath(filePath, {
					resourceLabel: 'Agent config file',
				});
			} catch (e) {
				return rootError(e instanceof Error ? e.message : String(e));
			}

			const json = await readWorkspaceFile(context.workspace, normalizedFilePath, {
				logger: context.logger,
				resourceLabel: 'Agent config file',
			});
			if (json === null) {
				return rootError(
					`Agent config file not found: ${normalizedFilePath}. Write the complete config JSON to the file first.`,
				);
			}

			return await persistConfigJson(context, json, baseConfigHash);
		})
		.build();
}
