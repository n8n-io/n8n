import { UnexpectedError } from '@n8n/errors';
import type { INodeType, INodeTypes } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { NodeTypesProviderMissingError, NodeTypesProxy } from '../node-types-proxy.service';

describe('NodeTypesProxy', () => {
	it('throws when no provider is registered', () => {
		const proxy = new NodeTypesProxy();

		expect(() => proxy.getByName('n8n-nodes-base.set')).toThrow(UnexpectedError);
		expect(() => proxy.getByNameAndVersion('n8n-nodes-base.set', 1)).toThrow(UnexpectedError);
		expect(() => proxy.getKnownTypes()).toThrow(UnexpectedError);
		expect(() => proxy.getByName('n8n-nodes-base.set')).toThrow(NodeTypesProviderMissingError);
	});

	it('delegates getByName to the registered provider', () => {
		const proxy = new NodeTypesProxy();
		const provider = mock<INodeTypes>();
		const nodeType = mock<INodeType>();
		provider.getByName.mockReturnValue(nodeType);
		proxy.registerProvider(provider);

		expect(proxy.getByName('n8n-nodes-base.set')).toBe(nodeType);
		expect(provider.getByName).toHaveBeenCalledWith('n8n-nodes-base.set');
	});

	it('delegates getByNameAndVersion to the registered provider', () => {
		const proxy = new NodeTypesProxy();
		const provider = mock<INodeTypes>();
		const nodeType = mock<INodeType>();
		provider.getByNameAndVersion.mockReturnValue(nodeType);
		proxy.registerProvider(provider);

		expect(proxy.getByNameAndVersion('n8n-nodes-base.set', 3)).toBe(nodeType);
		expect(provider.getByNameAndVersion).toHaveBeenCalledWith('n8n-nodes-base.set', 3);
	});

	it('delegates getKnownTypes to the registered provider', () => {
		const proxy = new NodeTypesProxy();
		const provider = mock<INodeTypes>();
		const knownTypes = { 'n8n-nodes-base.set': { className: 'Set', sourcePath: '' } };
		provider.getKnownTypes.mockReturnValue(knownTypes);
		proxy.registerProvider(provider);

		expect(proxy.getKnownTypes()).toBe(knownTypes);
	});

	it('propagates errors from the provider', () => {
		const proxy = new NodeTypesProxy();
		const provider = mock<INodeTypes>();
		const error = new Error('Unrecognized node type');
		provider.getByNameAndVersion.mockImplementation(() => {
			throw error;
		});
		proxy.registerProvider(provider);

		expect(() => proxy.getByNameAndVersion('n8n-nodes-base.unknown')).toThrow(error);
	});
});
