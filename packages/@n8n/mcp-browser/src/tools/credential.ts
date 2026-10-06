import { z } from 'zod';

import type { BrowserConnection } from '../connection';
import { createConnectedTool, pageIdField } from './helpers';
import {
	captureSpanOf,
	containsRedactionMarker,
	createRedactionMarkerFormatter,
} from '../redaction/redact';
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

/** Display/approval id reported by `browser_create_credential`. Not a hostname. */
const BROWSER_CREDENTIALS_RESOURCE = 'credentials';

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
					const byMarker = new Map(sensitivity.hits.map((hit) => [formatMarker(hit), hit]));

					const hit = byMarker.get(redactedKey);
					if (!hit) {
						throw new Error(`The marker "${redactedKey}" was not found.`);
					}
					// Better to send the agent back for a fresh snapshot than to store a
					// value that may be a fragment of the real one.
					if (hit.captureBlocked) {
						throw new Error(
							`"${redactedKey}" cannot be captured because ${hit.captureBlocked}. Take a fresh snapshot and capture the element that holds the value.`,
						);
					}
					value = captureSpanOf(hit);
				} else {
					throw new Error(`Secret capturing failed with error: ${sensitivity.error}`);
				}
			} else {
				value = await state.adapter.getElementValue(pageId, { ref: args.element.ref });
			}
			// Both would only fail once the provider is called.
			if (!value) {
				throw new Error(
					`The element for "${args.field}" holds no value. Take a fresh snapshot and capture the element that shows the secret.`,
				);
			}
			if (containsRedactionMarker(value)) {
				throw new Error(
					`The value read for "${args.field}" is a redaction marker, not a secret. Take a fresh snapshot and capture the element that holds the value.`,
				);
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
				'Same nested shape as data, but each leaf names a captured field. A leaf is either the ' +
					'field name ("apiKey"), or { "field": "apiKey", "prefix": "Bearer " } when the ' +
					'credential needs an auth scheme word before the secret. A prefix is one word and a ' +
					"space, nothing else. Leaves may only fill the credential type's secret fields.",
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
			'Assemble secrets captured with browser_capture_secret into a new n8n credential. Literal fields go in `data`; fields that must come from the buffer go in `resolveData` (leaf values are buffer field names, or { field, prefix } to put an auth scheme word such as "Bearer " before the secret). Captured secrets can only fill the credential type\'s secret fields. The buffer is cleared after success unless clear=false.',
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

			if (args.resolveData && context.getSecretFields) {
				assertSecretsFillSecretFields(
					args.type,
					args.resolveData,
					await context.getSecretFields(args.type),
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
		getAffectedResources(args): AffectedResource[] {
			// The confirmation card shows this description, so name the credential being
			// created rather than the tool doing it.
			return [
				{
					toolGroup: 'browser',
					kind: 'credential-write',
					resource: BROWSER_CREDENTIALS_RESOURCE,
					description: `Create credential "${args.name}" (${args.type})${describeSecretMapping(args.resolveData)}`,
				},
			];
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
 * A `resolveData` leaf with an auth scheme word before the secret, e.g.
 * `{ field: "apiKey", prefix: "Bearer " }`. The harness adds the prefix, so the agent never
 * has to build a secret's final form on the page.
 */
interface PrefixedSecret {
	field: string;
	prefix: string;
}

/**
 * One word and one space: "Bearer ", "Token ", "Bot ". No ":", "/", "@" or ".", so a prefix
 * cannot carry a URL, a host or other data. It can only label the secret.
 */
const SECRET_PREFIX = /^[A-Za-z][A-Za-z0-9-]{0,19} $/;

function isPrefixedSecret(value: unknown): value is PrefixedSecret {
	return (
		value !== null &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		typeof (value as PrefixedSecret).field === 'string' &&
		typeof (value as PrefixedSecret).prefix === 'string' &&
		Object.keys(value).length === 2
	);
}

/**
 * Every leaf of `resolveData` with its path, e.g. `{ a: { b: 'x' } }` gives `a.b`. A
 * prefixed secret is a leaf, not a nested object.
 */
function resolveLeaves(
	value: Record<string, unknown>,
	path = '',
): Array<{ path: string; leaf: unknown }> {
	return Object.entries(value).flatMap(([key, child]) =>
		child !== null && typeof child === 'object' && !Array.isArray(child) && !isPrefixedSecret(child)
			? resolveLeaves(child as Record<string, unknown>, `${path}${key}.`)
			: [{ path: `${path}${key}`, leaf: child }],
	);
}

/** For the approval card: which secret goes where, masked, e.g. ` · value ← Bearer ••••`. */
function describeSecretMapping(resolveData: Record<string, unknown> | undefined): string {
	if (!resolveData) return '';
	const parts = resolveLeaves(resolveData).map(({ path, leaf }) =>
		isPrefixedSecret(leaf) ? `${path} ← ${leaf.prefix}••••` : `${path} ← ••••`,
	);
	return parts.length > 0 ? ` · ${parts.join(', ')}` : '';
}

/**
 * A captured secret may only fill one of the credential type's secret fields, as captured.
 * It cannot go into a host, URL or any other plain field, where a workflow using the
 * credential could send it somewhere else. Formatting such as a "Bearer " prefix belongs to
 * the credential type, not to the agent.
 */
function assertSecretsFillSecretFields(
	credentialType: string,
	resolveData: Record<string, unknown>,
	secretFields: string[],
): void {
	const allowed = new Set(secretFields);
	const misplaced = resolveLeaves(resolveData)
		.map(({ path }) => path)
		.filter((path) => !allowed.has(path));
	if (misplaced.length === 0) return;
	throw new Error(
		`Captured secrets can only fill the secret fields of "${credentialType}" ` +
			`(${secretFields.join(', ') || 'it has none'}), not ${misplaced.map((p) => `"${p}"`).join(', ')}. ` +
			'Pick a credential type whose secret field takes the value as the page shows it, or add an ' +
			'auth scheme with { field, prefix }. Never build a secret on the page.',
	);
}

/**
 * Recursively walk `resolveData`. Every leaf is a field name to look up in `captured`, or a
 * `{ field, prefix }` whose checked prefix goes before the secret. Throws if a field name is
 * not found or a prefix is not one word and a space.
 */
function resolveSecrets(
	resolveData: Record<string, unknown>,
	captured: Map<string, string>,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(resolveData)) {
		if (isPrefixedSecret(value)) {
			if (!SECRET_PREFIX.test(value.prefix)) {
				throw new Error(
					`Prefix "${value.prefix}" for "${key}" is not allowed. A prefix is one word and a space, ` +
						'for example "Bearer " or "Token ".',
				);
			}
			const secret = captured.get(value.field);
			if (secret === undefined) {
				throw new Error(
					`resolveData references field "${value.field}" which was not captured. Call browser_capture_secret with field="${value.field}" first.`,
				);
			}
			result[key] = `${value.prefix}${secret}`;
		} else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
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
				`resolveData leaves must be field names or { field, prefix }. Got ${typeof value} for key "${key}".`,
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
