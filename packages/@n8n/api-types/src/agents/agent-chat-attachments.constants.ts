export const MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB = 10;
export const MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES = MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB * 1024 * 1024;
/**
 * Base64 inflates by 4/3, so ~14M characters keep the decoded payload within
 * the 10 MB limit (mirrors the instance-ai attachment schema cap).
 */
export const MAX_AGENT_CHAT_ATTACHMENT_BASE64_LENGTH = 14_000_000;
export const MAX_AGENT_CHAT_ATTACHMENTS_PER_MESSAGE = 10;
export const MAX_AGENT_CHAT_ATTACHMENT_FILENAME_LENGTH = 300;
export const MAX_AGENT_CHAT_ATTACHMENT_MIMETYPE_LENGTH = 100;
