import { isRecord } from '@n8n/utils/is-record';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';

const MAX_LOG_ERROR_LENGTH = 1_000;
const MAX_LOG_ERROR_INPUT_LENGTH = 8_000;
const MAX_LOG_ERROR_SANITIZE_INPUT_LENGTH = MAX_LOG_ERROR_INPUT_LENGTH + MAX_LOG_ERROR_LENGTH;
const URL_PATTERN = /\bhttps?:\/\/[^\s"'<>]+/gi;

function getStringProperty(value: unknown, keys: string[]): string | undefined {
	if (!isRecord(value)) return undefined;

	for (const key of keys) {
		const candidate = Reflect.get(value, key);
		if (typeof candidate === 'string' && candidate.trim() !== '') return candidate;
	}

	return undefined;
}

function getNumberProperty(value: unknown, keys: string[]): number | undefined {
	if (!isRecord(value)) return undefined;

	for (const key of keys) {
		const candidate = Reflect.get(value, key);
		if (typeof candidate === 'number') return candidate;
		if (typeof candidate === 'string') {
			const parsed = Number(candidate);
			if (Number.isFinite(parsed)) return parsed;
		}
	}

	return undefined;
}

function truncate(value: string, maxLength = MAX_LOG_ERROR_LENGTH): string {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength)}...`;
}

function sanitizeUrlForLog(value: string): string {
	try {
		const url = new URL(value);
		if (url.username) url.username = 'REDACTED';
		if (url.password) url.password = 'REDACTED';
		url.search = '';
		url.hash = '';
		return url.toString();
	} catch {
		return (value.split(/[?#]/, 1)[0] ?? value).replace(/\/\/[^/@\s]+@/, '//REDACTED@');
	}
}

function sanitizeForLog(value: string): string {
	return scrubSecretsInText(value.replace(URL_PATTERN, (url) => sanitizeUrlForLog(url)));
}

function takeSanitizedLogSample(value: string): string {
	const trimmed = value.trimStart();
	const sanitizable =
		trimmed.length > MAX_LOG_ERROR_SANITIZE_INPUT_LENGTH
			? trimmed.slice(0, MAX_LOG_ERROR_SANITIZE_INPUT_LENGTH)
			: trimmed;
	const sanitized = sanitizeForLog(sanitizable);
	const sample =
		sanitized.length > MAX_LOG_ERROR_INPUT_LENGTH
			? sanitized.slice(0, MAX_LOG_ERROR_INPUT_LENGTH)
			: sanitized;
	return sample.trimEnd();
}

function decodeBasicHtmlEntities(value: string): string {
	return value
		.replaceAll('&bull;', ' ')
		.replaceAll('&nbsp;', ' ')
		.replaceAll('&amp;', '&')
		.replaceAll('&lt;', '<')
		.replaceAll('&gt;', '>')
		.replaceAll('&quot;', '"')
		.replaceAll('&#39;', "'");
}

function htmlToText(value: string): string {
	return decodeBasicHtmlEntities(value)
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function extractHtmlTagText(value: string, tag: string): string | undefined {
	const match = value.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
	if (!match?.[1]) return undefined;
	const text = htmlToText(match[1]);
	return text || undefined;
}

function extractCloudflareRayId(value: string): string | undefined {
	return value.match(/Cloudflare Ray ID:\s*(?:<[^>]+>|\s)*([a-f0-9]+)/i)?.[1];
}

function extractCloudflareHost(value: string, text: string): string | undefined {
	const htmlMatch = value.match(/unable_to_access[^>]*>[^<]*<\/span>\s*([^<\s]+)/i);
	if (htmlMatch?.[1]) return htmlMatch[1];

	return text.match(/You are unable to access\s+([^\s]+)/i)?.[1];
}

function isHtmlResponse(value: string): boolean {
	return /<!doctype html|<html[\s>]/i.test(value);
}

function summarizeHtmlResponse(value: string): string {
	const text = htmlToText(value);
	const rayId = extractCloudflareRayId(value);
	const blockedHost = extractCloudflareHost(value, text);

	if (/cloudflare/i.test(text)) {
		return [
			`Cloudflare blocked an HTTP request${blockedHost ? ` to ${blockedHost}` : ''}`,
			rayId ? `Ray ID: ${rayId}` : undefined,
		]
			.filter(Boolean)
			.join('; ');
	}

	const title = extractHtmlTagText(value, 'title');
	const headline = extractHtmlTagText(value, 'h1');
	return [
		'Received an HTML error response',
		title ? `title: ${title}` : undefined,
		headline ? `headline: ${headline}` : undefined,
	]
		.filter(Boolean)
		.join('; ');
}

function appendHttpContext(message: string, error: unknown): string {
	const statusCode = getNumberProperty(error, ['statusCode', 'status', 'statusCodeNumber']);
	const rawUrl = getStringProperty(error, ['url', 'requestUrl', 'endpoint']);
	const url = rawUrl ? sanitizeUrlForLog(rawUrl) : undefined;
	const context = [
		statusCode !== undefined ? `status: ${statusCode}` : undefined,
		url ? `url: ${url}` : undefined,
	].filter(Boolean);

	const safeMessage = sanitizeForLog(message);
	if (context.length === 0) return safeMessage;
	return `${safeMessage}; ${context.join('; ')}`;
}

export function formatErrorForLog(error: unknown): string {
	const message =
		getStringProperty(error, ['responseBody', 'body', 'data']) ??
		(error instanceof Error ? error.message : String(error));
	const sample = takeSanitizedLogSample(message);

	if (isHtmlResponse(sample)) {
		return appendHttpContext(truncate(summarizeHtmlResponse(sample)), error);
	}

	return appendHttpContext(truncate(sample), error);
}
