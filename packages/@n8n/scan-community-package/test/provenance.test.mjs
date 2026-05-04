import assert from 'node:assert/strict';
import test from 'node:test';

import { checkPackageProvenance } from '../scanner/provenance.mjs';

test('checkPackageProvenance passes when npm provenance metadata is present', () => {
	assert.deepEqual(
		checkPackageProvenance(
			{
				versions: {
					'1.0.0': {
						dist: {
							attestations: {
								provenance: {
									predicateType: 'https://slsa.dev/provenance/v1',
								},
							},
						},
					},
				},
			},
			'1.0.0',
		),
		{ passed: true },
	);
});

test('checkPackageProvenance fails when npm provenance metadata is missing', () => {
	assert.deepEqual(
		checkPackageProvenance(
			{
				versions: {
					'1.0.0': { dist: {} },
				},
			},
			'1.0.0',
		),
		{
			passed: false,
			message:
				'Package was not published with npm provenance. Learn how to publish community nodes with provenance: https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/',
		},
	);
});

test('checkPackageProvenance fails when lint checks pass but npm provenance is missing', () => {
	const lintResult = { passed: true };
	const provenanceResult = checkPackageProvenance(
		{
			versions: {
				'1.0.0': { dist: {} },
			},
		},
		'1.0.0',
	);

	assert.equal(lintResult.passed, true);
	assert.equal(provenanceResult.passed, false);
	assert.match(provenanceResult.message, /Package was not published with npm provenance/);
});

test('checkPackageProvenance fails for unsupported provenance predicate types', () => {
	assert.deepEqual(
		checkPackageProvenance(
			{
				versions: {
					'1.0.0': {
						dist: {
							attestations: {
								provenance: {
									predicateType: 'https://example.com/provenance/v1',
								},
							},
						},
					},
				},
			},
			'1.0.0',
		),
		{
			passed: false,
			message: 'Unsupported npm provenance predicate type: https://example.com/provenance/v1',
		},
	);
});
