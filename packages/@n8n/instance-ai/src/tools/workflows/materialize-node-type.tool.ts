/**
 * Materialize Node Type Tool
 *
 * Resolves TypeScript node type definitions and:
 * 1. Writes them to the sandbox (so tsc can reference them)
 * 2. Returns the content inline (so the agent doesn't need separate cat calls)
 *
 * All definitions are resolved in parallel, then written to the sandbox in a
 * single batched command to minimize API round-trips.
 */

import { createTool } from '@mastra/core/tools';
import type { Workspace } from '@mastra/core/workspace';
import { z } from 'zod';

import type { InstanceAiContext } from '../../types';
import { runInSandbox } from '../../workspace/sandbox-fs';
import { getWorkspaceRoot } from '../../workspace/sandbox-setup';

const nodeRequestSchema = z.union([
	z.string().describe('Simple node ID, e.g. "n8n-nodes-base.httpRequest"'),
	z.object({
		nodeId: z.string().describe('Node type ID'),
		version: z.string().optional().describe('Version, e.g. "4.3" or "v43"'),
		resource: z.string().optional().describe('Resource discriminator for split nodes'),
		operation: z.string().optional().describe('Operation discriminator for split nodes'),
		mode: z.string().optional().describe('Mode discriminator for split nodes'),
	}),
]);

/**
 * Convert a node ID like "n8n-nodes-base.httpRequest" into a filesystem path
 * segment like "n8n-nodes-base/httpRequest".
 */
function nodeIdToPath(nodeId: string): string {
	const dotIndex = nodeId.lastIndexOf('.');
	if (dotIndex === -1) return nodeId;
	return `${nodeId.substring(0, dotIndex)}/${nodeId.substring(dotIndex + 1)}`;
}

/** Escape single quotes for use in shell strings. */
function esc(s: string): string {
	return s.replace(/'/g, "'\\''");
}

export const materializeNodeTypeInputSchema = z.object({
	nodeIds: z
		.array(nodeRequestSchema)
		.min(1)
		.max(5)
		.describe('Node IDs to materialize definitions for (max 5)'),
});

export function createMaterializeNodeTypeTool(context: InstanceAiContext, workspace: Workspace) {
	return createTool({
		id: 'materialize-node-type',
		description:
			'Get TypeScript type definitions for nodes. Returns the full definition content ' +
			'AND writes the files to the sandbox so tsc can reference them. ' +
			'Use after search-nodes to get exact schemas before writing workflow code. ' +
			'No need to cat the files afterward — content is returned directly.',
		inputSchema: materializeNodeTypeInputSchema,
		outputSchema: z.object({
			definitions: z.array(
				z.object({
					nodeId: z.string(),
					path: z.string(),
					content: z.string(),
					error: z.string().optional(),
				}),
			),
		}),
		execute: async ({ nodeIds }: z.infer<typeof materializeNodeTypeInputSchema>) => {
			if (!context.nodeService.getNodeTypeDefinition) {
				return {
					definitions: nodeIds.map((req: z.infer<typeof nodeRequestSchema>) => ({
						nodeId: typeof req === 'string' ? req : req.nodeId,
						path: '',
						content: '',
						error: 'Node type definitions are not available.',
					})),
				};
			}

			const root = await getWorkspaceRoot(workspace);

			// 1. Resolve all definitions in parallel
			const resolved = await Promise.all(
				nodeIds.map(async (req: z.infer<typeof nodeRequestSchema>) => {
					const nodeId = typeof req === 'string' ? req : req.nodeId;
					const options = typeof req === 'string' ? undefined : req;
					const result = await context.nodeService.getNodeTypeDefinition!(nodeId, options);

					if (!result || result.error) {
						return {
							nodeId,
							path: '',
							content: '',
							error: result?.error ?? `No type definition found for '${nodeId}'.`,
						};
					}

					const version = result.version ?? 'latest';
					const filePath = `${root}/node-types/${nodeIdToPath(nodeId)}/${version}.ts`;
					return { nodeId, path: filePath, content: result.content };
				}),
			);

			// 2. Batch-write all successful definitions in a single shell script
			const toWrite = resolved.filter(
				(r: { content: string; error?: string }) => r.content && !r.error,
			);
			if (toWrite.length > 0) {
				const lines: string[] = ['#!/bin/bash', 'set -e'];

				// Collect unique directories
				const dirs = new Set<string>();
				for (const f of toWrite) {
					const lastSlash = f.path.lastIndexOf('/');
					if (lastSlash > 0) dirs.add(f.path.substring(0, lastSlash));
				}
				lines.push(`mkdir -p ${[...dirs].map((d) => `'${esc(d)}'`).join(' ')}`);

				// Write each file via base64
				for (const f of toWrite) {
					const b64 = Buffer.from(f.content, 'utf-8').toString('base64');
					lines.push(`echo '${b64}' | base64 -d > '${esc(f.path)}'`);
				}

				const script = lines.join('\n');
				const scriptB64 = Buffer.from(script, 'utf-8').toString('base64');
				const result = await runInSandbox(workspace, `echo '${scriptB64}' | base64 -d | bash`);

				if (result.exitCode !== 0) {
					// Mark all as failed but still return content (useful for the agent)
					for (const f of toWrite) {
						(f as { error?: string }).error =
							`File write failed (content still usable): ${result.stderr.substring(0, 100)}`;
					}
				}
			}

			return { definitions: resolved };
		},
	});
}
