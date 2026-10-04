import { Notion } from 'n8n-nodes-base/dist/nodes/Notion/Notion.node';
import type { IExecuteFunctions, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';

import {
	MIGRATED_NODES,
	migratedSlotOf,
	migratedTargetOf,
	withMigratedVersions,
} from '../migrated';
import { actionOfNode, actions } from '../index';
import { getManyDatabasePages } from '../nodes/notion/actions/database-page.get-all';
import { versionsOf } from '../registry';

const NOTION = 'n8n-nodes-base.notion';
const owned = { resource: ['databasePage'], operation: ['getAll'] };

const showsOnOwnedSlot = ({ displayOptions }: INodeProperties) =>
	[displayOptions?.show?.resource ?? ['databasePage']].flat().includes('databasePage') &&
	[displayOptions?.show?.operation ?? ['getAll']].flat().includes('getAll');

describe('migrated nodes', () => {
	const legacy = new Notion();
	const migrated = withMigratedVersions(NOTION, legacy, versionsOf);
	const v4 = migrated.getNodeType(4);

	it('add Notion v4 as the default version and keep v1 to v3', () => {
		expect(migrated.description.defaultVersion).toBe(4);
		expect(Object.keys(migrated.nodeVersions).map(Number).sort()).toEqual([1, 2, 2.1, 2.2, 3, 4]);
		expect(migrated.getNodeType(3)).toBe(legacy.getNodeType(3));
		expect(v4.description).toMatchObject({ name: 'notion', displayName: 'Notion', version: 4 });
	});

	it('keep only the legacy versions when the host does not load the action major of a slot', () => {
		expect(withMigratedVersions(NOTION, legacy, () => [])).toBe(legacy);
	});

	it('show the action fields on the owned slot and the legacy fields elsewhere', () => {
		const v3 = legacy.getNodeType(3).description.properties;
		const onOwned = v4.description.properties.filter(showsOnOwnedSlot).map(({ name }) => name);
		expect(onOwned).toEqual([
			'authentication',
			'notionNotice',
			'Credentials',
			'resource',
			'operation',
			'database',
			'where',
			'limit',
			'sort',
		]);
		const contract = v4.description.properties.filter(
			({ displayOptions }) => JSON.stringify(displayOptions?.show) === JSON.stringify(owned),
		);
		expect(contract.map(({ name }) => name)).toEqual(['database', 'where', 'limit', 'sort']);
		const unchanged = v3.filter((property) => !showsOnOwnedSlot(property));
		expect(unchanged.filter((property) => !v4.description.properties.includes(property))).toEqual(
			[],
		);
	});

	it('label the owned operation with the action name and keep the legacy credentials', () => {
		const operation = v4.description.properties.find(
			({ name, displayOptions }) =>
				name === 'operation' && displayOptions?.show?.resource?.includes('databasePage'),
		);
		expect(operation?.options).toContainEqual(
			expect.objectContaining({ value: 'getAll', action: getManyDatabasePages.action }),
		);
		expect(v4.description.credentials).toEqual(legacy.getNodeType(3).description.credentials);
	});

	it('run the owned slot through the frozen action and record its version', async () => {
		const parameters: Record<string, unknown> = {
			resource: 'databasePage',
			operation: 'getAll',
			authentication: 'apiKey',
			database: '0123456789abcdef0123456789abcdef',
			limit: 1,
		};
		const requests: Array<{ credentialType: string; method?: string; url: string }> = [];
		const setMetadata = vi.fn();
		const context = {
			getInputData: () => [{ json: {} }],
			getNode: () => ({
				id: '1',
				name: 'Get pages',
				type: NOTION,
				typeVersion: 4,
				position: [0, 0],
				parameters,
				credentials: { notionApi: { id: '1', name: 'Notion account' } },
			}),
			getNodeParameter: (name: string) => parameters[name],
			getCredentials: async () => ({}),
			continueOnFail: () => false,
			getExecutionCancelSignal: () => undefined,
			setMetadata,
			helpers: {
				httpRequestWithAuthentication: async (
					credentialType: string,
					options: IHttpRequestOptions,
				) => {
					requests.push({ credentialType, method: options.method, url: options.url });
					return options.url.endsWith('/query')
						? { results: [], has_more: false, next_cursor: null }
						: { data_sources: [{ id: 'ds1' }] };
				},
			},
		} as unknown as IExecuteFunctions;

		expect(await v4.execute?.call(context)).toEqual([[]]);
		expect(requests.map(({ credentialType }) => credentialType)).toEqual([
			'notionApi',
			'notionApi',
		]);
		expect(requests.at(-1)?.url).toBe('https://api.notion.com/v1/data_sources/ds1/query');
		const [head] = versionsOf('notion.databasePage.getAll');
		expect(setMetadata).toHaveBeenCalledWith({
			nodeContract: expect.objectContaining({
				action: 'notion.databasePage.getAll',
				version: head?.manifest.semver,
			}),
		});
	});

	it('find the slot and the action of a workflow node', () => {
		const node = {
			type: NOTION,
			typeVersion: 4,
			parameters: { resource: 'databasePage', operation: 'getAll' },
		};
		expect(migratedTargetOf(getManyDatabasePages)).toEqual({
			nodeType: NOTION,
			typeVersion: 4,
			resource: 'databasePage',
			operation: 'getAll',
		});
		expect(actionOfNode(node)).toBe(getManyDatabasePages);
		expect(actionOfNode({ ...node, parameters: { resource: 'page', operation: 'create' } })).toBe(
			undefined,
		);
		expect(migratedSlotOf({ ...node, typeVersion: 3 })).toBeUndefined();
		expect(
			actionOfNode({ type: '@n8n/nodes-base-next.notionDatabasePageGetAll', typeVersion: 1 }),
		).toBe(getManyDatabasePages);
	});

	it('run only actions with a bundled version of the slot major', () => {
		const slots = Object.values(MIGRATED_NODES).flatMap((versions) =>
			Object.values(versions).flatMap(({ slots: own }) => own),
		);
		const missing = slots.filter(
			({ action, major }) =>
				!actions.includes(action) ||
				!versionsOf(action.id).some(({ manifest }) => manifest.contract.version === major),
		);
		expect(missing).toEqual([]);
	});
});
