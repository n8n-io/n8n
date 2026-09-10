import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	assertSbomIsUsable,
	main,
	parseTargets,
	processTarget,
	processTargets,
} from './attest-image-sbom.mjs';

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

describe('processTarget', () => {
	const target = {
		label: 'n8n-pc',
		image: 'ghcr.io/n8n-io/n8n',
		digest: 'sha256:aaa',
	};

	it('runs the complete validation chain without attesting in validation-only mode', () => {
		const calls = [];
		let asserted = false;
		processTarget(target, {
			shouldAttest: false,
			runCommand: (command, args) => calls.push([command, args]),
			assertUsable: (_sbomPath, label) => {
				assert.equal(label, 'n8n-pc');
				asserted = true;
			},
		});

		assert.deepEqual(
			calls.map(([command]) => path.basename(command)),
			['docker', 'syft', 'node', 'node'],
		);
		assert.equal(calls[0][1][0], 'pull');
		assert.equal(calls[1][1][0], 'docker:ghcr.io/n8n-io/n8n@sha256:aaa');
		assert.ok(calls[2][1].includes('--drop-phantom-npm'));
		assert.ok(calls[3][1].includes('--enforce-prefix=pkg:npm/'));
		assert.equal(asserted, true);
	});

	it('attests after validation by default', () => {
		const calls = [];
		processTarget(target, {
			runCommand: (command, args) => calls.push([command, args]),
			assertUsable: () => {},
		});

		assert.equal(calls.at(-1)[0], 'cosign');
		assert.deepEqual(calls.at(-1)[1].slice(0, 6), [
			'attest',
			'--yes',
			'--replace',
			'--type',
			'cyclonedx',
			'--predicate',
		]);
	});
});

describe('processTargets', () => {
	it('validates every image before reporting aggregated failures', () => {
		const attempted = [];
		assert.throws(
			() =>
				processTargets([{ label: 'n8n' }, { label: 'n8n-pc' }, { label: 'runners' }], {
					shouldAttest: false,
					processTarget: (target) => {
						attempted.push(target.label);
						if (target.label !== 'n8n-pc') throw new Error('missing license');
					},
				}),
			/2 of 3 image\(s\) failed/,
		);
		assert.deepEqual(attempted, ['n8n', 'n8n-pc', 'runners']);
	});
});

describe('main', () => {
	it('passes validation-only mode to image processing', () => {
		let received;
		main({
			env: {
				N8N_IMAGE: 'ghcr.io/n8n-io/n8n',
				N8N_DIGEST: 'sha256:aaa',
			},
			args: ['--validate-only'],
			processAll: (targets, options) => {
				received = { targets, options };
			},
		});

		assert.equal(received.targets[0].label, 'n8n');
		assert.equal(received.options.shouldAttest, false);
	});
});
