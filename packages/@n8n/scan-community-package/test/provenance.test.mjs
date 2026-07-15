import { afterEach, describe, expect, it, vi } from 'vitest';

import {
	checkPackageProvenance,
	extractSourceLocationFromBundle,
	getSourceLocation,
} from '../scanner/provenance.mjs';

/**
 * Build an npm attestations bundle shape (sigstore DSSE envelope) carrying a
 * SLSA v1 provenance statement that pins a git source repo + commit, matching
 * what `registry.npmjs.org/-/npm/v1/attestations/...` actually returns.
 */
function makeBundle({ repoUrl, commitSha, ref = 'refs/heads/main' }) {
	const statement = {
		_type: 'https://in-toto.io/Statement/v1',
		predicateType: 'https://slsa.dev/provenance/v1',
		subject: [],
		predicate: {
			buildDefinition: {
				buildType: 'https://slsa.dev/buildtypes/github-actions/v1',
				externalParameters: {
					workflow: { ref, repository: repoUrl, path: '.github/workflows/publish.yml' },
				},
				resolvedDependencies: [
					{
						uri: `git+${repoUrl}@${ref}`,
						digest: { gitCommit: commitSha },
					},
				],
			},
		},
	};
	return {
		attestations: [
			{
				predicateType: 'https://slsa.dev/provenance/v1',
				bundle: {
					dsseEnvelope: {
						payload: Buffer.from(JSON.stringify(statement)).toString('base64'),
					},
				},
			},
		],
	};
}

describe('checkPackageProvenance', () => {
	it('passes when npm provenance metadata is present', () => {
		expect(
			checkPackageProvenance(
				{
					versions: {
						'1.0.0': {
							dist: {
								attestations: { provenance: { predicateType: 'https://slsa.dev/provenance/v1' } },
							},
						},
					},
				},
				'1.0.0',
			),
		).toEqual({ passed: true });
	});

	it('fails when npm provenance metadata is missing', () => {
		expect(checkPackageProvenance({ versions: { '1.0.0': { dist: {} } } }, '1.0.0')).toEqual({
			passed: false,
			message:
				'Package was not published with npm provenance. Learn how to publish community nodes with provenance: https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/',
		});
	});

	it('fails when lint checks pass but npm provenance is missing', () => {
		const lintResult = { passed: true };
		const provenanceResult = checkPackageProvenance(
			{ versions: { '1.0.0': { dist: {} } } },
			'1.0.0',
		);

		expect(lintResult.passed).toBe(true);
		expect(provenanceResult.passed).toBe(false);
		expect(provenanceResult.message).toMatch(/Package was not published with npm provenance/);
	});

	it('fails for unsupported provenance predicate types', () => {
		expect(
			checkPackageProvenance(
				{
					versions: {
						'1.0.0': {
							dist: {
								attestations: {
									provenance: { predicateType: 'https://example.com/provenance/v1' },
								},
							},
						},
					},
				},
				'1.0.0',
			),
		).toEqual({
			passed: false,
			message: 'Unsupported npm provenance predicate type: https://example.com/provenance/v1',
		});
	});
});

describe('extractSourceLocationFromBundle', () => {
	it('extracts the git repo URL and attested commit from a SLSA provenance bundle', () => {
		const bundle = makeBundle({
			repoUrl: 'https://github.com/luzconsulting/n8n-nodes-salessuite',
			commitSha: '42cdce5c0b8e14a84ddc20de86612270670348a4',
		});

		expect(extractSourceLocationFromBundle(bundle)).toEqual({
			repoUrl: 'https://github.com/luzconsulting/n8n-nodes-salessuite',
			commitSha: '42cdce5c0b8e14a84ddc20de86612270670348a4',
		});
	});

	it('returns null when the bundle has no SLSA provenance attestation', () => {
		const bundle = {
			attestations: [
				{ predicateType: 'https://github.com/npm/attestation/tree/main/specs/publish/v0.1' },
			],
		};
		expect(extractSourceLocationFromBundle(bundle)).toBeNull();
	});

	it('returns null when resolvedDependencies lacks a git entry', () => {
		const bundle = makeBundle({ repoUrl: 'https://github.com/o/r', commitSha: 'abc1234' });
		// strip the git dependency, keep the workflow repo but no resolved git source
		bundle.attestations[0].bundle.dsseEnvelope.payload = Buffer.from(
			JSON.stringify({
				predicateType: 'https://slsa.dev/provenance/v1',
				predicate: { buildDefinition: { resolvedDependencies: [] } },
			}),
		).toString('base64');
		expect(extractSourceLocationFromBundle(bundle)).toBeNull();
	});

	it('returns null for a malformed payload', () => {
		const bundle = {
			attestations: [
				{
					predicateType: 'https://slsa.dev/provenance/v1',
					bundle: { dsseEnvelope: { payload: 'not-json' } },
				},
			],
		};
		expect(extractSourceLocationFromBundle(bundle)).toBeNull();
	});
});

describe('getSourceLocation', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('fetches the attestation bundle and resolves the source location', async () => {
		const bundle = makeBundle({
			repoUrl: 'https://github.com/o/r',
			commitSha: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
		});
		const axios = await import('axios');
		vi.spyOn(axios.default, 'get').mockResolvedValue({ data: bundle });

		const result = await getSourceLocation(
			{
				versions: {
					'1.0.0': {
						dist: { attestations: { url: 'https://registry.npmjs.org/-/npm/v1/attestations/x' } },
					},
				},
			},
			'1.0.0',
		);

		expect(result).toEqual({
			repoUrl: 'https://github.com/o/r',
			commitSha: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
		});
	});

	it('returns null when the version has no attestations url', async () => {
		expect(await getSourceLocation({ versions: { '1.0.0': { dist: {} } } }, '1.0.0')).toBeNull();
	});
});
