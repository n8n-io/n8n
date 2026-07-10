/**
 * build_agent — compile and persist an Agent definition from the runtime workspace.
 */
import { Tool } from '@n8n/agents';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';

import { compileAgentSource } from './agent-source-compiler';
import { agentConfigToSourceCore, generateSourceFromAgentConfig } from './agent-source-generation';
import { baseConfigHashSchema, persistConfigCandidate } from './config-tools';
import type { InstanceAiContext } from '../../types';
import { readWorkspaceFile, writeWorkspaceFile } from '../../workspace/workspace-files';
import { normalizeWorkspaceRelativePath } from '../../workspace/workspace-paths';
import { AGENT_BUILDER_TOOL_IDS } from '../tool-ids';

export const buildAgentInputSchema = z
	.object({
		filePath: z
			.string()
			.describe(
				'Workspace-relative path to the Agent source, e.g. src/agents/support-triage.agent.ts',
			),
		sourceCode: z
			.string()
			.optional()
			.describe('Complete source to write to filePath before building. Omit for targeted retries.'),
		baseConfigHash: baseConfigHashSchema,
		destructiveChangeConfirmation: z
			.string()
			.optional()
			.describe('Confirmation token returned by a destructive-removal preflight.'),
	})
	.strict();

function rootError(message: string) {
	return { ok: false as const, errors: [{ path: '(root)', message }] };
}

export function createBuildAgentTool(context: InstanceAiContext) {
	return new Tool(AGENT_BUILDER_TOOL_IDS.BUILD_AGENT)
		.description(
			'Compile and persist an Agent from TypeScript source in the workspace. ' +
				'Use @n8n/workflow-sdk/agent and the src/agents/<slug>.agent.ts convention. ' +
				'Compatibility .agent.json files remain supported. ' +
				'Requires baseConfigHash from the immediately preceding read_agent_source/read_config result, or from a stale ' +
				'retry response; null only when the agent has no config yet. ' +
				'Do not use a configHash copied from the prompt snapshot. ' +
				'Returns { ok: true, config, configHash, updatedAt, versionId } on success or ' +
				'{ ok: false, stage, errors } with path, message fields on failure. ' +
				'stage identifies source, artifact, stale, schema, reference, node, confirmation, or persistence failures.',
		)
		.input(buildAgentInputSchema)
		.handler(async ({ filePath, sourceCode, baseConfigHash, destructiveChangeConfirmation }) => {
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

			if (sourceCode !== undefined) {
				try {
					await writeWorkspaceFile(context.workspace, normalizedFilePath, sourceCode, {
						logger: context.logger,
						resourceLabel: 'Agent source file',
					});
				} catch (error) {
					return {
						ok: false as const,
						stage: 'source',
						errors: [
							{
								path: '(root)',
								message: error instanceof Error ? error.message : String(error),
							},
						],
					};
				}
			}

			const source = await readWorkspaceFile(context.workspace, normalizedFilePath, {
				logger: context.logger,
				resourceLabel: 'Agent source file',
			});
			if (source === null) {
				return rootError(
					`Agent source file not found: ${normalizedFilePath}. Write the complete Agent definition first.`,
				);
			}

			const compiled = await compileAgentSource(context, normalizedFilePath, source);
			if (!compiled.success) {
				return {
					ok: false as const,
					stage: compiled.reason === 'agent_json_parse_failed' ? 'parse' : compiled.stage,
					reason: compiled.reason,
					errors: compiled.errors.map((message) => ({ path: '(root)', message })),
				};
			}

			const candidate = compiled.compiler === 'agent-json' ? compiled.json : compiled.artifact.core;
			const result = await persistConfigCandidate(context, candidate, baseConfigHash, {
				destructiveChangeConfirmation,
			});
			if (!result.ok) return result;

			const compilerWarnings =
				compiled.compiler === 'agent-source-tsx' ? compiled.artifact.warnings : [];
			const sourceSyncWarnings: Array<{ code: string; message: string; path?: string }> = [];
			let sourceUpdated = false;
			if (result.config) {
				try {
					const persistedCore = agentConfigToSourceCore(result.config);
					const compiledCore =
						compiled.compiler === 'agent-source-tsx' ? compiled.artifact.core : compiled.json;
					if (!isDeepStrictEqual(compiledCore, persistedCore)) {
						const normalizedSource =
							compiled.compiler === 'agent-source-tsx'
								? generateSourceFromAgentConfig(result.config)
								: `${JSON.stringify(persistedCore, null, 2)}\n`;
						await writeWorkspaceFile(context.workspace, normalizedFilePath, normalizedSource, {
							logger: context.logger,
							resourceLabel: 'Agent source file',
						});
						sourceUpdated = true;
					}
				} catch (error) {
					sourceSyncWarnings.push({
						code: 'SOURCE_SYNC_FAILED',
						path: normalizedFilePath,
						message: `The Agent config was saved, but its normalized source could not be generated or written: ${error instanceof Error ? error.message : String(error)}`,
					});
				}
			}

			return {
				...result,
				compiler: compiled.compiler,
				sourceUpdated,
				validation: {
					...result.validation,
					warnings: [...result.validation.warnings, ...compilerWarnings, ...sourceSyncWarnings],
				},
			};
		})
		.build();
}
