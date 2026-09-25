import { isRecord } from '@n8n/utils/is-record';
import { createHmac } from 'crypto';

import { INTEGRATION_ERROR_CODES, type IntegrationErrorCode } from './integration-error-codes';
import type { IntegrationActionResult } from './integration-tool-types';

export type IntegrationErrorResponse = Extract<IntegrationActionResult, { ok: false }>;

export function integrationError(
	code: IntegrationErrorCode,
	message: string,
): IntegrationErrorResponse {
	return { ok: false, error: { code, message } };
}

export function rateLimitExceeded(message: string): IntegrationErrorResponse {
	return integrationError(INTEGRATION_ERROR_CODES.RATE_LIMIT_EXCEEDED, message);
}

export function connectionUnavailable(): IntegrationErrorResponse {
	return integrationError(
		INTEGRATION_ERROR_CODES.CONNECTION_NOT_AVAILABLE,
		'The integration connection is not currently available.',
	);
}

export function unsupportedQuery(platform: string, query: string): IntegrationErrorResponse {
	return integrationError(
		INTEGRATION_ERROR_CODES.UNSUPPORTED_QUERY,
		`The active ${platform} connection does not support ${query}.`,
	);
}

export function unsupportedAction(platform: string, action: string): IntegrationErrorResponse {
	return integrationError(
		INTEGRATION_ERROR_CODES.UNSUPPORTED_ACTION,
		`The active ${platform} connection does not support ${action}.`,
	);
}

export function normalizePlatformId(platform: string, id: string): string {
	return id.includes(':') ? id : `${platform}:${id}`;
}

export function stringValue(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function stringProperty(value: unknown, key: string): string | undefined {
	if (!isRecord(value)) return undefined;
	return stringValue(value[key]);
}

export function numberProperty(value: unknown, key: string): number | undefined {
	if (!isRecord(value)) return undefined;
	const property = value[key];
	return typeof property === 'number' ? property : undefined;
}

export function booleanProperty(value: unknown, key: string): boolean | undefined {
	if (!isRecord(value)) return undefined;
	const property = value[key];
	return typeof property === 'boolean' ? property : undefined;
}

export function isoDateProperty(value: unknown, key: string): string | undefined {
	if (!isRecord(value)) return undefined;
	const property = value[key];
	if (property instanceof Date) return property.toISOString();
	if (typeof property !== 'string' || property.length === 0) return undefined;
	const date = new Date(property);
	return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function removeUndefinedValues<T extends Record<string, unknown>>(
	value: T,
): Record<string, unknown> {
	return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

export function isDefined<T>(value: T | undefined): value is T {
	return value !== undefined;
}

/**
 * Meta requires pasting this token by hand into the webhook config, so it must
 * be shown before a credential exists — derived from `agentId` alone, not `credentialId`.
 */
export function deriveWhatsAppVerifyToken(encryptionKey: string, agentId: string): string {
	return createHmac('sha256', encryptionKey).update(`whatsapp:verify:${agentId}`).digest('hex');
}

export function hasUpdateIssueField(input: {
	issueId: string;
	teamId?: string | null;
	title?: string;
	description?: string | null;
	assigneeId?: string | null;
	projectId?: string | null;
	labelIds?: string[];
	priority?: number | null;
	stateId?: string | null;
	parentId?: string | null;
}): boolean {
	return (
		input.teamId !== undefined ||
		input.title !== undefined ||
		input.description !== undefined ||
		input.assigneeId !== undefined ||
		input.projectId !== undefined ||
		input.labelIds !== undefined ||
		input.priority !== undefined ||
		input.stateId !== undefined ||
		input.parentId !== undefined
	);
}

/**
 * Zero-width joiner and the variation selectors are formatting characters that
 * hold an emoji sequence together, so removing them breaks the glyph. Checked
 * by code point rather than a character class, which cannot hold a combining
 * character without becoming misleading.
 */
function isEmojiGlue(character: string): boolean {
	const point = character.codePointAt(0) ?? 0;
	return point === 0x200d || (point >= 0xfe00 && point <= 0xfe0f);
}

/** Whitespace that is also a control character, so it becomes a space first. */
const WHITESPACE_CONTROLS = /[\t\n\v\f\r\u0085\u2028\u2029]/gu;

const FORMATTING = /[\p{Cc}\p{Cf}]/gu;

const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * Reduces a user-chosen name to something safe to put in a vendor app listing:
 * no stray control characters, no runs of whitespace, and within the vendor's
 * length cap.
 *
 * Accented and non-Latin names survive. Slack keeps its own stricter rule,
 * because Slack's app names are restricted where Teams' are not.
 *
 * `maxLength` counts code points, which is what a JSON Schema `maxLength`
 * counts, but the cut lands on a grapheme boundary, so a flag or a joined emoji
 * is never left half-written.
 */
export function sanitiseAppName(raw: string, maxLength: number, fallback: string): string {
	const cleaned = raw
		.replace(WHITESPACE_CONTROLS, ' ')
		.replace(FORMATTING, (character) => (isEmojiGlue(character) ? character : ''))
		.replace(/\s+/g, ' ')
		.trim();

	const out = truncateToCodePoints(cleaned, maxLength);
	return out.length > 0 ? out : fallback;
}

/**
 * Cuts to a budget of `max` code points -- what a JSON Schema `maxLength`
 * counts -- but only on a grapheme boundary, so a flag or a joined emoji is
 * never left half-written.
 *
 * Every cap on a vendor field goes through here. Capping twice with two rules
 * is how a value that one step kept whole gets halved by the next.
 */
export function truncateToCodePoints(value: string, max: number): string {
	if (Array.from(value).length <= max) return value.trim();

	let out = '';
	let points = 0;
	for (const { segment } of GRAPHEMES.segment(value)) {
		const size = Array.from(segment).length;
		if (points + size > max) break;
		out += segment;
		points += size;
	}
	return out.trim();
}
