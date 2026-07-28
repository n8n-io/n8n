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

	it('rejects duplicate data table ids in requirements.dataTables', () => {
		const manifest = {
			...validManifest,
			requirements: {
				dataTables: [
					{ id: 'dt-1', name: 'A', usedByWorkflows: ['wf-abc'] },
					{ id: 'dt-1', name: 'B', usedByWorkflows: ['wf-abc'] },
				],
			},
		};

		expect(() => packageManifestSchema.parse(manifest)).toThrow(/duplicate data table id/i);
	});

	it('accepts workflow requirements', () => {
		const manifest = {
			...validManifest,
			requirements: {
				workflows: [{ id: 'wf-child', name: 'Child workflow', usedByWorkflows: ['wf-abc'] }],
			},
		};

		expect(packageManifestSchema.parse(manifest).requirements?.workflows).toEqual(
			manifest.requirements.workflows,
		);
	});

	it('rejects duplicate workflow ids in requirements.workflows', () => {
		const manifest = {
			...validManifest,
			requirements: {
				workflows: [
					{ id: 'wf-child', name: 'Child A', usedByWorkflows: ['wf-abc'] },
					{ id: 'wf-child', name: 'Child B', usedByWorkflows: ['wf-abc'] },
				],
			},
		};

		expect(() => packageManifestSchema.parse(manifest)).toThrow(/duplicate workflow id/i);
	});

	it('preserves a folders section', () => {
		const manifest = {
			...validManifest,
			folders: [{ id: 'fld-1', name: 'to_production', target: 'folders/to_production' }],
		};

		expect(packageManifestSchema.parse(manifest).folders).toEqual(manifest.folders);
	});

	it('rejects a manifest containing duplicate folder ids', () => {
		const manifest = {
			...validManifest,
			folders: [
				{ id: 'fld-1', name: 'First', target: 'folders/first' },
				{ id: 'fld-1', name: 'Second', target: 'folders/nested/second' },
			],
		};

		expect(() => packageManifestSchema.parse(manifest)).toThrow(/duplicate folder id/i);
	});

	it('rejects a manifest containing duplicate variable ids', () => {
		const manifest = {
			...validManifest,
			variables: [
				{ id: 'var-1', name: 'API_URL', target: 'variables/api-url' },
				{ id: 'var-1', name: 'API_URL', target: 'variables/api-url-2' },
			],
		};

		expect(() => packageManifestSchema.parse(manifest)).toThrow(/duplicate variable id/i);
	});

	it('rejects duplicate variable names in requirements.variables', () => {
		const manifest = {
			...validManifest,
			requirements: {
				variables: [
					{ name: 'API_URL', value: 'a', usedByWorkflows: ['wf-abc'] },
					{ name: 'API_URL', value: 'b', usedByWorkflows: ['wf-abc'] },
				],
			},
		};

		expect(() => packageManifestSchema.parse(manifest)).toThrow(/duplicate variable name/i);
	});

	it('preserves a variables section', () => {
		const manifest = {
			...validManifest,
			variables: [{ id: 'var-1', name: 'API_URL', target: 'variables/api-url' }],
		};

		expect(packageManifestSchema.parse(manifest).variables).toEqual(manifest.variables);
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
