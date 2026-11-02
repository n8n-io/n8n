import { deriveLists, readDerivedLists } from '../branch-manifest';

const PROJECT = 'projects/team-p1';
const FOLDER = `${PROJECT}/folders/sales-f1`;
const WORKFLOW = `${FOLDER}/workflows/lead-w1`;

const files = new Map<string, string>([
	[`${PROJECT}/project.json`, JSON.stringify({ id: 'p1', name: 'Team' })],
	[`${FOLDER}/folder.json`, JSON.stringify({ id: 'f1', name: 'Sales' })],
	[`${WORKFLOW}/workflow.json`, JSON.stringify({ id: 'w1', name: 'Lead', isArchived: true })],
	[`${WORKFLOW}/workflow-metadata.json`, JSON.stringify({ id: 'ignored', name: 'ignored' })],
	['credentials/slack-c1/credential.json', JSON.stringify({ id: 'c1', name: 'Slack' })],
	['variables/var-v1/variable.json', JSON.stringify({ name: 'VAR', type: 'string' })],
]);

describe('branch-manifest', () => {
	describe('deriveLists', () => {
		it('reads id, name, target and archive state from the entity files', () => {
			expect(deriveLists(files)).toEqual({
				projects: [{ id: 'p1', name: 'Team', target: PROJECT }],
				folders: [{ id: 'f1', name: 'Sales', target: FOLDER }],
				workflows: [{ id: 'w1', name: 'Lead', target: WORKFLOW, isArchived: true }],
				credentials: [{ id: 'c1', name: 'Slack', target: 'credentials/slack-c1' }],
				variables: [{ id: 'v1', name: 'VAR', target: 'variables/var-v1' }],
			});
		});

		it('ignores files that are not entity files or sit in the wrong directory', () => {
			const lists = deriveLists([
				['manifest.json', '{}'],
				['workflows/lead-w1/folder.json', '{"id":"x","name":"x"}'],
				['lead-w1/workflow.json', '{"id":"x","name":"x"}'],
			]);

			expect(lists).toEqual({});
		});

		it('keeps the directory name when a file cannot be read', () => {
			expect(deriveLists([['workflows/lead-w9/workflow.json', '{not-json']])).toEqual({
				workflows: [{ id: 'w9', name: 'lead', target: 'workflows/lead-w9', isArchived: false }],
			});
		});

		it('lists one variable for the two directories that a renamed variable leaves', () => {
			const lists = deriveLists([
				['variables/old-v1/variable.json', '{"name":"old","type":"string"}'],
				['variables/new-v1/variable.json', '{"name":"new","type":"string"}'],
			]);

			expect(lists.variables).toEqual([{ id: 'v1', name: 'new', target: 'variables/new-v1' }]);
		});

		it('lists entries in the same order whatever the order of the files', () => {
			const reversed = deriveLists([...files].reverse());

			expect(reversed).toEqual(deriveLists(files));
		});
	});

	describe('readDerivedLists', () => {
		const paths = ['manifest.json', ...files.keys()].map((path) => `n8n/${path}`);

		it('reads the contents below the prefix', async () => {
			const readFiles = vi.fn(async (requested: string[]) => {
				return await Promise.resolve(
					new Map(requested.map((path) => [path, files.get(path.slice('n8n/'.length)) ?? ''])),
				);
			});

			const lists = await readDerivedLists({ paths, prefix: 'n8n', readFiles });

			expect(lists).toEqual(deriveLists(files));
			expect(readFiles).toHaveBeenCalledTimes(1);
			expect(readFiles.mock.calls[0][0]).toEqual(
				paths.filter((path) => /(project|folder|workflow|credential|variable)\.json$/.test(path)),
			);
		});

		it('keeps the directory name of a file that it does not read', async () => {
			const readFiles = vi.fn(async () => await Promise.resolve(new Map<string, string>()));

			const lists = await readDerivedLists({
				paths,
				prefix: 'n8n',
				readFiles,
				readsContentOf: (path) => path.endsWith('/project.json'),
			});

			expect(readFiles).toHaveBeenCalledWith([`n8n/${PROJECT}/project.json`]);
			expect(lists.workflows).toEqual([
				{ id: 'w1', name: 'lead', target: WORKFLOW, isArchived: false },
			]);
		});
	});
});
