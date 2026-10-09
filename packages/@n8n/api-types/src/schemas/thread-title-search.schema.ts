import { z } from 'zod';

/**
 * Case-insensitive thread title search term, shared by n8n Assistant's thread
 * history query and the cross-agent n8n Chat thread list.
 * Postgres rejects NUL bytes in text parameters, so reject them here as a 400.
 */
export const threadTitleSearchSchema = z
	.string()
	.trim()
	.max(500)
	.refine((value) => !value.includes('\u0000'))
	.optional();
