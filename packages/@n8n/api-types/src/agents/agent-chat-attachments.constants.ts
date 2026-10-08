/**
 * Product Agents chat picker. Images, PDF, and audio still hydrate to the
 * model when the provider supports them. The rest persist as Session Files
 * for sandbox code. Zip, video, and executables stay out.
 */
export const AGENT_CHAT_ATTACHMENT_ACCEPT_TYPES = [
	'image/*',
	'audio/*',
	'text/csv',
	'application/csv',
	'application/vnd.ms-excel',
	'text/tab-separated-values',
	'application/json',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	'text/plain',
	'text/markdown',
	'text/x-markdown',
	'text/html',
	'application/xhtml+xml',
	'application/pdf',
	'.csv',
	'.tsv',
	'.json',
	'.txt',
	'.md',
	'.markdown',
	'.html',
	'.pdf',
	'.docx',
	'.xlsx',
] as const;

export const AGENT_CHAT_ATTACHMENT_ACCEPT = AGENT_CHAT_ATTACHMENT_ACCEPT_TYPES.join(',');

export const MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB = 10;
export const MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES = MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB * 1024 * 1024;
/**
 * Base64 inflates by 4/3 (in whole 4-char blocks), so this is the longest
 * encoding of a payload at the byte limit; the byte-accurate check happens
 * after decoding.
 */
export const MAX_AGENT_CHAT_ATTACHMENT_BASE64_LENGTH =
	Math.ceil(MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES / 3) * 4;
export const MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE = 10;
// Matches the agent_chat_attachments.fileName varchar(255) column.
export const MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH = 255;
export const MAX_AGENT_CHAT_ATTACHMENT_MIMETYPE_LENGTH = 100;
/** 1.5 GiB persist cap for all Attachments on one Session. */
export const MAX_SESSION_ATTACHMENT_PERSIST_BYTES = 1.5 * 1024 * 1024 * 1024;
