import * as os from 'node:os';
import * as path from 'node:path';

import { handleHookInput } from './skill-sync';

async function readStdin() {
	const chunks: Buffer[] = [];
	for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
	return Buffer.concat(chunks).toString('utf8');
}

async function main() {
	try {
		const configDir = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude');
		const output = handleHookInput(JSON.parse(await readStdin()), configDir);
		if (output) process.stdout.write(JSON.stringify(output));
	} catch {}
	process.exitCode = 0;
}

void main();
