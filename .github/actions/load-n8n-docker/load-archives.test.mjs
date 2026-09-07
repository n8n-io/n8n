import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Run these tests by running
 *
 * node --test ./.github/actions/load-n8n-docker/load-archives.test.mjs
 * */

const SCRIPT = join(import.meta.dirname, 'load-archives.sh');

// A `docker` stub that stands in for the real daemon. It waits until
// RENDEZVOUS_COUNT stubs have started before it does its work, so a
// sequential caller deadlocks and exits 3. Only a concurrent caller gets
// every stub past the rendezvous.
const DOCKER_STUB = `#!/usr/bin/env bash
set -uo pipefail
shopt -s nullglob

archive="\${@: -1}"
name="$(basename "$archive")"
touch "$MARKER_DIR/$name.started"

for _ in $(seq 1 60); do
  started=("$MARKER_DIR"/*.started)
  [ "\${#started[@]}" -ge "$RENDEZVOUS_COUNT" ] && break
  sleep 0.05
done

started=("$MARKER_DIR"/*.started)
if [ "\${#started[@]}" -lt "$RENDEZVOUS_COUNT" ]; then
  echo "rendezvous timeout: only \${#started[@]} of $RENDEZVOUS_COUNT loads started" >&2
  exit 3
fi

case "$name" in
  *bad*)
    echo 'archive/tar: invalid tar header' >&2
    exit 1
    ;;
esac

echo "Loaded image: n8nio/\${name%.tar}:local"
`;

// A sequential loader, used as the control for the concurrency test.
const SEQUENTIAL_LOADER = `
set -uo pipefail
status=0
for f in "$@"; do docker load -i "$f" || status=$?; done
exit "$status"
`;

/** Runs a loader script against the docker stub with the given archive names. */
const runLoad = (archives, rendezvousCount = archives.length, loaderSource = undefined) => {
	const workdir = mkdtempSync(join(tmpdir(), 'load-archives-'));
	const bindir = join(workdir, 'bin');
	const markerDir = join(workdir, 'markers');
	mkdirSync(bindir);
	mkdirSync(markerDir);

	const docker = join(bindir, 'docker');
	writeFileSync(docker, DOCKER_STUB);
	chmodSync(docker, 0o755);

	let loader = SCRIPT;
	if (loaderSource !== undefined) {
		loader = join(workdir, 'loader.sh');
		writeFileSync(loader, loaderSource);
	}

	const paths = archives.map((name) => join(workdir, name));
	for (const path of paths) writeFileSync(path, '');

	return spawnSync('bash', [loader, ...paths], {
		encoding: 'utf8',
		env: {
			...process.env,
			PATH: `${bindir}:${process.env.PATH}`,
			MARKER_DIR: markerDir,
			RENDEZVOUS_COUNT: String(rendezvousCount),
		},
	});
};

describe('load-archives.sh', () => {
	it('starts every load before it waits for any of them', () => {
		// The stub only completes when both loads run at the same time.
		const result = runLoad(['n8n.tar', 'runners.tar']);

		assert.equal(result.status, 0, result.stdout + result.stderr);
		assert.match(result.stdout, /Loaded image: n8nio\/n8n:local/);
		assert.match(result.stdout, /Loaded image: n8nio\/runners:local/);
	});

	it('control: a sequential loader does not pass the rendezvous', () => {
		// Keeps the test above honest. If the stub let a sequential loader
		// through, that test would prove nothing.
		const result = runLoad(['n8n.tar', 'runners.tar'], 2, SEQUENTIAL_LOADER);

		assert.notEqual(result.status, 0);
		assert.match(result.stderr, /rendezvous timeout/);
	});

	it('waits for every load and exits non-zero when one load fails', () => {
		const result = runLoad(['n8n.tar', 'runners-bad.tar']);

		assert.notEqual(result.status, 0);
		// The good load still ran to the end, so the script waited for both.
		assert.match(result.stdout, /Loaded image: n8nio\/n8n:local/);
		assert.match(result.stdout, /::error::docker load failed for .*runners-bad\.tar \(exit 1\)/);
	});

	it('reports the log of a failed load', () => {
		const result = runLoad(['n8n-bad.tar']);

		assert.notEqual(result.status, 0);
		assert.match(result.stdout, /invalid tar header/);
	});

	it('exits non-zero when it gets no archive', () => {
		const result = runLoad([], 1);

		assert.notEqual(result.status, 0);
		assert.match(result.stdout, /needs at least one archive path/);
	});
});
