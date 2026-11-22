import { escapeXmlText } from '@n8n/utils/string/escape-xml';

export const MAX_ICON_BYTES = 256 * 1024;

const ICON_TYPES = ['image/png', 'image/svg+xml'];

export type IconFileResult =
	| { ok: true; dataUri: string }
	| { ok: false; reason: 'tooLarge' | 'wrongType' | 'unreadable' };

async function readAsDataUri(file: File): Promise<string> {
	return await new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () =>
			typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('read'));
		reader.onerror = () => reject(new Error('read'));
		reader.readAsDataURL(file);
	});
}

/** Checks the type and the size of an icon file, then reads it as a data URI. */
export async function readIconFile(file: File): Promise<IconFileResult> {
	if (!ICON_TYPES.includes(file.type)) return { ok: false, reason: 'wrongType' };
	if (file.size > MAX_ICON_BYTES) return { ok: false, reason: 'tooLarge' };
	try {
		return { ok: true, dataUri: await readAsDataUri(file) };
	} catch {
		return { ok: false, reason: 'unreadable' };
	}
}

/** The HTTP status of an error from the server, when it has one. */
export function serverStatus(error: unknown): number | undefined {
	if (typeof error === 'object' && error !== null && 'httpStatusCode' in error) {
		const status = error.httpStatusCode;
		return typeof status === 'number' ? status : undefined;
	}
	return undefined;
}

/** The server reason of a rejected icon, escaped because the toast renders HTML. */
export function escapedIconReason(error: unknown): string {
	// The reason can name an element such as <script>.
	return escapeXmlText(error instanceof Error ? error.message : '');
}
