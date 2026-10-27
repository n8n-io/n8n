import semver from 'semver';
import {
	ensureEnvVar,
	isReleaseType,
	RELEASE_PREFIX,
	stripReleasePrefixes,
	writeGithubOutput,
} from './github-helpers.mjs';

const track = ensureEnvVar('TRACK');
const bump = ensureEnvVar('BUMP');

const stable = process.env['STABLE_VERSION'];
const beta = process.env['BETA_VERSION'];
const v1 = process.env['V1_VERSION'];

let base = null;
switch (track) {
	case 'stable':
		base = stable;
		break;
	case 'beta':
		base = beta;
		break;
	case 'v1':
		base = v1;
		break;
}

if (!base) {
	console.error(
		`Unknown track or missing base version. track=${track} stable=${stable} beta=${beta} v1=${v1}`,
	);
	process.exit(1);
}

const cleanedBase = stripReleasePrefixes(base);
if (!cleanedBase) {
	console.error(`Invalid base version: ${base}`);
	process.exit(1);
}

if (!isReleaseType(bump)) {
	console.error(`Invalid release type in $bump: ${bump}`);
	process.exit(1);
}

const next = semver.inc(cleanedBase, bump);
if (!next) {
	console.error(`Could not bump version. base=${cleanedBase} bump=${bump}`);
	process.exit(1);
}

const output = {
	base_version: cleanedBase,
	new_version: next,
	new_version_tag: `${RELEASE_PREFIX}${next}`,
};

writeGithubOutput(output);

console.log(`Releasing track=${track} bump=${bump} base=${cleanedBase} -> new=${next}`);
