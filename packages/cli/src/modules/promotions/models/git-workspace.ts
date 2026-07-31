import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { SimpleGit } from 'simple-git';

/**
 * Stateless git access for the git-review model: every operation gets a fresh
 * shallow-lived clone in a temp dir that is removed afterwards. Slow but has
 * no lifecycle to manage — good enough for the POC. Use a bare repo path (or
 * any pushable remote) as repoUrl.
 */
export async function withRepo<T>(
	repoUrl: string,
	fn: (git: SimpleGit, dir: string) => Promise<T>,
): Promise<T> {
	const { simpleGit } = await import('simple-git');
	const dir = await mkdtemp(join(tmpdir(), 'n8n-promotion-'));
	try {
		await simpleGit().clone(repoUrl, dir);
		const git = simpleGit(dir);
		await git.addConfig('user.name', 'n8n-promotions');
		await git.addConfig('user.email', 'promotions@n8n.local');
		return await fn(git, dir);
	} finally {
		// Best-effort: host-level git templates/hooks can still be writing into
		// .git while we delete (ENOTEMPTY); a leaked temp dir must not fail an
		// operation that already succeeded.
		try {
			await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
		} catch {}
	}
}

export async function checkoutBranch(git: SimpleGit, branch: string): Promise<void> {
	const remoteBranches = await git.branch(['-r']);
	if (remoteBranches.all.includes(`origin/${branch}`)) {
		await git.checkout(branch);
	} else {
		await git.checkoutLocalBranch(branch);
	}
}
