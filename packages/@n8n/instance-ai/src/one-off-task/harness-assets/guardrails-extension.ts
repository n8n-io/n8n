import { SECRETS_MANIFEST_PATH } from '../contracts';
import { GUARDRAILS_RUNTIME_SOURCE } from './guardrails-runtime';
import { MANIFEST_RUNTIME_SOURCE } from './manifest-runtime';

/**
 * Guardrails pi extension, written to `.pi/extensions/n8n-guardrails.ts`.
 *
 * Two hooks (pi extension API, verified against
 * @earendil-works/pi-coding-agent@0.84.1 dist/core/extensions/types.d.ts):
 * - `tool_call` (types.d.ts:896) blocks obvious env-dumping bash commands via
 *   `{ block, reason }` (ToolCallEventResult, types.d.ts:778).
 * - `tool_result` (types.d.ts:897) redacts every secret value from tool
 *   output via a `{ content, details }` patch (ToolResultEventResult,
 *   types.d.ts:795).
 */
export const GUARDRAILS_EXTENSION_SOURCE = String.raw`/**
 * n8n one-off task guardrails.
 *
 * Self-contained on purpose: pi loads this file with jiti inside the sandbox,
 * where the n8n workspace does not exist. Do not add imports beyond node
 * built-ins and the modules pi bundles for extensions.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
${MANIFEST_RUNTIME_SOURCE}${GUARDRAILS_RUNTIME_SOURCE}
// ── extension wiring ─────────────────────────────────────────────────────────

const SECRETS_MANIFEST_PATH = '${SECRETS_MANIFEST_PATH}';

// Minimal structural slices of pi's extension API — kept local because this
// file cannot import n8n workspace types, and importing pi's own types is
// unnecessary for these two hooks.
interface HookContext {
	cwd: string;
}
interface ToolCallEvent {
	toolName: string;
	input: Record<string, unknown>;
}
interface ToolCallBlock {
	block: boolean;
	reason: string;
}
interface ToolResultContentPart {
	type: string;
	text?: string;
}
interface ToolResultEvent {
	toolName: string;
	content: ToolResultContentPart[];
	details: unknown;
}
interface ToolResultPatch {
	content?: ToolResultContentPart[];
	details?: unknown;
}
interface GuardrailsExtensionApi {
	on(
		event: 'tool_call',
		handler: (event: ToolCallEvent, ctx: HookContext) => ToolCallBlock | undefined,
	): void;
	on(
		event: 'tool_result',
		handler: (event: ToolResultEvent, ctx: HookContext) => ToolResultPatch | undefined,
	): void;
}

// Read fresh on every hook: the manifest is tiny, and the host may rewrite it
// between relaunches when new credentials are approved.
function readManifest(cwd: string) {
	try {
		return parseSecretsManifest(fs.readFileSync(path.join(cwd, SECRETS_MANIFEST_PATH), 'utf8'));
	} catch {
		return null;
	}
}

export default function (pi: GuardrailsExtensionApi) {
	pi.on('tool_call', (event, ctx) => {
		if (event.toolName !== 'bash') return undefined;
		const command = typeof event.input.command === 'string' ? event.input.command : '';
		const manifest = readManifest(ctx.cwd);
		const envVars = manifest === null ? [] : manifest.secrets.map((secret) => secret.envVar);
		const reason = findEnvDumpBlockReason(command, envVars);
		return reason === null ? undefined : { block: true, reason };
	});

	pi.on('tool_result', (event, ctx) => {
		const secrets = collectSecretValues(readManifest(ctx.cwd), process.env);
		if (secrets.length === 0) return undefined;
		let changed = false;
		const content = event.content.map((part) => {
			if (part.type === 'text' && typeof part.text === 'string') {
				const redactedText = redactSecrets(part.text, secrets);
				if (redactedText !== part.text) {
					changed = true;
					return { ...part, text: redactedText };
				}
			}
			return part;
		});
		let details = event.details;
		if (details !== undefined && details !== null) {
			try {
				const serialized = JSON.stringify(details);
				if (typeof serialized === 'string') {
					const redactedSerialized = redactSecrets(serialized, secrets);
					if (redactedSerialized !== serialized) {
						details = JSON.parse(redactedSerialized);
						changed = true;
					}
				}
			} catch {
				// Details that cannot be scanned are replaced wholesale: better to
				// lose diagnostics than to let a secret through unscanned.
				details = { redactedByGuardrails: true };
				changed = true;
			}
		}
		if (!changed) return undefined;
		return { content, details };
	});
}
`;
