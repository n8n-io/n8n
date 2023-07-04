import addStream from 'add-stream';
import createTempFile from 'tempfile';
import conventionalChangelog from 'conventional-changelog';
import { resolve } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import stream from 'stream';
import { promisify } from 'util';
import packageJson from '../../package.json' assert { type: 'json' };

const pipeline = promisify(stream.pipeline);

const baseDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const fullChangelogFile = resolve(baseDir, 'CHANGELOG.md');
const versionChangelogFile = resolve(baseDir, `CHANGELOG-${packageJson.version}.md`);

const changelogStream = conventionalChangelog({
	preset: 'angular',
	releaseCount: 1,
	tagPrefix: 'n8n@',
	transform: (commit, callback) => {
		callback(null, commit.header.includes('(no-changelog)') ? undefined : commit);
	},
}).on('error', (err) => {
	console.error(err.stack);
	process.exit(1);
});

// We need to duplicate the stream here to pipe the changelog into two separate files
const stream1 = new stream.PassThrough();
const stream2 = new stream.PassThrough();
changelogStream.pipe(stream1);
changelogStream.pipe(stream2);

await pipeline(stream1, createWriteStream(versionChangelogFile));

// Since we can't read and write from the same file at the same time,
// we use a temporary file to output the updated changelog to.
const tmpFile = createTempFile();
await pipeline(stream2, addStream(createReadStream(fullChangelogFile)), createWriteStream(tmpFile)),
	await pipeline(createReadStream(tmpFile), createWriteStream(fullChangelogFile));
