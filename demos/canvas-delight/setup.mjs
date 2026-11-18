import { existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Shared Vue files extend this local config in a fresh checkout.
const link = new URL('../../node_modules/@n8n/typescript-config', import.meta.url);
if (!existsSync(link)) {
	mkdirSync(new URL('../../node_modules/@n8n', import.meta.url), { recursive: true });
	symlinkSync(
		fileURLToPath(new URL('../../packages/@n8n/typescript-config', import.meta.url)),
		fileURLToPath(link),
		'dir',
	);
}
