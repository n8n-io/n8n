import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { assertSbomIsUsable, parseTargets } from './attest-image-sbom.mjs';

describe('parseTargets', () => {
	it('builds a target per image when both ref and digest are present', () => {
		const targets = parseTargets({
			N8N_IMAGE: 'ghcr.io/n8n-io/n8n',
			N8N_DIGEST: 'sha256:aaa',
			RUNNERS_IMAGE: 'ghcr.io/n8n-io/runners',
			RUNNERS_DIGEST: 'sha256:bbb',
			DISTROLESS_IMAGE: 'ghcr.io/n8n-io/runners',
			DISTROLESS_DIGEST: 'sha256:ccc',
		});
		assert.deepEqual(
			targets.map((t) => t.label),
			['n8n', 'runners', 'runners-distroless'],
		);
	});

	it('skips an image with no digest (not built for this release type)', () => {
		const targets = parseTargets({
			N8N_IMAGE: 'ghcr.io/n8n-io/n8n',
			N8N_DIGEST: 'sha256:aaa',
			RUNNERS_IMAGE: 'ghcr.io/n8n-io/runners',
			RUNNERS_DIGEST: '',
		});
		assert.deepEqual(
			targets.map((t) => t.label),
			['n8n'],
		);
	});

	it('returns nothing when no digests are present', () => {
		assert.deepEqual(parseTargets({}), []);
	});
});

describe('assertSbomIsUsable', () => {
	const tmp = mkdtempSync(path.join(os.tmpdir(), 'sbom-assert-'));
	const write = (name, components) => {
		const p = path.join(tmp, name);
		writeFileSync(p, JSON.stringify({ components }));
		return p;
	};
	const OS = { type: 'operating-system', name: 'alpine', version: '3.24' };

	it('accepts an SBOM with npm components and an operating system', () => {
		assert.doesNotThrow(() =>
			assertSbomIsUsable(write('ok.json', [{ purl: 'pkg:npm/a@1' }, OS]), 'n8n'),
		);
	});

	it('rejects an SBOM the scanner failed to populate', () => {
		const p = write('empty.json', [{ purl: 'pkg:apk/alpine/busybox@1.0' }, OS]);
		assert.throws(() => assertSbomIsUsable(p, 'n8n'), /no npm components/);
	});

	// Warns rather than throws: the distroless runners image carries no package
	// manager and the runtime base strips apk-tools, so an absent OS component
	// is not known to be a fault. Blocking on it would fail every release.
	it('warns but accepts an SBOM with no operating-system component', () => {
		const logged = [];
		const original = console.log;
		console.log = (msg) => logged.push(String(msg));
		try {
			assert.doesNotThrow(() =>
				assertSbomIsUsable(write('no-os.json', [{ purl: 'pkg:npm/a@1' }]), 'runners'),
			);
		} finally {
			console.log = original;
		}
		assert.ok(logged.some((l) => /^::warning::runners: .*no operating-system component/.test(l)));
	});

	it('names the image in the failure so a four-image run says which one broke', () => {
		assert.throws(() => assertSbomIsUsable(write('named.json', [OS]), 'runners-distroless'), {
			message: /^runners-distroless:/,
		});
	});
});
