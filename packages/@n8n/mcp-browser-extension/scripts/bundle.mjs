import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const output = 'n8n-browser-use.zip';

// Remove old zip if exists
rmSync(resolve(root, output), { force: true });

// Create zip from inside dist/ so the zip contains a complete unpacked extension at the root level
execSync(`zip -r ../${output} . -x "*.map"`, {
	cwd: resolve(root, 'dist'),
	stdio: 'inherit',
});
