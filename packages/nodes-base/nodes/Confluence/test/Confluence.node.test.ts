import { NodeOperationError } from 'n8n-workflow';

import { Confluence } from '../Confluence.node';
import { mockExecuteCtx } from './shared';

describe('Confluence Node', () => {
	const node = new Confluence();

	const operationProperty = (resource: string) =>
		node.description.properties.find(
			(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes(resource),
		);
	const operationOptions = (resource: string) => operationProperty(resource)?.options;

	it('offers Cloud OAuth2 (default) and Service Account authentication', () => {
		const auth = node.description.properties.find((p) => p.name === 'authentication');
		expect(auth?.type).toBe('options');
		expect(auth?.default).toBe('cloudOAuth2');
		expect(auth?.options).toEqual([
			expect.objectContaining({ value: 'cloudOAuth2' }),
			expect.objectContaining({ value: 'serviceAccount' }),
		]);
	});

	it('gates each credential on its authentication value', () => {
		const credentials = node.description.credentials ?? [];
		const oauth = credentials.find((c) => c.name === 'confluenceCloudOAuth2Api');
		const serviceAccount = credentials.find((c) => c.name === 'atlassianServiceAccountApi');

		expect(oauth?.required).toBe(true);
		expect(oauth?.displayOptions?.show?.authentication).toEqual(['cloudOAuth2']);
		expect(serviceAccount?.required).toBe(true);
		expect(serviceAccount?.displayOptions?.show?.authentication).toEqual(['serviceAccount']);
	});

	it('should stay hidden and off the AI-tool surface while operations land', () => {
		expect(node.description.hidden).toBe(true);
		expect(node.description.properties.length).toBeGreaterThan(0);
		expect(node.description.usableAsTool).toBeUndefined();
	});

	it('should expose the page resource with its operations', () => {
		const resource = node.description.properties.find((p) => p.name === 'resource');
		expect(resource?.options).toEqual([
			expect.objectContaining({ value: 'attachment' }),
			expect.objectContaining({ value: 'page' }),
			expect.objectContaining({ value: 'search' }),
			expect.objectContaining({ value: 'space' }),
		]);

		expect(operationOptions('attachment')).toEqual([
			expect.objectContaining({ value: 'delete' }),
			expect.objectContaining({ value: 'getMany' }),
			expect.objectContaining({ value: 'upload' }),
		]);
		// Delete sorts first alphabetically; the default must stay non-destructive
		expect(operationProperty('attachment')?.default).toBe('getMany');
		expect(operationOptions('page')).toEqual([
			expect.objectContaining({ value: 'addComment' }),
			expect.objectContaining({ value: 'addLabels' }),
			expect.objectContaining({ value: 'append' }),
			expect.objectContaining({ value: 'create' }),
			expect.objectContaining({ value: 'delete' }),
			expect.objectContaining({ value: 'deleteComment' }),
			expect.objectContaining({ value: 'get' }),
			expect.objectContaining({ value: 'getComments' }),
			expect.objectContaining({ value: 'getLabels' }),
			expect.objectContaining({ value: 'getManyByLabel' }),
			expect.objectContaining({ value: 'removeLabel' }),
			expect.objectContaining({ value: 'update' }),
		]);
		expect(operationOptions('search')).toEqual([expect.objectContaining({ value: 'query' })]);
		expect(operationOptions('space')).toEqual([
			expect.objectContaining({ value: 'get' }),
			expect.objectContaining({ value: 'getMany' }),
		]);
	});

	it('carries the top-level Site selector on every resource', () => {
		for (const resource of ['attachment', 'page', 'search', 'space']) {
			const site = node.description.properties.find(
				(p) => p.name === 'site' && p.displayOptions?.show?.resource?.includes(resource),
			);
			expect(site?.type).toBe('resourceLocator');
			expect(site?.required).toBeUndefined();
			expect(site?.modes?.map((mode) => mode.name)).toEqual(['list', 'url']);
			expect(site?.modes?.[0].typeOptions?.searchListMethod).toBe('getSites');
		}
	});

	it('exposes the getLabels fields on the node description', () => {
		const forGetLabels = node.description.properties.filter((p) =>
			p.displayOptions?.show?.operation?.includes('getLabels'),
		);

		expect(forGetLabels.map((p) => p.name)).toEqual(
			expect.arrayContaining(['page', 'returnAll', 'limit', 'options']),
		);

		const limit = forGetLabels.find((p) => p.name === 'limit');
		expect(limit?.displayOptions?.show?.returnAll).toEqual([false]);
	});

	it('should render the label operations own fields', () => {
		const fieldsFor = (operation: string) =>
			node.description.properties
				.filter((p) => (p.displayOptions?.show?.operation ?? []).includes(operation))
				.map((p) => p.name);

		expect(fieldsFor('addLabels')).toEqual(['space', 'page', 'labels']);
		expect(fieldsFor('removeLabel')).toEqual(['space', 'page', 'labelName']);
	});

	it('should reference the credentials by name, each gated on its authentication value', () => {
		expect(node.description.credentials).toEqual([
			{
				name: 'confluenceCloudOAuth2Api',
				required: true,
				displayOptions: { show: { authentication: ['cloudOAuth2'] } },
			},
			{
				name: 'atlassianServiceAccountApi',
				required: true,
				displayOptions: { show: { authentication: ['serviceAccount'] } },
			},
		]);
	});

	it('should register under the confluence name', () => {
		expect(node.description.name).toBe('confluence');
		expect(node.description.displayName).toBe('Confluence');
		expect(node.description.version).toBe(1);
	});

	it('should throw a NodeOperationError when executed without an operation', async () => {
		const promise = node.execute.call(mockExecuteCtx({}));

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow('The operation ":" is not supported');
	});
});
