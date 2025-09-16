import createTempFile from 'tempfile';
import { resolve } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import packageJson from '../../package.json' with { type: 'json' };
import { createChangelogStream } from './changelog-utils.mjs';

const baseDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const fullChangelogFile = resolve(baseDir, 'CHANGELOG.md');
// Version includes experimental versions (e.g., 1.2.3-exp.0)
const versionChangelogFile = resolve(baseDir, `CHANGELOG-${packageJson.version}.md`);

const changelogStream = createChangelogStream({
	tagPrefix: 'n8n@',
	releaseCount: 1,
	independentPackage: false
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
