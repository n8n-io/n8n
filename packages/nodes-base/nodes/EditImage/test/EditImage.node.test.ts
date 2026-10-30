import { mockDeep } from 'vitest-mock-extended';

import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { EditImage } from '../EditImage.node';

describe('Edit Image legacy versions', () => {
	it.each([1, 1.1])('fails explicitly for version %s', async (typeVersion) => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		const node: INode = {
			id: 'test-node-id',
			name: 'Edit Image',
			type: 'n8n-nodes-base.editImage',
			typeVersion,
			position: [0, 0],
			parameters: {},
		};
		executeFunctions.getNode.mockReturnValue(node);

		await expect(new EditImage().execute.call(executeFunctions)).rejects.toThrow(
			'Edit Image versions 1 and 1.1 are no longer supported. Upgrade the node to version 2.',
		);
	});
});
