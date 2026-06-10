import { z } from 'zod';

import { detectActiveContext } from './detect';
import type { ToolContext, ToolDefinition, ToolModule } from '../types';
import { formatCallToolResult } from '../utils';

const detectContextSchema = z.object({});

/**
 * MCP tool wrapping `detectActiveContext`. Lets the orchestrator re-read what
 * the user is looking at mid-task (the desktop picker calls the same function
 * directly, in-process, without this round-trip). Read-only and grouped under
 * `filesystemRead` so it inherits an ambient read-access posture rather than
 * the default-deny `computer` group.
 */
export const detectContextTool: ToolDefinition<typeof detectContextSchema> = {
	name: 'context_active',
	description:
		'Detect what the user is currently looking at: the frontmost app, window title, browser tab URL, and the current Finder folder or document path when available.',
	inputSchema: detectContextSchema,
	annotations: { readOnlyHint: true },
	getAffectedResources() {
		return [
			{
				toolGroup: 'filesystemRead' as const,
				resource: '*',
				description: 'Read the active window / current context',
			},
		];
	},
	async execute(_input: z.infer<typeof detectContextSchema>, _context: ToolContext) {
		const detected = await detectActiveContext();
		return formatCallToolResult({ ...detected });
	},
};

export const ContextModule: ToolModule = {
	isSupported() {
		// Detection is best-effort everywhere: on non-macOS it returns
		// `{ kind: 'other' }` rather than failing, so the tool is always offered.
		return true;
	},
	definitions: [detectContextTool],
};
