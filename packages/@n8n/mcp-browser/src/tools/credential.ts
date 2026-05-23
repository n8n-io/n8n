import { z } from 'zod';

import type { BrowserConnection } from '../connection';
import { createConnectedTool, pageIdField } from './helpers';
import { createRedactionMarkerFormatter } from '../redaction/redact';
import { analyzeHtmlSensitivity } from '../sensitivity/analyze-html';
import type {
	AffectedResource,
	CreateCredentialPayload,
	SecretsBuffer,
	ToolContext,
	ToolDefinition,
} from '../types';
import { formatCallToolResult } from '../utils';

export function createCredentialTools(connection: BrowserConnection): ToolDefinition[] {
	return [browserCaptureSecret(connection), browserCreateCredential(connection)];
}

const CREATE_CREDENTIAL_RESOURCE: AffectedResource = {
	toolGroup: 'browser',
	resource: 'credentials',
	description: 'Browser: credentials',
};

// ---------------------------------------------------------------------------
// browser_capture_secret
// ---------------------------------------------------------------------------

const browserCaptureSecretSchema = z
	.object({
		credentialsKey: z
			.string()
			.describe('Key grouping related fields for one credential (e.g. "gcp-setup")'),
		field: z.string().describe('Field name to store the captured value under (e.g. "clientId")'),
		pageId: pageIdField,
		element: z.union([
			z.object({
				ref: z.string().describe('Element ref from browser_snapshot whose value will be captured'),
			}),
			z.object({
				redactedKey: z
					.string()
					.describe(
						'Redacted secret ID as returned in the snapshots. Example "[REDACTED:password:1]"',
					),
			}),
		]),
	})
	.describe(
		'Capture a secret value from a DOM element into the session buffer. Call `browser_snapshot` with `{ "interactive": false }` before capturing to see secrets that are not inside interactive elements. ' +
			'Pass element as `{ "ref": "e12" }` for interactive elements, or `{ "redactedKey": "[REDACTED:password:1]" }` for non-interactive elements',
	);

function browserCaptureSecret(
	connection: BrowserConnection,
): ToolDefinition<typeof browserCaptureSecretSchema> {
	return createConnectedTool(
		connection,
		'browser_capture_secret',
		'Read a secret value from a DOM element (identified by a snapshot ref) and store it in the session buffer. The value is never returned to the LLM. Use browser_create_credential to assemble buffered secrets into a credential.',
		browserCaptureSecretSchema,
		async (state, args, pageId, context) => {
			requireSecretsBuffer(context);
			let value = '';
			if ('redactedKey' in args.element) {
				const { redactedKey } = args.element;
				const sensitivity = analyzeHtmlSensitivity(await state.adapter.probePageHtml(pageId));
				if (sensitivity.ok) {
					const formatMarker = createRedactionMarkerFormatter(sensitivity.hits);
					const markerMap = sensitivity.hits.reduce((result, hit) => {
						result.set(formatMarker(hit), hit.value);
						return result;
					}, new Map<string, string>());

					if (!markerMap.get(redactedKey)) {
						throw new Error(`The marker "${redactedKey}" was not found.`);
					}
					value = markerMap.get(redactedKey)!;
				} else {
					throw new Error(`Secret capturing failed with error: ${sensitivity.error}`);
				}
			} else {
				value = await state.adapter.getElementValue(pageId, { ref: args.element.ref });
			}
			context.secretsBuffer.capture(args.credentialsKey, args.field, value);
			return formatCallToolResult({ ok: true, fieldsCaptured: [args.field] });
		},
		undefined,
		{ skipEnrichment: true },
	);
}

// ---------------------------------------------------------------------------
// browser_create_credential
// ---------------------------------------------------------------------------

export const browserCreateCredentialSchema = z
	.object({
		credentialsKey: z
			.string()
			.describe('Key identifying the buffered secrets group to use (e.g. "gcp-setup")'),
		type: z.string().describe('n8n credential type (e.g. "anthropicApi", "googleApi")'),
		name: z.string().describe('Display name for the new credential'),
		data: z
			.record(z.unknown())
			.optional()
			.describe('Literal (non-secret) credential fields, may be nested'),
		resolveData: z
			.record(z.unknown())
			.optional()
			.describe(
				'Same nested shape as data, but leaf string values are field names from the captured buffer. All leaves must resolve.',
			),
		projectId: z.string().optional().describe('Project to create the credential in'),
		clear: z
			.boolean()
			.optional()
			.describe('Clear the session buffer for credentialsKey after success (default: true)'),
	})
	.describe('Assemble buffered secrets into an n8n credential');

function browserCreateCredential(
	_connection: BrowserConnection,
): ToolDefinition<typeof browserCreateCredentialSchema> {
	return {
		name: 'browser_create_credential',
		description:
			'Assemble secrets captured with browser_capture_secret into a new n8n credential. Literal fields go in `data`; fields that must come from the buffer go in `resolveData` (leaf values are buffer field names). The buffer is cleared after success unless clear=false.',
		inputSchema: browserCreateCredentialSchema,
		async execute(args, context: ToolContext) {
			requireSecretsBuffer(context);
			requireCreateCredential(context);

			const captured = context.secretsBuffer.getFields(args.credentialsKey);
			if (!captured) {
				throw new Error(
					`No captured fields found for credentialsKey "${args.credentialsKey}". Call browser_capture_secret first.`,
				);
			}

			const resolvedSecrets = args.resolveData ? resolveSecrets(args.resolveData, captured) : {};
			const mergedData = deepMerge(args.data ?? {}, resolvedSecrets);

			const credential = await context.createCredential({
				name: args.name,
				type: args.type,
				data: mergedData,
				projectId: args.projectId,
			} satisfies CreateCredentialPayload);

			if (args.clear !== false) {
				context.secretsBuffer.clear(args.credentialsKey);
			}

			return formatCallToolResult({ ok: true, credentialId: credential.credentialId });
		},
		getAffectedResources() {
			return [CREATE_CREDENTIAL_RESOURCE];
		},
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireSecretsBuffer(
	context: ToolContext,
): asserts context is ToolContext & { secretsBuffer: SecretsBuffer } {
	if (!context.secretsBuffer) {
		throw new Error('This tool is only available when running inside the n8n gateway context.');
	}
}

function requireCreateCredential(context: ToolContext): asserts context is ToolContext & {
	createCredential: (payload: CreateCredentialPayload) => Promise<{ credentialId: string }>;
} {
	if (!context.createCredential) {
		throw new Error('This tool is only available when running inside the n8n gateway context.');
	}
}

/**
 * Recursively walk `resolveData`. Every leaf string value is a field name to
 * look up in `captured`. Throws if a field name is not found.
 */
function resolveSecrets(
	resolveData: Record<string, unknown>,
	captured: Map<string, string>,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(resolveData)) {
		if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
			result[key] = resolveSecrets(value as Record<string, unknown>, captured);
		} else if (typeof value === 'string') {
			if (!captured.has(value)) {
				throw new Error(
					`resolveData references field "${value}" which was not captured. Call browser_capture_secret with field="${value}" first.`,
				);
			}
			result[key] = captured.get(value);
		} else {
			throw new Error(
				`resolveData leaf values must be strings (field names). Got ${typeof value} for key "${key}".`,
			);
		}
	}
	return result;
}

/** Deep merge two plain objects. Values from `override` win on collision. */
function deepMerge(
	base: Record<string, unknown>,
	override: Record<string, unknown>,
): Record<string, unknown> {
	const result: Record<string, unknown> = { ...base };
	for (const [key, overrideVal] of Object.entries(override)) {
		const baseVal = result[key];
		if (
			overrideVal !== null &&
			typeof overrideVal === 'object' &&
			!Array.isArray(overrideVal) &&
			baseVal !== null &&
			typeof baseVal === 'object' &&
			!Array.isArray(baseVal)
		) {
			result[key] = deepMerge(
				baseVal as Record<string, unknown>,
				overrideVal as Record<string, unknown>,
			);
		} else {
			result[key] = overrideVal;
		}
	}
	return result;
}
