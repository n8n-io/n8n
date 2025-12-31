import { execSync } from 'child_process';

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
