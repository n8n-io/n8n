import { ensureEnvVar, ensureReleaseTrack, ensureTagExists, sh } from './github-helpers.mjs';

function main() {
	const trackEnv = ensureEnvVar('TRACK');
	const track = ensureReleaseTrack(trackEnv);

	const versionInput = ensureEnvVar('VERSION_TAG'); // e.g. n8n@2.7.0

	ensureTagExists(versionInput);

	sh('git', ['tag', '-f', track, versionInput]);

	sh('git', ['push', 'origin', '-f', `refs/tags/${track}:refs/tags/${track}`]);

	console.log(`Moved pointer tag ${track} to point to ${versionInput}`);
}

main();
