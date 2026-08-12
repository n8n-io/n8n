/**
 * `report_progress` pi extension tool, written to
 * `.pi/extensions/n8n-report-progress.ts`. The tool only acknowledges: its
 * value is the `tool_execution_start` event it produces in pi's JSON stream,
 * which the host's event translation turns into a transient `status` line
 * (see `PROGRESS_TOOL_NAME` in `../event-translation.ts` — the tool name and
 * the `{ message: string }` args shape are that contract).
 *
 * Registered via `pi.registerTool()` (pi extension API, verified against
 * @earendil-works/pi-coding-agent@0.84.1 dist/core/extensions/types.d.ts:901).
 */
export const REPORT_PROGRESS_EXTENSION_SOURCE = String.raw`/**
 * n8n one-off task: report_progress tool.
 *
 * Self-contained on purpose: pi loads this file with jiti inside the sandbox,
 * where the n8n workspace does not exist. Do not add imports beyond node
 * built-ins and the modules pi bundles for extensions.
 */
import { Type } from 'typebox';

// Minimal structural slice of pi's extension API — local because this file
// cannot import n8n workspace types.
interface ToolContext {
	cwd: string;
}
interface ToolTextContent {
	type: 'text';
	text: string;
}
interface ToolResult {
	content: ToolTextContent[];
	details: unknown;
	terminate?: boolean;
}
interface ToolsExtensionApi {
	registerTool(tool: {
		name: string;
		label: string;
		description: string;
		parameters: unknown;
		execute(
			toolCallId: string,
			params: Record<string, unknown>,
			signal: AbortSignal | undefined,
			onUpdate: unknown,
			ctx: ToolContext,
		): Promise<ToolResult>;
	}): void;
}

export default function (pi: ToolsExtensionApi) {
	pi.registerTool({
		name: 'report_progress',
		label: 'Report progress',
		description:
			'Report a one-line, human-readable milestone to the user, e.g. "Creating the' +
			' spreadsheet..." or "Verifying the header row...". Call it when starting and when' +
			' finishing each meaningful step. The message must never contain credential values.' +
			' This does not replace report_result — it only keeps the user informed while you work.',
		parameters: Type.Object({
			message: Type.String({
				description: 'One short line describing the milestone, in user terms',
			}),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
			// Acknowledge only. The host reads the milestone from the
			// tool_execution_start event in the JSON stream, not from this result.
			const message = typeof params.message === 'string' ? params.message : '';
			return {
				content: [{ type: 'text', text: 'Progress noted: ' + message }],
				details: { message },
			};
		},
	});
}
`;
