import { log } from '@clack/prompts';
import { spawn } from 'node:child_process';
import pico from 'picocolors';

type PackageManager = 'npm' | 'yarn' | 'pnpm';

export function detectPackageManager(): PackageManager | null {
	if ('npm_config_user_agent' in process.env) {
		const ua = process.env['npm_config_user_agent'] ?? '';
		if (ua.includes('pnpm')) return 'pnpm';
		if (ua.includes('yarn')) return 'yarn';
		if (ua.includes('npm')) return 'npm';
	}

	return null;
}

export async function installDependencies({
	dir,
	packageManager,
}: { dir: string; packageManager: PackageManager }): Promise<void> {
	return await new Promise((resolve, reject) => {
		const child = spawn(packageManager, ['install'], {
			cwd: dir,
			stdio: ['ignore', 'pipe', 'pipe'],
			shell: true,
		});

		const output: Buffer[] = [];

		child.stdout.on('data', (chunk: Buffer) => output.push(chunk));
		child.stderr.on('data', (chunk: Buffer) => output.push(chunk));

		child.on('close', (code) => {
			if (code === 0) {
				resolve();
			} else {
				const error = new Error(`${packageManager} install exited with code ${code}`);
				log.error(`${pico.bold(pico.red(error.message))}
${output.map((item) => item.toString()).join('\n')}`);
				reject(error);
			}
		});
	});
}
