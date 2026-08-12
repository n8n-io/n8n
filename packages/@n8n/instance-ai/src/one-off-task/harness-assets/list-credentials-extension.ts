import { SECRETS_MANIFEST_PATH } from '../contracts';
import { MANIFEST_RUNTIME_SOURCE } from './manifest-runtime';

/**
 * `list_credentials` pi extension tool, written to
 * `.pi/extensions/n8n-list-credentials.ts`. Returns env var names and labels
 * from the secrets manifest — names only, never values — so the model checks
 * availability through a tool call instead of poking at the environment.
 *
 * Registered via `pi.registerTool()` (pi extension API, verified against
 * @earendil-works/pi-coding-agent@0.84.1 dist/core/extensions/types.d.ts:901;
 * `typebox` is bundled for extensions by pi's loader,
 * dist/core/extensions/loader.js:33).
 */
export const LIST_CREDENTIALS_EXTENSION_SOURCE = String.raw`/**
 * n8n one-off task: list_credentials tool.
 *
 * Self-contained on purpose: pi loads this file with jiti inside the sandbox,
 * where the n8n workspace does not exist. Do not add imports beyond node
 * built-ins and the modules pi bundles for extensions.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Type } from 'typebox';
${MANIFEST_RUNTIME_SOURCE}
// ── extension wiring ─────────────────────────────────────────────────────────

const SECRETS_MANIFEST_PATH = '${SECRETS_MANIFEST_PATH}';

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
		name: 'list_credentials',
		label: 'List credentials',
		description:
			'List the credentials available to this task: environment variable names and human labels' +
			' only — values are never shown. Read a value in code via process.env.NAME at the point of' +
			' use. Use this instead of inspecting the environment.',
		parameters: Type.Object({}),
		async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
			let manifest = null;
			try {
				manifest = parseSecretsManifest(
					fs.readFileSync(path.join(ctx.cwd, SECRETS_MANIFEST_PATH), 'utf8'),
				);
			} catch {
				manifest = null;
			}
			if (manifest === null || manifest.secrets.length === 0) {
				return {
					content: [
						{
							type: 'text',
							text:
								'No credentials are injected into this task. If the task needs one, call' +
								' report_result with status "needs_credential".',
						},
					],
					details: { credentials: [] },
				};
			}
			const credentials = manifest.secrets.map((secret) => {
				const value = process.env[secret.envVar];
				return {
					envVar: secret.envVar,
					label: secret.label,
					present: typeof value === 'string' && value.length > 0,
				};
			});
			const lines = credentials.map(
				(credential) =>
					'- ' +
					credential.label +
					': environment variable ' +
					credential.envVar +
					(credential.present
						? ''
						: ' (not present in the environment — request it via report_result)'),
			);
			return {
				content: [
					{
						type: 'text',
						text:
							'Available credentials (names only — values are never shown):\n' + lines.join('\n'),
					},
				],
				details: { credentials },
			};
		},
	});
}
`;
