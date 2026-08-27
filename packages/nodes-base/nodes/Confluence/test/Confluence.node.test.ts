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
			expect.objectContaining({ value: 'append' }),
			expect.objectContaining({ value: 'create' }),
			expect.objectContaining({ value: 'delete' }),
			expect.objectContaining({ value: 'get' }),
			expect.objectContaining({ value: 'getComments' }),
			expect.objectContaining({ value: 'getLabels' }),
			expect.objectContaining({ value: 'getManyByLabel' }),
			expect.objectContaining({ value: 'update' }),
		]);
		expect(operationOptions('search')).toEqual([expect.objectContaining({ value: 'query' })]);
		expect(operationOptions('space')).toEqual([
			expect.objectContaining({ value: 'get' }),
			expect.objectContaining({ value: 'getMany' }),
		]);
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

	it('should reference the confluenceCloudOAuth2Api credential by name', () => {
		expect(node.description.credentials).toEqual([
			{ name: 'confluenceCloudOAuth2Api', required: true },
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
