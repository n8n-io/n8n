import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseTargets } from './attest-image-sbom.mjs';

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
