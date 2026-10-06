import { z } from 'zod';

const textContentPartSchema = z.object({ type: z.literal('text'), text: z.string() });

function extractTextFromParts(parts: unknown[]): string {
	return parts
		.flatMap((p) => {
			const parsed = textContentPartSchema.safeParse(p);
			return parsed.success ? [parsed.data.text] : [];
		})
		.join('');
}

/** Concatenated text blocks of a stored message's content. Used by the
 *  conversation-history service, which reads persisted message rows. */
export function extractTextFromContent(content: unknown): string {
	if (typeof content === 'string') return content;
	if (Array.isArray(content)) return extractTextFromParts(content);
	return '';
}
