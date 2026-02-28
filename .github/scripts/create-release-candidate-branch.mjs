import semver from 'semver';
import {
	ensureEnvVar,
	RELEASE_PREFIX,
	sh,
	stripReleasePrefixes,
	trySh,
	writeGithubOutput,
} from './github-helpers.mjs';

function remoteBranchExists(branch) {
	const res = trySh('git', ['ls-remote', '--heads', 'origin', branch]);
	return res.ok && res.out.length > 0;
}

function localRefExists(ref) {
	const res = trySh('git', ['show-ref', '--verify', '--quiet', ref]);
	return res.ok;
}

function main() {
	const rawVersion = ensureEnvVar('VERSION');

	const version = stripReleasePrefixes(rawVersion);
	if (!semver.valid(version)) {
		throw new Error(
			`Invalid VERSION. Expected semver like X.Y.Z (optionally prefixed by n8n@). Got: ${rawVersion}`,
		);
	}

	const major = semver.major(version);
	const minor = semver.minor(version);
	const branch = `release-candidate/${major}.${minor}.x`;

	// We create the RC branch from the corresponding release tag
	const releaseTag = `${RELEASE_PREFIX}${version}`;

	if (remoteBranchExists(branch)) {
		console.log(`Branch already exists on origin: ${branch}`);
		writeGithubOutput({ branch });
		return;
	}

	// Ensure the tag exists locally (as a tag ref)
	// `git rev-parse <tag>^{}` will fail if it doesn't exist.
	const tagCommitRes = trySh('git', ['rev-parse', `${releaseTag}^{}`]);
	if (!tagCommitRes.ok || !tagCommitRes.out) {
		throw new Error(
			`Cannot find release tag "${releaseTag}". Make sure the tag exists and has been pushed.`,
		);
	}

	console.log(`Creating branch ${branch} from ${releaseTag} (${tagCommitRes.out})`);

	// Create local branch (force safe: it shouldn't exist, but keep it robust)
	if (localRefExists(`refs/heads/${branch}`)) {
		sh('git', ['branch', '-f', branch, tagCommitRes.out]);
	} else {
		sh('git', ['switch', '-c', branch, tagCommitRes.out]);
	}

	sh('git', ['push', 'origin', branch]);

	console.log(`Created and pushed: ${branch}`);
	writeGithubOutput({ branch });
}

try {
	main();
} catch (err) {
	console.error(String(err?.message ?? err));
	process.exit(1);
}
