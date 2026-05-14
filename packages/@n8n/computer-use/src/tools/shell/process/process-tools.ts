import { z } from 'zod';

import type { ToolDefinition } from '../../types';
import { formatCallToolResult } from '../../utils';
import { buildShellResource } from '../build-shell-resource';
import { type ProcessSnapshot, processManager } from './process-manager';

const processStartInputSchema = z.object({
	command: z.string().describe('Shell command to start as a background process'),
	cwd: z.string().optional().describe('Working directory for the command'),
});

const processIdInputSchema = z.object({
	processId: z.string().describe('Process id returned by process_start'),
});

const processWaitInputSchema = processIdInputSchema.extend({
	timeoutMs: z.number().int().min(1).optional().describe('Maximum time to wait in milliseconds'),
});

const processWriteInputSchema = processIdInputSchema.extend({
	input: z.string().describe('Text to write to the process stdin'),
});

const MAX_PROCESS_INPUT_PREVIEW_CHARS = 16_000;

function formatProcessSnapshot(snapshot: ProcessSnapshot) {
	return formatCallToolResult({ ...snapshot });
}

function buildProcessInputPreview(processId: string, input: string) {
	const truncated = input.length > MAX_PROCESS_INPUT_PREVIEW_CHARS;
	return {
		kind: 'text' as const,
		title: `Input to process: ${processId}`,
		content: truncated
			? `${input.slice(0, MAX_PROCESS_INPUT_PREVIEW_CHARS)}\n... truncated ...`
			: input,
		truncated,
	};
}

export const processStartTool: ToolDefinition<typeof processStartInputSchema> = {
	name: 'process_start',
	description: 'Start a long-running shell command and return a process id',
	inputSchema: processStartInputSchema,
	annotations: { destructiveHint: true },
	getAffectedResources({ command }) {
		return [
			{
				toolGroup: 'shell' as const,
				resource: buildShellResource(command),
				description: `Start shell process: ${command}`,
			},
		];
	},
	async execute({ command, cwd }, { dir }) {
		return formatProcessSnapshot(await processManager.start(command, { dir, cwd: cwd ?? dir }));
	},
};

export const processPollTool: ToolDefinition<typeof processIdInputSchema> = {
	name: 'process_poll',
	description: 'Poll a started process and return output produced since the previous poll',
	inputSchema: processIdInputSchema,
	annotations: { readOnlyHint: true },
	getAffectedResources() {
		return [];
	},
	execute({ processId }) {
		return formatProcessSnapshot(processManager.poll(processId));
	},
};

export const processWaitTool: ToolDefinition<typeof processWaitInputSchema> = {
	name: 'process_wait',
	description: 'Wait for a started process to finish or until the timeout expires',
	inputSchema: processWaitInputSchema,
	annotations: { readOnlyHint: true },
	getAffectedResources() {
		return [];
	},
	async execute({ processId, timeoutMs = 30_000 }) {
		return formatProcessSnapshot(await processManager.wait(processId, timeoutMs));
	},
};

export const processWriteTool: ToolDefinition<typeof processWriteInputSchema> = {
	name: 'process_write',
	description: 'Write text to a started process stdin',
	inputSchema: processWriteInputSchema,
	annotations: { destructiveHint: true },
	getAffectedResources({ processId, input }) {
		return [
			{
				toolGroup: 'shell' as const,
				resource: `process:${processId}`,
				description: `Write to process: ${processId}`,
				preview: buildProcessInputPreview(processId, input),
			},
		];
	},
	execute({ processId, input }) {
		return formatProcessSnapshot(processManager.write(processId, input));
	},
};

export const processKillTool: ToolDefinition<typeof processIdInputSchema> = {
	name: 'process_kill',
	description: 'Stop a process that was started with process_start',
	inputSchema: processIdInputSchema,
	annotations: { destructiveHint: true },
	getAffectedResources({ processId }) {
		return [
			{
				toolGroup: 'shell' as const,
				resource: `process:${processId}`,
				description: `Stop process: ${processId}`,
			},
		];
	},
	execute({ processId }) {
		return formatProcessSnapshot(processManager.kill(processId));
	},
};

export const processTools: ToolDefinition[] = [
	processStartTool,
	processPollTool,
	processWaitTool,
	processWriteTool,
	processKillTool,
];
