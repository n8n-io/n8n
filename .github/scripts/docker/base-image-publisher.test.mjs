import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	checkProvenance,
	hubPushTime,
	publisherOf,
	signatureTime,
} from './base-image-publisher.mjs';

const digest = (char) => `sha256:${char.repeat(64)}`;

describe('publisherOf', () => {
	it('maps each source repository to its publisher', () => {
		assert.equal(publisherOf('dhi.io/node'), 'dhi');
		assert.equal(publisherOf('gcr.io/distroless/cc-debian13'), 'distroless');
		assert.equal(publisherOf('python'), 'docker-official');
	});

	it('does not trust an unknown repository', () => {
		assert.equal(publisherOf('docker.io/someone/python'), null);
		assert.equal(publisherOf('gcr.io/other/cc-debian13'), null);
	});
});

describe('signatureTime', () => {
	const signature = (manifestDigest, integratedTime) => ({
		critical: { image: { 'docker-manifest-digest': manifestDigest } },
		optional: { Bundle: { Payload: { integratedTime } } },
	});

	it('returns the earliest Rekor time of the digest', () => {
		const verified = [signature(digest('a'), 1794519463), signature(digest('a'), 1794446025)];
		assert.equal(signatureTime(verified, digest('a')), '2026-11-12T01:13:45.000Z');
	});

	it('ignores a signature of another digest', () => {
		assert.equal(signatureTime([signature(digest('b'), 1794446025)], digest('a')), null);
	});

	it('returns null without a Rekor entry', () => {
		const verified = [{ critical: { image: { 'docker-manifest-digest': digest('a') } } }];
		assert.equal(signatureTime(verified, digest('a')), null);
	});
});

describe('checkProvenance', () => {
	const slsa = (builder, uri) => ({
		SLSA: { builder: { id: builder }, invocation: { configSource: { uri } } },
	});
	const source = 'https://github.com/docker-library/python.git#152874b1:3.13/alpine3.24';
	const platforms = ['linux/amd64', 'linux/arm64'];

	it('accepts the docker-library builder and source on each platform', () => {
		const provenance = {
			'linux/amd64': slsa('https://github.com/docker-library', source),
			'linux/arm64': slsa('https://github.com/docker-library', source),
		};
		assert.equal(checkProvenance(provenance, 'python', platforms), null);
	});

	it('rejects another builder', () => {
		const provenance = {
			'linux/amd64': slsa('https://github.com/someone', source),
			'linux/arm64': slsa('https://github.com/docker-library', source),
		};
		assert.match(checkProvenance(provenance, 'python', platforms), /linux\/amd64: the builder/);
	});

	it('rejects the source of another image', () => {
		const other = 'https://github.com/docker-library/pythonx.git#1:3.13/alpine3.24';
		const provenance = {
			'linux/amd64': slsa('https://github.com/docker-library', other),
			'linux/arm64': slsa('https://github.com/docker-library', other),
		};
		assert.match(checkProvenance(provenance, 'python', platforms), /the source is/);
	});

	it('rejects a missing platform', () => {
		const provenance = { 'linux/amd64': slsa('https://github.com/docker-library', source) };
		assert.match(
			checkProvenance(provenance, 'python', platforms),
			/linux\/arm64: the builder is missing/,
		);
	});

	it('reads the SLSA v1 fields', () => {
		const v1 = {
			SLSA: {
				runDetails: { builder: { id: 'https://github.com/docker-library' } },
				buildDefinition: { externalParameters: { configSource: { uri: source } } },
			},
		};
		const provenance = { 'linux/amd64': v1, 'linux/arm64': v1 };
		assert.equal(checkProvenance(provenance, 'python', platforms), null);
	});
});

describe('hubPushTime', () => {
	it('returns the push time when the tag points at the digest', () => {
		const tag = { digest: digest('a'), tag_last_pushed: '2026-11-12T03:55:00.123456Z' };
		assert.equal(hubPushTime(tag, digest('a')), '2026-11-12T03:55:00.123Z');
	});

	it('returns null when the tag moved to another digest', () => {
		const tag = { digest: digest('b'), tag_last_pushed: '2026-11-12T03:55:00Z' };
		assert.equal(hubPushTime(tag, digest('a')), null);
	});
});
