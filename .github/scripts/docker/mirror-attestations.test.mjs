import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isNotFound, mirrorAttestations } from './mirror-attestations.mjs';

const DIGEST = 'sha256:2f07088829b6a1df2b6a84746bb8b32c1eaef270315fb5466aa01b1045e9b300';
const HEX = DIGEST.slice('sha256:'.length);
const TARGET = { label: 'runners', image: 'ghcr.io/n8n-io/runners', digest: DIGEST };
const NOT_FOUND = (ref) => `ERROR: ${ref}: not found`;

/** `missing` maps a ref to the error that inspect returns for it. */
function fakeRegistry(missing = {}) {
	const copies = [];
	return {
		copies,
		inspect: (ref) => missing[ref] ?? null,
		copy: (src, dst) => copies.push([src, dst]),
	};
}

describe('mirrorAttestations', () => {
	it('copies the referrers and cosign tags to the Docker Hub repo', () => {
		const registry = fakeRegistry();
		assert.deepEqual(mirrorAttestations([TARGET], 'n8nio', registry), []);
		assert.deepEqual(registry.copies, [
			[`ghcr.io/n8n-io/runners:sha256-${HEX}`, `docker.io/n8nio/runners:sha256-${HEX}`],
			[`ghcr.io/n8n-io/runners:sha256-${HEX}.att`, `docker.io/n8nio/runners:sha256-${HEX}.att`],
		]);
	});

	it('fails without copying when Docker Hub has a different digest', () => {
		const dst = `docker.io/n8nio/runners@${DIGEST}`;
		const registry = fakeRegistry({ [dst]: NOT_FOUND(dst) });
		const errors = mirrorAttestations([TARGET], 'n8nio', registry);
		assert.equal(errors.length, 1);
		assert.match(errors[0], /indexes differ/);
		assert.deepEqual(registry.copies, []);
	});

	it('skips a tag that does not exist on GHCR', () => {
		const src = `ghcr.io/n8n-io/runners:sha256-${HEX}`;
		const registry = fakeRegistry({ [src]: NOT_FOUND(src) });
		assert.deepEqual(mirrorAttestations([TARGET], 'n8nio', registry), []);
		assert.deepEqual(
			registry.copies.map(([s]) => s),
			[`ghcr.io/n8n-io/runners:sha256-${HEX}.att`],
		);
	});

	it('reports a GHCR read error that is not a missing tag', () => {
		const src = `ghcr.io/n8n-io/runners:sha256-${HEX}.att`;
		const registry = fakeRegistry({ [src]: 'ERROR: failed to authorize: 403 Forbidden' });
		const errors = mirrorAttestations([TARGET], 'n8nio', registry);
		assert.equal(errors.length, 1);
		assert.match(errors[0], /cannot read .*403 Forbidden/);
	});
});

describe('isNotFound', () => {
	// Messages captured from `docker buildx imagetools inspect --raw`.
	it('matches only a missing manifest', () => {
		assert.ok(isNotFound(`ERROR: ghcr.io/n8n-io/runners:sha256-${HEX}.att: not found`));
		assert.ok(
			!isNotFound(
				'ERROR: failed to authorize: failed to fetch anonymous token: unexpected status from GET request to https://ghcr.io/token: 403 Forbidden',
			),
		);
		assert.ok(
			!isNotFound(
				'ERROR: failed to do request: Head "https://ghcr.io/v2/a/b/manifests/c": dial tcp: lookup ghcr.io: no such host',
			),
		);
	});
});
