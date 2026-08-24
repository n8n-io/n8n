import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { Confluence } from '../Confluence.node';

describe('Confluence Node', () => {
	const node = new Confluence();

	it('should stay hidden and off the AI-tool surface while operations land', () => {
		expect(node.description.hidden).toBe(true);
		expect(node.description.properties.length).toBeGreaterThan(0);
		expect(node.description.usableAsTool).toBeUndefined();
	});

	it('should expose the attachment and page resources with their operations', () => {
		const resource = node.description.properties.find((p) => p.name === 'resource');
		expect(resource?.options).toEqual([
			expect.objectContaining({ value: 'attachment' }),
			expect.objectContaining({ value: 'page' }),
		]);

		const operations = node.description.properties.filter((p) => p.name === 'operation');
		const operationsFor = (resourceName: string) =>
			operations.find((p) => (p.displayOptions?.show?.resource ?? []).includes(resourceName));
		expect(operationsFor('attachment')?.options).toEqual([
			expect.objectContaining({ value: 'getMany' }),
		]);
		expect(operationsFor('page')?.options).toEqual([
			expect.objectContaining({ value: 'append' }),
			expect.objectContaining({ value: 'create' }),
			expect.objectContaining({ value: 'delete' }),
			expect.objectContaining({ value: 'get' }),
			expect.objectContaining({ value: 'update' }),
		]);
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
		const ctx = mockDeep<IExecuteFunctions>();
		ctx.getInputData.mockReturnValue([{ json: {} }]);
		ctx.getNodeParameter.mockImplementation(
			(_name: string, _itemIndex?: number, fallback?: unknown) => fallback as never,
		);
		ctx.getNode.mockReturnValue({
			id: 'test-node',
			name: 'Test Confluence Node',
			type: 'n8n-nodes-base.confluence',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});

		const promise = node.execute.call(ctx);

		await expect(promise).rejects.toThrow(NodeOperationError);
		await expect(promise).rejects.toThrow('The operation ":" is not supported');
	});
});
