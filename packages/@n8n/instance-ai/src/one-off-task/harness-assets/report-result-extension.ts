import { REPORT_PATH } from '../contracts';
import { REPORT_RUNTIME_SOURCE } from './report-runtime';

/**
 * `report_result` pi extension tool, written to
 * `.pi/extensions/n8n-report-result.ts`. Validates the report against a
 * literal copy of `harnessReportSchema` (kept in sync by
 * `harness-report-runtime.test.ts`), writes it to the task report path, and
 * returns `terminate: true` — pi's supported hint that the agent should stop
 * after the current tool batch (AgentToolResult.terminate,
 * @earendil-works/pi-agent-core@0.84.1 dist/types.d.ts:316-330).
 *
 * The parameter schema is a single flat object (not a union): top-level
 * unions serialize to anyOf, which some providers reject for tool inputs.
 * Per-status requirements are enforced by the validator, whose errors are
 * thrown back to the model so it can correct the report and call again.
 */
export const REPORT_RESULT_EXTENSION_SOURCE = String.raw`/**
 * n8n one-off task: report_result tool.
 *
 * Self-contained on purpose: pi loads this file with jiti inside the sandbox,
 * where the n8n workspace does not exist. Do not add imports beyond node
 * built-ins and the modules pi bundles for extensions.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { StringEnum } from '@earendil-works/pi-ai';
import { Type } from 'typebox';
${REPORT_RUNTIME_SOURCE}
// ── extension wiring ─────────────────────────────────────────────────────────

const REPORT_PATH = '${REPORT_PATH}';

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
		name: 'report_result',
		label: 'Report task result',
		description:
			'Record the final task report. Call this exactly once, as your very last action, on every' +
			' path. status "completed" requires summary, actions, verification (read-back evidence),' +
			' and artifacts. status "needs_credential" requires progressSummary and request (kind' +
			' "existing" with credentialName, or kind "new" with recipe). status "failed" requires' +
			' reason and actions. Never include credential values anywhere in the report.',
		parameters: Type.Object({
			status: StringEnum(['completed', 'needs_credential', 'failed'] as const, {
				description: 'Task outcome',
			}),
			summary: Type.Optional(
				Type.String({ description: 'completed: user-facing summary of what was done' }),
			),
			actions: Type.Optional(
				Type.Array(
					Type.Object({
						description: Type.String({
							description: 'One executed step, e.g. "POST sheets.googleapis.com/v4/spreadsheets"',
						}),
						service: Type.Optional(Type.String()),
					}),
					{ description: 'completed/failed: external calls that were executed' },
				),
			),
			verification: Type.Optional(
				Type.Array(
					Type.Object({
						check: Type.String({ description: 'What was read back' }),
						result: Type.String({ description: 'What was observed' }),
						passed: Type.Boolean(),
					}),
					{ description: 'completed: read-back verification evidence' },
				),
			),
			artifacts: Type.Optional(
				Type.Array(
					Type.Object({ label: Type.String(), url: Type.String() }),
					{ description: 'completed: links to created resources' },
				),
			),
			progressSummary: Type.Optional(
				Type.String({ description: 'needs_credential: what was done before pausing' }),
			),
			request: Type.Optional(
				Type.Object(
					{
						kind: StringEnum(['existing', 'new'] as const),
						credentialName: Type.Optional(
							Type.String({ description: 'kind "existing": name from the task credential catalog' }),
						),
						recipe: Type.Optional(
							Type.Object({
								serviceName: Type.String(),
								placeholders: Type.Array(
									Type.Object({
										name: Type.String(),
										title: Type.String(),
										info: Type.Optional(Type.String()),
									}),
								),
								docsUrl: Type.Optional(Type.String()),
								testUrl: Type.Optional(Type.String()),
							}),
						),
					},
					{ description: 'needs_credential: which credential to ask the user for' },
				),
			),
			reason: Type.Optional(Type.String({ description: 'failed: why the task could not finish' })),
		}),
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const validation = validateHarnessReport(params);
			if (!validation.ok) {
				// Throwing marks the tool result as an error, so the model corrects
				// the report and calls again instead of silently finishing.
				throw new Error('Invalid report: ' + validation.errors.join('; '));
			}
			const absoluteReportPath = path.join(ctx.cwd, REPORT_PATH);
			fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true });
			fs.writeFileSync(absoluteReportPath, JSON.stringify(validation.report, null, 2) + '\n', 'utf8');
			return {
				content: [
					{
						type: 'text',
						text:
							'Report recorded at ' +
							REPORT_PATH +
							'. The task is over — do not run any further tools and do not take any further actions.',
					},
				],
				details: { reportPath: REPORT_PATH, status: validation.report.status },
				terminate: true,
			};
		},
	});
}
`;
