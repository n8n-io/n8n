import { log } from '@clack/prompts';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import pico from 'picocolors';

type PackageManager = 'npm' | 'yarn' | 'pnpm';

export async function folderExists(dir: string) {
	try {
		const stat = await fs.stat(dir);
		return stat.isDirectory();
	} catch (error: unknown) {
		return false;
	}
}

export async function copyFolder({
	source: source,
	destination,
	ignore = [],
}: { source: string; destination: string; ignore?: string[] }): Promise<void> {
	const ignoreSet = new Set(ignore);

	async function walkAndCopy(currentSrc: string, currentDest: string): Promise<void> {
		const entries = await fs.readdir(currentSrc, { withFileTypes: true });

		await Promise.all(
			entries.map(async (entry) => {
				if (ignoreSet.has(entry.name)) return;

				const srcPath = path.join(currentSrc, entry.name);
				const destPath = path.join(currentDest, entry.name);

				if (entry.isDirectory()) {
					await fs.mkdir(destPath, { recursive: true });
					await walkAndCopy(srcPath, destPath);
				} else {
					await fs.copyFile(srcPath, destPath);
				}
			}),
		);
	}

	await fs.mkdir(destination, { recursive: true });
	await walkAndCopy(source, destination);
}

export async function delayAtLeast<T>(promise: Promise<T>, minMs: number): Promise<T> {
	const delayPromise = new Promise((res) => setTimeout(res, minMs));
	const [result] = await Promise.all([promise, delayPromise]);
	return result;
}

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

		child.stdout.on('data', (chunk) => output.push(chunk));
		child.stderr.on('data', (chunk) => output.push(chunk));

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
