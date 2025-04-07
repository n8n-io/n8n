import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { mock } from 'jest-mock-extended';
import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';

import { getTools } from './loadOptions';

jest.mock('@modelcontextprotocol/sdk/client/sse.js');
jest.mock('@modelcontextprotocol/sdk/client/index.js');

describe('ToolMcpClient', () => {
	describe('loadOptions: getTools', () => {
		it('should return a list of tools', async () => {
			const result = await getTools.call(
				mock<ILoadOptionsFunctions>({ getNode: jest.fn(() => mock<INode>({ typeVersion: 1 })) }),
			);

			jest.spyOn(Client.prototype, 'connect').mockResolvedValue();

			expect(result).toEqual([]);
		});
	});
});
