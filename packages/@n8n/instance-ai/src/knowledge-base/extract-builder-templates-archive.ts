import { gunzipSync } from 'node:zlib';

const TAR_BLOCK_SIZE = 512;
const TAR_TYPE_REGULAR = '0';
const TEMPLATE_ENTRY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.ts$/;

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function isAllowedTemplateEntryName(name: string): boolean {
	if (name === 'index.json' || name === 'index.txt') return true;
	return TEMPLATE_ENTRY_PATTERN.test(name);
}

function isZeroBlock(block: Buffer): boolean {
	return block.every((byte) => byte === 0);
}

function readTarString(block: Buffer, start: number, length: number): string {
	const field = block.subarray(start, start + length);
	const nullIndex = field.indexOf(0);
	return field.subarray(0, nullIndex === -1 ? field.length : nullIndex).toString('utf-8');
}

function parseTarOctal(block: Buffer, start: number, length: number): number | null {
	const raw = readTarString(block, start, length).trim();
	if (!/^[0-7]+$/.test(raw)) return null;
	const parsed = Number.parseInt(raw, 8);
	return Number.isSafeInteger(parsed) ? parsed : null;
}

type TarWalkResult = { ok: true; entries: Map<string, string> } | { ok: false; error: string };

function walkBuilderTemplatesTar(tar: Buffer, collectContent: boolean): TarWalkResult {
	const entries = new Map<string, string>();
	let offset = 0;

	while (offset + TAR_BLOCK_SIZE <= tar.length) {
		const header = tar.subarray(offset, offset + TAR_BLOCK_SIZE);
		if (isZeroBlock(header)) return { ok: true, entries };

		const name = readTarString(header, 0, 100);
		const prefix = readTarString(header, 345, 155);
		const entryName = prefix ? `${prefix}/${name}` : name;
		const typeFlag = readTarString(header, 156, 1);
		const size = parseTarOctal(header, 124, 12);

		if (size === null) {
			return { ok: false, error: `invalid size for archive entry "${entryName}"` };
		}
		if (typeFlag !== '' && typeFlag !== TAR_TYPE_REGULAR) {
			return {
				ok: false,
				error: `unsupported archive entry type "${typeFlag}" for "${entryName}"`,
			};
		}
		if (!isAllowedTemplateEntryName(entryName)) {
			return { ok: false, error: `unsupported archive entry path "${entryName}"` };
		}

		const dataStart = offset + TAR_BLOCK_SIZE;
		if (collectContent && size > 0) {
			entries.set(entryName, tar.subarray(dataStart, dataStart + size).toString('utf-8'));
		}

		const dataBlocks = Math.ceil(size / TAR_BLOCK_SIZE);
		offset += TAR_BLOCK_SIZE + dataBlocks * TAR_BLOCK_SIZE;
	}

	return offset === tar.length
		? { ok: true, entries }
		: { ok: false, error: 'trailing partial tar header' };
}

function gunzipArchive(archive: Buffer): { tar: Buffer } | { error: string } {
	try {
		return { tar: gunzipSync(archive) };
	} catch (error) {
		return { error: `failed to gunzip archive: ${getErrorMessage(error)}` };
	}
}

/**
 * Validate the exact archive shape published by n8n-sdk-templates: a gzip-wrapped tar
 * with only regular top-level files (`index.json` or CDN `index.txt`, and `<slug>.ts`).
 * The workspace never materializes `index.txt` — it is converted to `index.json`.
 */
export function validateBuilderTemplatesArchive(archive: Buffer): string | null {
	const gunzipped = gunzipArchive(archive);
	if ('error' in gunzipped) return gunzipped.error;

	const walked = walkBuilderTemplatesTar(gunzipped.tar, false);
	return walked.ok ? null : walked.error;
}

/**
 * Extract template files from a validated n8n-sdk-templates archive on the host.
 * Returns null when the archive is invalid.
 */
export function extractBuilderTemplatesArchive(archive: Buffer): Map<string, string> | null {
	const gunzipped = gunzipArchive(archive);
	if ('error' in gunzipped) return null;

	const walked = walkBuilderTemplatesTar(gunzipped.tar, true);
	return walked.ok ? walked.entries : null;
}
