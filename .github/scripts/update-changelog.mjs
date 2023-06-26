import addStream from 'add-stream';
import createTempFile from 'tempfile';
import conventionalChangelog from 'conventional-changelog';
import { resolve } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import stream from 'stream';
import { promisify } from 'util';

const pipeline = promisify(stream.pipeline);

const changelogFile = resolve(dirname(fileURLToPath(import.meta.url)), '../../CHANGELOG.md');

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

// Since we can't read and write from the same file at the same time,
// we use a temporary file to output the updated changelog to.
const tmpFile = createTempFile();
await pipeline(
	changelogStream,
	addStream(createReadStream(changelogFile)),
	createWriteStream(tmpFile),
);

await pipeline(createReadStream(tmpFile), createWriteStream(changelogFile));
