// ---------------------------------------------------------------------------
// Stub LocalMcpServer for discovery evals.
//
// A case declares its connected channels through `instanceState.computerUse`, and
// the runner plugs in this stub so the agent holds the matching tools without
// spinning up the real computer-use daemon or the Chrome extension. The stub
// advertises tools by name and category. It never receives actual `callTool` invocations during
// discovery scenarios — the orchestrator's first dispatch decision is what we
// measure, not downstream tool execution.
// ---------------------------------------------------------------------------

import type { McpTool, McpToolCallRequest, McpToolCallResult } from '@n8n/api-types';

import type { LocalMcpServer } from '../../src/types';

const STUB_BROWSER_TOOL_NAMES = [
	'browser_connect',
	'browser_tab_open',
	'browser_navigate',
	'browser_snapshot',
	'browser_content',
	'browser_click',
	'browser_type',
	'browser_screenshot',
	'browser_capture_secret',
	'browser_create_credential',
];

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
			// Return a normal tool-error result rather than throwing. native agent logs an
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
