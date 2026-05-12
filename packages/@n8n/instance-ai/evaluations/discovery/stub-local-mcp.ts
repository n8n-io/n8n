// ---------------------------------------------------------------------------
// Stub LocalMcpServer for discovery evals.
//
// The orchestrator computes `browserAvailable` from the size of
// `context.localMcpServer?.getToolsByCategory('browser')` plus any browser
// MCP tools loaded via the McpClientManager. To exercise the
// `browserAvailable: true` branch of the system prompt without spinning up
// the real computer-use daemon, we plug in a stub server that advertises
// browser tools by name. The stub never receives actual `callTool`
// invocations during discovery scenarios — the orchestrator's first
// dispatch decision is what we measure, not downstream tool execution.
// ---------------------------------------------------------------------------

import type { McpTool, McpToolCallRequest, McpToolCallResult } from '@n8n/api-types';

import type { LocalMcpServer } from '../../src/types';

const STUB_BROWSER_TOOL_NAMES = ['browser_navigate', 'browser_snapshot', 'browser_screenshot'];

const STUB_FILESYSTEM_TOOL_NAMES = ['fs_read_file', 'fs_search_files', 'fs_list_dir'];

const STUB_SHELL_TOOL_NAMES = ['shell_run'];

function makeStubTool(name: string, category: string): McpTool {
	return {
		name,
		description: `Stub ${category} tool — no-op for discovery evals.`,
		inputSchema: { type: 'object', properties: {} },
		annotations: { category },
	};
}

export interface CreateStubLocalMcpServerOptions {
	/** Capabilities to advertise. Each capability publishes a small set of stub tool names. */
	capabilities: ReadonlyArray<'browser' | 'filesystem' | 'shell'>;
}

export function createStubLocalMcpServer(options: CreateStubLocalMcpServerOptions): LocalMcpServer {
	const tools: McpTool[] = [];
	if (options.capabilities.includes('browser')) {
		for (const name of STUB_BROWSER_TOOL_NAMES) tools.push(makeStubTool(name, 'browser'));
	}
	if (options.capabilities.includes('filesystem')) {
		for (const name of STUB_FILESYSTEM_TOOL_NAMES) tools.push(makeStubTool(name, 'filesystem'));
	}
	if (options.capabilities.includes('shell')) {
		for (const name of STUB_SHELL_TOOL_NAMES) tools.push(makeStubTool(name, 'shell'));
	}

	return {
		getAvailableTools: () => tools,
		getToolsByCategory: (category: string) =>
			tools.filter((t) => {
				const annotations = t.annotations;
				return (
					annotations !== undefined &&
					typeof annotations === 'object' &&
					(annotations as Record<string, unknown>).category === category
				);
			}),
		// eslint-disable-next-line @typescript-eslint/require-await
		callTool: async (req: McpToolCallRequest): Promise<McpToolCallResult> => {
			// Return a normal tool-error result rather than throwing. Mastra logs an
			// error stack trace for thrown tool errors; an `isError: true` result is
			// treated as expected and surfaced as a `tool-error` event without spam.
			// The discovery check still records the underlying `tool-call` event, so
			// dispatch is captured either way.
			return {
				content: [
					{
						type: 'text' as const,
						text: `Stub: ${req.name} would have executed in production. Discovery evals measure dispatch, not execution.`,
					},
				],
				isError: true,
			};
		},
	};
}
