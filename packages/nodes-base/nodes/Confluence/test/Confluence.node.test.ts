import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { router } from '../actions/router';
import { Confluence } from '../Confluence.node';

describe('Confluence Node', () => {
	const node = new Confluence();

	it('should be hidden', () => {
		expect(node.description.hidden).toBe(true);
	});

	it('should reference the confluenceCloudOAuth2Api credential by name', () => {
		expect(node.description.credentials).toEqual([
			{ name: 'confluenceCloudOAuth2Api', required: true },
		]);
	});

	it('should ship no properties yet', () => {
		expect(node.description.properties).toEqual([]);
	});

	it('should not be usable as a tool yet', () => {
		expect(node.description.usableAsTool).toBeUndefined();
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

		await expect(router.call(ctx)).rejects.toThrow(NodeOperationError);
	});
});
