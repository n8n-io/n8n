import fs from 'node:fs/promises';

type PackageManager = 'npm' | 'yarn' | 'pnpm';

export function detectPackageManagerFromUserAgent(): PackageManager | null {
	if ('npm_config_user_agent' in process.env) {
		const ua = process.env['npm_config_user_agent'] ?? '';
		if (ua.includes('pnpm')) return 'pnpm';
		if (ua.includes('yarn')) return 'yarn';
		if (ua.includes('npm')) return 'npm';
	}
	return null;
}

async function detectPackageManagerFromLockFiles(): Promise<PackageManager | null> {
	const lockFiles: Record<PackageManager, string> = {
		npm: 'package-lock.json',
		yarn: 'yarn.lock',
		pnpm: 'pnpm-lock.yaml',
	};

	for (const [pm, lockFile] of Object.entries(lockFiles)) {
		try {
			const stats = await fs.stat(lockFile);
			if (stats.isFile()) {
				return pm as PackageManager;
			}
		} catch (e) {
			// File does not exist
		}
	}
	return null;
}

export async function detectPackageManager(): Promise<PackageManager | null> {
	// When used via package.json scripts or `npm/yarn/pnpm create`, we can detect the package manager via the user agent
	const fromUserAgent = detectPackageManagerFromUserAgent();
	if (fromUserAgent) return fromUserAgent;

	// When used directly via `n8n-node` CLI, we can try to detect the package manager via the lock files
	const fromLockFiles = await detectPackageManagerFromLockFiles();
	if (fromLockFiles) return fromLockFiles;

	return null;
}
