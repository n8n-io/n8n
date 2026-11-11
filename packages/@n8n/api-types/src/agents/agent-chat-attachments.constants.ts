/**
 * Data files that a user can attach in an agent chat for every model. The
 * model reads text files with read_binary_data, and tools and the sandbox take
 * the others by fileId. Images, PDF and audio depend on the model, so they are
 * not in this list.
 */
export const AGENT_CHAT_DATA_ATTACHMENT_ACCEPT = [
	'text/csv',
	'text/tab-separated-values',
	'text/plain',
	'text/markdown',
	'text/html',
	'application/json',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	// Browsers report some of these types differently, so accept the extensions too.
	'.csv',
	'.tsv',
	'.txt',
	'.md',
	'.markdown',
	'.html',
	'.json',
	'.xlsx',
	'.docx',
].join(',');

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
