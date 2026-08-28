import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ecosystemCounts, licenseOf, parseArgs, slugify, VARIANTS } from './profile-image-sbom.mjs';

describe('parseArgs', () => {
	it('requires an image', () => {
		assert.throws(() => parseArgs([]), /--image is required/);
	});

	it('defaults to comparing production cdxgen against syft', () => {
		assert.deepEqual(parseArgs(['--image', 'a:1']).variants, ['cdxgen-fetch', 'syft']);
	});

	it('parses an explicit variant list', () => {
		const args = parseArgs(['--image', 'a:1', '--variants', 'cdxgen-no-fetch,syft']);
		assert.deepEqual(args.variants, ['cdxgen-no-fetch', 'syft']);
	});

	it('rejects an unknown variant rather than silently scanning the wrong thing', () => {
		assert.throws(() => parseArgs(['--image', 'a:1', '--variants', 'nope']), /Unknown variant/);
	});

	it('rejects unknown flags', () => {
		assert.throws(() => parseArgs(['--image', 'a:1', '--fast']), /Unknown argument/);
	});

	it('parses --keep', () => {
		assert.equal(parseArgs(['--image', 'a:1', '--keep']).keep, true);
		assert.equal(parseArgs(['--image', 'a:1']).keep, false);
	});
});

describe('slugify', () => {
	it('keeps two refs of the same image distinct so runs do not clobber each other', () => {
		assert.notEqual(
			slugify('ghcr.io/n8n-io/runners:2.37.4'),
			slugify('ghcr.io/n8n-io/runners:2.37.4-distroless'),
		);
	});

	it('produces a filename-safe string from a digest ref', () => {
		const slug = slugify('ghcr.io/n8n-io/n8n@sha256:3ef785400f1a0336');
		assert.match(slug, /^[a-zA-Z0-9._-]+$/);
	});
});

describe('licenseOf', () => {
	it('reads an SPDX id', () => {
		assert.equal(licenseOf({ licenses: [{ license: { id: 'MIT' } }] }), 'MIT');
	});

	it('falls back to a license name', () => {
		assert.equal(
			licenseOf({ licenses: [{ license: { name: 'LicenseRef-n8n-sustainable-use' } }] }),
			'LicenseRef-n8n-sustainable-use',
		);
	});

	it('reads an expression entry', () => {
		assert.equal(
			licenseOf({ licenses: [{ expression: '(MIT OR Apache-2.0)' }] }),
			'(MIT OR Apache-2.0)',
		);
	});

	it('is order-insensitive, so a reordered list is not reported as a license change', () => {
		const a = { licenses: [{ license: { id: 'MIT' } }, { license: { id: 'Apache-2.0' } }] };
		const b = { licenses: [{ license: { id: 'Apache-2.0' } }, { license: { id: 'MIT' } }] };
		assert.equal(licenseOf(a), licenseOf(b));
	});

	it('returns null when unresolved, so the diff can count it as a loss', () => {
		assert.equal(licenseOf({}), null);
		assert.equal(licenseOf({ licenses: [] }), null);
		assert.equal(licenseOf({ licenses: [{ license: {} }] }), null);
	});
});

describe('ecosystemCounts', () => {
	it('groups by purl prefix', () => {
		const counts = ecosystemCounts([
			{ purl: 'pkg:npm/a@1' },
			{ purl: 'pkg:npm/b@1' },
			{ purl: 'pkg:apk/alpine/c@1' },
		]);
		assert.deepEqual(counts, { 'pkg:npm': 2, 'pkg:apk': 1 });
	});

	it('buckets purl-less components instead of dropping them', () => {
		const counts = ecosystemCounts([{ name: 'signing-key', type: 'cryptographic-asset' }]);
		assert.deepEqual(counts, { 'no-purl': 1 });
	});
});

describe('VARIANTS', () => {
	it('builds a syft command that writes CycloneDX and skips the file catalogue', () => {
		const [cmd, args] = VARIANTS.syft.command('/tmp/out.json', 'img:1');
		assert.equal(cmd, 'syft');
		assert.ok(args.includes('cyclonedx-json=/tmp/out.json'));
		assert.deepEqual(
			[args[args.indexOf('--select-catalogers')], args[args.indexOf('--select-catalogers') + 1]],
			['--select-catalogers', '-file'],
		);
	});

	// The profile is the only difference between the two cdxgen variants. If it also
	// reaches the no-fetch variant, the comparison measures nothing.
	it('only the fetch variant passes the license-compliance profile', () => {
		const [, withFetch] = VARIANTS['cdxgen-fetch'].command('/tmp/o.json', 'img:1');
		const [, without] = VARIANTS['cdxgen-no-fetch'].command('/tmp/o.json', 'img:1');
		assert.ok(withFetch.includes('license-compliance'));
		assert.ok(!without.includes('license-compliance'));
	});
});
