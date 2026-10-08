import { embeddedCompatTypeOf } from '../catalog';
import { firstParty } from './first-party';

describe('contractCatalogOf', () => {
	const entryOf = (id: string) => firstParty.entries.find(({ manifest }) => manifest.id === id);

	it('lists the newest embedded version of each contract with its package, node type and path', () => {
		expect(entryOf('notion.databasePage.getAll')).toMatchObject({
			package: '@n8n/nodes-integrations',
			nodeType: '@n8n/nodes-integrations.notionDatabasePageGetAll',
			resource: 'databasePage',
			operation: 'getAll',
		});
		expect(entryOf('noOp.pass')).toMatchObject({
			package: '@n8n/nodes-core',
			nodeType: '@n8n/nodes-core.noOpPass',
			operation: 'pass',
		});
		expect(entryOf('noOp.pass')?.resource).toBeUndefined();
		expect(entryOf('httpRequest.get')?.toolType).toBe('@n8n/nodes-core.httpRequestGetTool');
		expect(entryOf('code.javaScript')?.toolType).toBeUndefined();
		expect(entryOf('webhook.trigger')?.manifest).toMatchObject({
			native: { type: 'n8n-nodes-base.webhook' },
		});
		const ids = firstParty.entries.map(({ manifest }) => manifest.id);
		expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
		expect(firstParty.packageOf('noOp.pass')?.name).toBe('@n8n/nodes-core');
		expect(firstParty.packageOf('community.thing.do')).toBeUndefined();
	});

	it('evaluates the embedded bundle of an id once, and has none for a native contract', () => {
		const bundle = firstParty.bundleOf('httpRequest.get');
		expect(bundle && 'deriveOutput' in bundle && typeof bundle.deriveOutput).toBe('function');
		expect(firstParty.bundleOf('httpRequest.get')).toBe(bundle);
		expect(firstParty.bundleOf('webhook.trigger')).toBeUndefined();
	});
});

describe('embeddedCompatTypeOf', () => {
	it('reads a compat type with its fields and base URL from an embedded bundle', () => {
		expect(embeddedCompatTypeOf(firstParty, 'microsoftTeamsOAuth2Api')).toMatchObject({
			name: 'microsoftTeamsOAuth2Api',
			scheme: { kind: 'compat' },
			baseUrl: '{graphApiBaseUrl}',
		});
		expect(embeddedCompatTypeOf(firstParty, 'githubOAuth2Api')).toBeUndefined();
		expect(embeddedCompatTypeOf(firstParty, 'unknownApi')).toBeUndefined();
	});
});
