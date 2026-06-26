import { packageManifestSchema } from '../manifest.schema';

const validManifest = {
	packageFormatVersion: '1',
	exportedAt: '2026-05-18T12:00:00.000Z',
	sourceN8nVersion: '1.0.0',
	sourceId: 'instance-abc',
	workflows: [{ id: 'wf-abc', name: 'My workflow', target: 'workflows/my-workflow-abc' }],
};

describe('packageManifestSchema', () => {
	it('accepts a valid manifest', () => {
		expect(() => packageManifestSchema.parse(validManifest)).not.toThrow();
	});

	it('rejects a manifest with an unsupported packageFormatVersion', () => {
		const manifest = { ...validManifest, packageFormatVersion: '99' };

		expect(() => packageManifestSchema.parse(manifest)).toThrow();
	});

	it('rejects a manifest containing duplicate workflow ids', () => {
		const manifest = {
			...validManifest,
			workflows: [
				{ id: 'wf-abc', name: 'First', target: 'workflows/first' },
				{ id: 'wf-abc', name: 'Second', target: 'workflows/second' },
			],
		};

		expect(() => packageManifestSchema.parse(manifest)).toThrow(/duplicate/i);
	});

	it('rejects duplicate credential ids in requirements.credentials', () => {
		const manifest = {
			...validManifest,
			requirements: {
				credentials: [
					{ id: 'cred-1', name: 'A', type: 'githubApi', usedByWorkflows: ['wf-abc'] },
					{ id: 'cred-1', name: 'B', type: 'slackApi', usedByWorkflows: ['wf-abc'] },
				],
			},
		};

		expect(() => packageManifestSchema.parse(manifest)).toThrow(/duplicate credential id/i);
	});

	it('accepts manifests with unknown sections for forward compatibility', () => {
		const manifest = {
			...validManifest,
			credentials: [{ id: 'cred-1', name: 'Slack', target: 'credentials/slack' }],
			requirements: { credentials: [], variables: [] },
		};

		expect(() => packageManifestSchema.parse(manifest)).not.toThrow();
	});
});
