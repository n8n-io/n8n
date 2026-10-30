import { cp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { simpleGit, type SimpleGit, type SimpleGitOptions } from 'simple-git';

export function createFixtureGit(baseDir?: string, options?: Partial<SimpleGitOptions>) {
	// Match the transport's environment so personal Git settings do not affect fixtures.
	return simpleGit(baseDir, {
		...options,
		config: ['core.autocrlf=false', ...(options?.config ?? [])],
	}).env({});
}

export type TestRemote = {
	bareDir: string;
	workingDir: string;
	git: SimpleGit;
};

export async function createGitRemoteSeed(
	root: string,
	initialCommit: 'readme' | 'empty' = 'readme',
): Promise<TestRemote> {
	const bareDir = path.join(root, 'remote.git');
	const workingDir = path.join(root, 'remote-working');
	await createFixtureGit().raw(['init', '--bare', '--initial-branch=main', bareDir]);
	await createFixtureGit().raw(['init', '--initial-branch=main', workingDir]);

	const git = createFixtureGit(workingDir);
	await git.addConfig('user.name', 'n8n test');
	await git.addConfig('user.email', 'n8n-test@example.com');
	if (initialCommit === 'readme') {
		await writeFile(path.join(workingDir, 'README.md'), '# n8n promotions test\n');
		await git.add(['README.md']);
	}
	await git.commit('Initial commit', initialCommit === 'empty' ? ['--allow-empty'] : []);
	await git.raw(['remote', 'add', 'origin', bareDir]);
	await git.raw(['push', '--set-upstream', 'origin', 'main']);

	return { bareDir, workingDir, git };
}

export async function copyGitRemote(seedRoot: string, root: string): Promise<TestRemote> {
	await cp(seedRoot, root, { recursive: true });
	const bareDir = path.join(root, 'remote.git');
	const workingDir = path.join(root, 'remote-working');
	const git = createFixtureGit(workingDir);
	await git.remote(['set-url', 'origin', bareDir]);

	return { bareDir, workingDir, git };
}
