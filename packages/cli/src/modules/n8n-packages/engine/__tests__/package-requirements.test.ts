import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { CredentialRequirementsExtractor } from '../../entities/credential/credential-requirements.extractor';
import { DataTableRequirementsExtractor } from '../../entities/data-table/data-table-requirements.extractor';
import { VariableRequirementsExtractor } from '../../entities/variable/variable-requirements.extractor';
import { WorkflowSerializer } from '../../entities/workflow/workflow.serializer';
import { DirectoryPackageReader } from '../../io/directory/directory-package-reader';
import { readPackageEntries } from '../package-entries';
import { PackageRequirementsReader } from '../package-requirements';

const limits = {
	maxUncompressedBytes: 10 * 1024 * 1024,
	maxEntryBytes: 1024 * 1024,
	maxEntries: 1000,
	maxPathLength: 1024,
};

const node = (overrides: Record<string, unknown> = {}) => ({
	id: 'n1',
	name: 'Node',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...overrides,
});

const workflow = (id: string, overrides: Record<string, unknown> = {}) =>
	JSON.stringify({
		id,
		name: id.toUpperCase(),
		nodes: [],
		connections: {},
		versionId: `version-${id}`,
		parentFolderId: null,
		isPublished: false,
		isArchived: false,
		...overrides,
	});

const entity = (id: string, name: string) => JSON.stringify({ id, name });

describe('PackageRequirementsReader', () => {
	let root: string;

	const reader = new PackageRequirementsReader(
		new WorkflowSerializer(),
		new CredentialRequirementsExtractor(),
		new DataTableRequirementsExtractor(),
		new VariableRequirementsExtractor(),
	);

	const writeTree = async (files: Record<string, string>) => {
		for (const [filePath, content] of Object.entries(files)) {
			const fullPath = path.join(root, filePath);
			await mkdir(path.dirname(fullPath), { recursive: true });
			await writeFile(fullPath, content);
		}
	};

	const read = async () => {
		const packageReader = new DirectoryPackageReader(root, limits);
		return await reader.read(packageReader, await readPackageEntries(packageReader));
	};

	beforeEach(async () => {
		root = await mkdtemp(path.join(tmpdir(), 'n8n-package-requirements-'));
	});

	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});

	it('collects a credential from the node that references it', async () => {
		await writeTree({
			'projects/alpha/workflows/w1/workflow.json': workflow('w1', {
				nodes: [node({ credentials: { httpBasicAuth: { id: 'c1', name: 'Stripe' } } })],
			}),
		});

		expect((await read())?.credentials).toEqual([
			{ id: 'c1', name: 'Stripe', type: 'httpBasicAuth', usedByWorkflows: ['w1'] },
		]);
	});

	it('folds one dependency used by two workflows into one requirement', async () => {
		const nodes = [node({ credentials: { httpBasicAuth: { id: 'c1', name: 'Stripe' } } })];
		await writeTree({
			'projects/alpha/workflows/w1/workflow.json': workflow('w1', { nodes }),
			'projects/alpha/workflows/w2/workflow.json': workflow('w2', { nodes }),
		});

		expect((await read())?.credentials).toEqual([
			{ id: 'c1', name: 'Stripe', type: 'httpBasicAuth', usedByWorkflows: ['w1', 'w2'] },
		]);
	});

	it('collects a variable from an expression, in a parameter and in the settings', async () => {
		await writeTree({
			'projects/alpha/workflows/w1/workflow.json': workflow('w1', {
				nodes: [node({ parameters: { url: '={{ $vars.API_HOST }}/orders' } })],
				settings: { errorWorkflow: '={{ $vars["FALLBACK"] }}' },
			}),
		});

		expect((await read())?.variables).toEqual([
			{ name: 'API_HOST', usedByWorkflows: ['w1'] },
			{ name: 'FALLBACK', usedByWorkflows: ['w1'] },
		]);
	});

	it('names a tag from the bundled tag entry, and falls back to its id', async () => {
		await writeTree({
			'tags/urgent/tag.json': entity('t1', 'Urgent'),
			'projects/alpha/workflows/w1/workflow.json': workflow('w1', {
				tagIds: ['t1', 't-unbundled'],
			}),
		});

		expect((await read())?.tags).toEqual([
			{ id: 't1', name: 'Urgent', usedByWorkflows: ['w1'] },
			{ id: 't-unbundled', name: 't-unbundled', usedByWorkflows: ['w1'] },
		]);
	});

	it('names a referenced workflow when the package holds it', async () => {
		await writeTree({
			'projects/alpha/workflows/child/workflow.json': workflow('w-child'),
			'projects/alpha/workflows/w1/workflow.json': workflow('w1', {
				nodes: [
					node({
						type: 'n8n-nodes-base.executeWorkflow',
						parameters: { workflowId: { __rl: true, mode: 'list', value: 'w-child' } },
					}),
				],
			}),
		});

		expect((await read())?.workflows).toEqual([
			{ id: 'w-child', name: 'W-CHILD', usedByWorkflows: ['w1'] },
		]);
	});

	it('folds node types into unique type and version pairs', async () => {
		await writeTree({
			'projects/alpha/workflows/w1/workflow.json': workflow('w1', {
				nodes: [node(), node({ id: 'n2', typeVersion: 2 })],
			}),
		});

		expect((await read())?.nodeTypes).toEqual([
			{ type: 'n8n-nodes-base.httpRequest', typeVersion: 1, usedByWorkflows: ['w1'] },
			{ type: 'n8n-nodes-base.httpRequest', typeVersion: 2, usedByWorkflows: ['w1'] },
		]);
	});

	it('states nothing for a package whose workflows need nothing', async () => {
		await writeTree({ 'projects/alpha/workflows/w1/workflow.json': workflow('w1') });

		expect(await read()).toBeUndefined();
	});

	it('rejects a workflow file that is not a valid export', async () => {
		await writeTree({
			'projects/alpha/workflows/w1/workflow.json': JSON.stringify({ id: 'w1', name: 'W1' }),
		});

		await expect(read()).rejects.toThrow('failed validation at "projects/alpha/workflows/w1"');
	});
});
