import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { BRANCH_PACKAGE_SOURCE_ID, manifestFromFiles } from '../package-manifest';
import { writeWorkflowRequirementFiles } from '../workflow-requirements';

const PROJECT = 'projects/alpha-p1';
const W1 = `${PROJECT}/workflows/one-w1`;
const W2 = `${PROJECT}/workflows/two-w2`;

const exported: PackageManifest = {
	packageFormatVersion: '1',
	sourceN8nVersion: '1.0.0',
	sourceId: 'source',
	projects: [{ id: 'p1', name: 'Alpha', target: PROJECT }],
	workflows: [
		{ id: 'w1', name: 'One', target: W1, isArchived: false },
		{ id: 'w2', name: 'Two', target: W2, isArchived: true },
	],
	requirements: {
		credentials: [
			{
				id: 'c1',
				name: 'Shared',
				type: 'httpBasicAuth',
				usedBy: [
					{ kind: 'workflow', id: 'w1' },
					{ kind: 'workflow', id: 'w2' },
				],
			},
		],
		variables: [{ name: 'API_KEY', usedBy: [{ kind: 'workflow', id: 'w2' }] }],
		nodeTypes: [
			{ type: 'n8n-nodes-base.set', typeVersion: 3, usedBy: [{ kind: 'workflow', id: 'w1' }] },
		],
	},
};

describe('package-manifest', () => {
	let folder: string;

	beforeEach(async () => {
		folder = await mkdtemp(path.join(tmpdir(), 'n8n-package-manifest-'));
		await mkdir(path.join(folder, W1), { recursive: true });
		await mkdir(path.join(folder, W2), { recursive: true });
		await writeFile(path.join(folder, PROJECT, 'project.json'), '{"id":"p1","name":"Alpha"}');
		await writeFile(path.join(folder, W1, 'workflow.json'), '{"id":"w1","name":"One"}');
		await writeFile(
			path.join(folder, W2, 'workflow.json'),
			'{"id":"w2","name":"Two","isArchived":true}',
		);
		await writeFile(path.join(folder, 'manifest.json'), '{"stale":true}');
	});

	afterEach(async () => {
		await rm(folder, { recursive: true, force: true });
	});

	const readFolder = async (): Promise<Array<[string, string]>> => {
		const files: Array<[string, string]> = [];
		for (const target of [PROJECT, W1, W2]) {
			for (const name of ['project.json', 'workflow.json', 'requirements.json']) {
				const file = `${target}/${name}`;
				const content = await readFile(path.join(folder, file), 'utf-8').catch(() => undefined);
				if (content !== undefined) files.push([file, content]);
			}
		}
		return files;
	};

	it('writes a requirements file for each workflow and no manifest', async () => {
		await writeWorkflowRequirementFiles(folder, exported);

		await expect(stat(path.join(folder, 'manifest.json'))).rejects.toThrow();
		expect(JSON.parse(await readFile(path.join(folder, W1, 'requirements.json'), 'utf-8'))).toEqual(
			{
				credentials: [{ id: 'c1', name: 'Shared', type: 'httpBasicAuth' }],
			},
		);
		expect(JSON.parse(await readFile(path.join(folder, W2, 'requirements.json'), 'utf-8'))).toEqual(
			{
				credentials: [{ id: 'c1', name: 'Shared', type: 'httpBasicAuth' }],
				variables: [{ name: 'API_KEY' }],
			},
		);
	});

	it('removes the requirements file of a workflow that has none any more', async () => {
		await writeWorkflowRequirementFiles(folder, exported);

		await writeWorkflowRequirementFiles(folder, { ...exported, requirements: undefined });

		await expect(stat(path.join(folder, W1, 'requirements.json'))).rejects.toThrow();
		await expect(stat(path.join(folder, W2, 'requirements.json'))).rejects.toThrow();
	});

	it('rebuilds the exported manifest from the files, apart from the header and the node types', async () => {
		await writeWorkflowRequirementFiles(folder, exported);

		const manifest = manifestFromFiles(await readFolder());

		const { nodeTypes: _nodeTypes, ...requirements } = exported.requirements ?? {};
		expect(manifest).toMatchObject({
			packageFormatVersion: '1',
			sourceId: BRANCH_PACKAGE_SOURCE_ID,
			projects: exported.projects,
			workflows: exported.workflows,
			requirements,
		});
	});

	it('does not read a manifest that an older branch still holds', () => {
		const manifest = manifestFromFiles([
			['manifest.json', JSON.stringify({ ...exported, workflows: [], projects: [] })],
			[`${PROJECT}/project.json`, '{"id":"p1","name":"Alpha"}'],
		]);

		expect(manifest.projects).toHaveLength(1);
		expect(manifest.workflows).toBeUndefined();
		expect(manifest.requirements).toBeUndefined();
	});

	it('refuses a requirements file that is not valid', () => {
		expect(() =>
			manifestFromFiles([
				[`${W1}/workflow.json`, '{"id":"w1","name":"One"}'],
				[`${W1}/requirements.json`, '{not-json'],
			]),
		).toThrow('is not valid');
	});
});
