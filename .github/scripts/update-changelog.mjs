import createTempFile from 'tempfile';
import conventionalChangelog from 'conventional-changelog';
import { resolve } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import packageJson from '../../package.json' with { type: 'json' };

const baseDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const fullChangelogFile = resolve(baseDir, 'CHANGELOG.md');
const versionChangelogFile = resolve(baseDir, `CHANGELOG-${packageJson.version}.md`);

const changelogStream = conventionalChangelog({
	preset: 'angular',
	releaseCount: 1,
	tagPrefix: 'n8n@',
	transform: (commit, callback) => {
		const hasNoChangelogInHeader = commit.header.includes('(no-changelog)');
		const isBenchmarkScope = commit.scope === 'benchmark';

		// Ignore commits that have 'benchmark' scope or '(no-changelog)' in the header
		callback(null, hasNoChangelogInHeader || isBenchmarkScope ? undefined : commit);
	},
}).on('error', (err) => {
	console.error(err.stack);
	process.exit(1);
});

// Write the new changelog to a new temporary file, so that the contents can be used in the PR description
await pipeline(changelogStream, createWriteStream(versionChangelogFile));

// Since we can't read and write from the same file at the same time,
// we use a temporary file to output the updated changelog to.
const tmpFile = createTempFile();
const tmpStream = createWriteStream(tmpFile);
await pipeline(createReadStream(versionChangelogFile), tmpStream, { end: false });
await pipeline(createReadStream(fullChangelogFile), tmpStream);
await pipeline(createReadStream(tmpFile), createWriteStream(fullChangelogFile));
