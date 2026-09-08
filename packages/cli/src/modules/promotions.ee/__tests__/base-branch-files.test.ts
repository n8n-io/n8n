import { baseBranchPathspecs, parseBaseBranchFiles } from '../base-branch-files';

const SHA = 'a'.repeat(40);

function record(path: string, { sha = SHA, mode = '100644', objectType = 'blob' } = {}) {
	return `${mode} ${objectType} ${sha}\t${path}\0`;
}

describe('baseBranchPathspecs', () => {
	it('scopes the listing to the projects directory and the shared directories', () => {
		expect(baseBranchPathspecs('n8n-export')).toEqual([
			'n8n-export/projects/',
			'n8n-export/credentials/',
			'n8n-export/variables/',
			'n8n-export/tags/',
		]);
	});
});

describe('parseBaseBranchFiles', () => {
	const options = { exportRoot: 'n8n-export', projectId: 'Ab12cd34' };

	it('lists the project files plus shared credential, variable and tag files, and nothing from another project', () => {
		const output = [
			record('n8n-export/projects/orders-Ab12cd34/project.json'),
			record('n8n-export/projects/orders-Ab12cd34/workflows/process-order-Wf01/workflow.json'),
			record('n8n-export/projects/orders-Ab12cd34/folders/legacy-Fo01/folder.json'),
			record(
				'n8n-export/projects/orders-Ab12cd34/folders/legacy-Fo01/workflows/old-Wf02/workflow.json',
			),
			record('n8n-export/projects/orders-Ab12cd34/credentials/api-key-Cr01/credential.json'),
			record('n8n-export/projects/orders-Ab12cd34/data-tables/orders-Dt01/data-table.json'),
			record('n8n-export/projects/marketing-Zz99/project.json'),
			record('n8n-export/projects/marketing-Zz99/workflows/campaign-Wf99/workflow.json'),
			record('n8n-export/credentials/header-auth-Cr02/credential.json'),
			record('n8n-export/variables/api-url-Va01/variable.json'),
			record('n8n-export/tags/prod-Ta01/tag.json'),
			record('n8n-export/manifest.json'),
		].join('');

		const files = parseBaseBranchFiles(output, options);

		expect([...files.entries()]).toEqual([
			[
				'Ab12cd34',
				{ path: 'n8n-export/projects/orders-Ab12cd34/project.json', blobSha: SHA, type: 'project' },
			],
			[
				'Wf01',
				{
					path: 'n8n-export/projects/orders-Ab12cd34/workflows/process-order-Wf01/workflow.json',
					blobSha: SHA,
					type: 'workflow',
				},
			],
			[
				'Fo01',
				{
					path: 'n8n-export/projects/orders-Ab12cd34/folders/legacy-Fo01/folder.json',
					blobSha: SHA,
					type: 'folder',
				},
			],
			[
				'Wf02',
				{
					path: 'n8n-export/projects/orders-Ab12cd34/folders/legacy-Fo01/workflows/old-Wf02/workflow.json',
					blobSha: SHA,
					type: 'workflow',
				},
			],
			[
				'Cr01',
				{
					path: 'n8n-export/projects/orders-Ab12cd34/credentials/api-key-Cr01/credential.json',
					blobSha: SHA,
					type: 'credential',
				},
			],
			[
				'Dt01',
				{
					path: 'n8n-export/projects/orders-Ab12cd34/data-tables/orders-Dt01/data-table.json',
					blobSha: SHA,
					type: 'dataTable',
				},
			],
			[
				'Cr02',
				{
					path: 'n8n-export/credentials/header-auth-Cr02/credential.json',
					blobSha: SHA,
					type: 'credential',
				},
			],
			[
				'api-url',
				{ path: 'n8n-export/variables/api-url-Va01/variable.json', blobSha: SHA, type: 'variable' },
			],
			['Ta01', { path: 'n8n-export/tags/prod-Ta01/tag.json', blobSha: SHA, type: 'tag' }],
		]);
	});

	it('takes the id as the tail after the last hyphen of a slug containing hyphens', () => {
		const output = record(
			'n8n-export/projects/orders-Ab12cd34/workflows/my-hyphen-ated-slug-Wf01xy89/workflow.json',
		);

		const files = parseBaseBranchFiles(output, options);

		expect(files.get('Wf01xy89')).toMatchObject({ type: 'workflow' });
	});

	it('keeps NUL-delimited paths with spaces, Unicode and quotes intact', () => {
		const projectPath = 'n8n-export/projects/ünïcode "örders"-Ab12cd34/project.json';
		const variablePath = "n8n-export/variables/my 'quoted' vär-Va01/variable.json";
		const output = record(projectPath) + record(variablePath);

		const files = parseBaseBranchFiles(output, options);

		expect(files.get('Ab12cd34')).toEqual({ path: projectPath, blobSha: SHA, type: 'project' });
		expect(files.get("my 'quoted' vär")).toEqual({
			path: variablePath,
			blobSha: SHA,
			type: 'variable',
		});
	});

	it('keys variables by the name slug before the last hyphen instead of the id', () => {
		const output = record('n8n-export/variables/my-api-url-Va01/variable.json');

		const files = parseBaseBranchFiles(output, options);

		expect(files.get('my-api-url')).toMatchObject({ type: 'variable' });
		expect(files.has('Va01')).toBe(false);
	});

	it('skips entries that are not blobs', () => {
		const output = record('n8n-export/projects/orders-Ab12cd34/submodule.json', {
			mode: '160000',
			objectType: 'commit',
		});

		expect(parseBaseBranchFiles(output, options).size).toBe(0);
	});

	it('skips files that are not entity files', () => {
		const output = [
			record('n8n-export/projects/orders-Ab12cd34/notes.txt'),
			record('n8n-export/projects/orders-Ab12cd34/workflows/process-order-Wf01/README.md'),
			record('other-dir/projects/orders-Ab12cd34/project.json'),
		].join('');

		expect(parseBaseBranchFiles(output, options).size).toBe(0);
	});

	it('returns an empty map for empty output', () => {
		expect(parseBaseBranchFiles('', options).size).toBe(0);
	});
});
