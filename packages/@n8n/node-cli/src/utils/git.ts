import { execSync } from 'node:child_process';

import { runCommand } from './child-process';

type GitUser = {
	name?: string;
	email?: string;
};

export function tryReadGitUser(): GitUser {
	const user: GitUser = { name: '', email: '' };

	try {
		const name = execSync('git config --get user.name', {
			stdio: ['pipe', 'pipe', 'ignore'],
		})
			.toString()
			.trim();
		if (name) user.name = name;
	} catch {
		// ignore
	}

	try {
		const email = execSync('git config --get user.email', {
			stdio: ['pipe', 'pipe', 'ignore'],
		})
			.toString()
			.trim();
		if (email) user.email = email;
	} catch {
		// ignore
	}

	return user;
}

export async function initGit(dir: string): Promise<void> {
	await runCommand('git', ['init', '-b', 'main'], { cwd: dir });
}
