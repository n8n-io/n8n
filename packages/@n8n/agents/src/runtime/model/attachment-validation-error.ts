import { errorChain } from '@n8n/utils/errors/error-chain';
import { isRecord } from '@n8n/utils/is-record';

const ATTACHMENT_ERROR_CODES = new Set([
	'invalid_image',
	'invalid_image_format',
	'invalid_base64_image',
	'image_too_large',
	'image_too_small',
	'image_parse_error',
	'invalid_image_mode',
	'image_file_too_large',
	'unsupported_image_media_type',
	'empty_image_file',
	'unsupported_file_type',
	'invalid_file_format',
	'file_too_large',
]);

const ATTACHMENT_ERROR_MESSAGES = [
	/\b(?:image|attachment|file)\b[^\n]{0,100}\btoo (?:large|small)\b/i,
	/\b(?:image|attachment|file)\b[^\n]{0,100}\bexceeds?\b[^\n]{0,60}\b(?:max|maximum|limit|allowed)\b/i,
	/\b(?:unsupported|invalid) image(?:[.!]|$| (?:format|type|data|encoding|media)\b)/i,
	/\b(?:unsupported|invalid) (?:attachment|file) (?:format|type|encoding)\b/i,
	/\b(?:cannot|could not|unable to|failed to) (?:decode|parse) (?:the )?(?:image|attachment|file)\b/i,
	/\b(?:image|attachment|file)\b[^\n]{0,60}\b(?:decoding|decode|parsing) (?:error|failed)\b/i,
	/\bunsupported (?:mime|media) type:\s*(?:image\/|audio\/|video\/|application\/pdf)/i,
	/\bimage\.source\.[^\n]{0,100}media_type:[^\n]{0,100}Input should be /i,
];

function errorDetails(error: unknown): Array<Readonly<Record<string, unknown>>> {
	return errorChain(error).flatMap((entry) =>
		[entry, entry.data]
			.filter(isRecord)
			.flatMap((detail) => (isRecord(detail.error) ? [detail, detail.error] : [detail])),
	);
}

export function isAttachmentValidationError(error: unknown): boolean {
	const details = errorDetails(error);
	const messages = details
		.flatMap((detail) => [detail.message, detail.code, detail.type, detail.status])
		.filter((value): value is string => typeof value === 'string');
	if (
		details.some((detail) => {
			const status = detail.statusCode ?? detail.code;
			return typeof status === 'number' && status >= 400 && ![400, 413, 415, 422].includes(status);
		}) ||
		messages.some((message) =>
			/(?:authenticat|unauthorized|forbidden|permission|rate.limit|content.policy|prohibited.content|safety|timeout|timed out|network|failed to download)/i.test(
				message,
			),
		)
	) {
		return false;
	}
	return (
		details.some(
			(detail) => typeof detail.code === 'string' && ATTACHMENT_ERROR_CODES.has(detail.code),
		) ||
		messages.some((message) => ATTACHMENT_ERROR_MESSAGES.some((pattern) => pattern.test(message)))
	);
}
