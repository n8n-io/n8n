import createTempFile from 'tempfile';
import { ConventionalChangelog, packagePrefix } from 'conventional-changelog';
import { resolve } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import packageJson from '../../package.json' with { type: 'json' };

const baseDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const fullChangelogFile = resolve(baseDir, 'CHANGELOG.md');
// Version includes experimental versions (e.g., 1.2.3-exp.0)
const versionChangelogFile = resolve(baseDir, `CHANGELOG-${packageJson.version}.md`);

const changelogStream = new ConventionalChangelog()
	.package(packageJson)
	.readRepository()
	.loadPreset('angular')
	.tags({
		prefix: 'n8n@',
	})
	.context({
		version: packageJson.version,
		repoUrl: 'https://github.com/n8n-io/n8n',
	})
	.options({
		releaseCount: 1,
		transformCommit(commit) {
			const hasNoChangelogInHeader = commit.header?.includes('(no-changelog)');
			const isBenchmarkScope = commit.scope === 'benchmark';

			// Ignore commits that have 'benchmark' scope or '(no-changelog)' in the header
			return hasNoChangelogInHeader || isBenchmarkScope ? null : commit;
		},
	})
	.writeStream()
	.on('error', (err) => {
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
tmpStream.write('\n\n');
await pipeline(createReadStream(fullChangelogFile), tmpStream);
await pipeline(createReadStream(tmpFile), createWriteStream(fullChangelogFile));
