import { Tool } from '@n8n/agents';
import { z } from 'zod';

/**
 * System-prompt directive: when the agent has binary content (an image it
 * generated, a file it produced, a downloaded asset), it should call this
 * tool to upload it to chat instead of pasting URLs or describing the file
 * in plain text.
 */
const SEND_FILES_INSTRUCTION_FRAGMENT =
	'When you have binary content to give the user — a generated image, a ' +
	'compiled report, a downloaded asset — call the send_files tool to upload ' +
	'it as a file attachment in chat. Provide either a publicly fetchable URL ' +
	'(`url`) or base64-encoded bytes (`dataBase64`); the tool downloads/decodes ' +
	'and uploads to the chat platform. Do not paste raw base64 or URLs as ' +
	'plain text when the user wants the file itself.';

const fileSchema = z.object({
	filename: z.string().describe('Filename including extension, e.g. "chart.png"'),
	mimeType: z
		.string()
		.optional()
		.describe(
			'IANA media type (e.g. image/png, application/pdf). Inferred from filename if omitted.',
		),
	url: z
		.string()
		.optional()
		.describe(
			'Public URL — the tool fetches the bytes. Use this for assets the agent already has links to.',
		),
	dataBase64: z
		.string()
		.optional()
		.describe(
			'Base64-encoded file bytes. Use this for binary content the agent has produced inline.',
		),
});

const inputSchema = z.object({
	files: z.array(fileSchema).min(1).describe('Files to upload to chat (at least one).'),
	message: z.string().optional().describe('Optional caption posted alongside the files.'),
});

const MIME_BY_EXTENSION: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	svg: 'image/svg+xml',
	pdf: 'application/pdf',
	csv: 'text/csv',
	json: 'application/json',
	txt: 'text/plain',
	md: 'text/markdown',
	mp3: 'audio/mpeg',
	mp4: 'video/mp4',
	wav: 'audio/wav',
	zip: 'application/zip',
};

function inferMimeType(filename: string): string {
	const ext = filename.split('.').pop()?.toLowerCase();
	return (ext && MIME_BY_EXTENSION[ext]) ?? 'application/octet-stream';
}

async function resolveBytes(file: z.infer<typeof fileSchema>): Promise<Buffer> {
	if (file.dataBase64) {
		return Buffer.from(file.dataBase64, 'base64');
	}
	if (file.url) {
		const response = await fetch(file.url);
		if (!response.ok) {
			throw new Error(`Failed to fetch ${file.url}: ${response.status} ${response.statusText}`);
		}
		const buf = await response.arrayBuffer();
		return Buffer.from(buf);
	}
	throw new Error(`File "${file.filename}" must specify either url or dataBase64`);
}

/**
 * Build the `send_files` tool. Display-only — never suspends. The handler
 * resolves each file's bytes (fetching URLs or decoding base64), then emits
 * a `tool-file-display` chunk via `ctx.sendFiles` for the integration layer
 * to upload to the chat platform.
 */
export function createSendFilesTool() {
	return new Tool('send_files')
		.description(
			'Upload one or more file attachments to the chat (images, documents, ' +
				'generated reports). Files arrive in chat as native attachments — ' +
				'rendered inline for images, downloadable for other types. ' +
				'Continues immediately; no user response is awaited.',
		)
		.systemInstruction(SEND_FILES_INSTRUCTION_FRAGMENT)
		.input(inputSchema)
		.handler(async (input, ctx) => {
			const resolved = await Promise.all(
				input.files.map(async (file) => ({
					data: await resolveBytes(file),
					filename: file.filename,
					mimeType: file.mimeType ?? inferMimeType(file.filename),
				})),
			);

			ctx.sendFiles(resolved, input.message);
			return { sent: resolved.length };
		});
}
