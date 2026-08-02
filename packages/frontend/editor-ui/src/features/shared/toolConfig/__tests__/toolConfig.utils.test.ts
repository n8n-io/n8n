import type { INodeTypeDescription } from 'n8n-workflow';

import { omitOperationOptions } from '../toolConfig.utils';

const makeDescription = (): INodeTypeDescription => ({
	displayName: 'Test Tool',
	name: 'n8n-nodes-base.testTool',
	group: ['transform'],
	version: 1,
	description: 'A test tool',
	defaults: { name: 'Test Tool' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			options: [{ name: 'Message', value: 'message' }],
			default: 'message',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			options: [
				{ name: 'Send', value: 'post' },
				{ name: 'Send and Wait', value: 'sendAndWait' },
			],
			default: 'sendAndWait',
		},
		{
			displayName: 'Other Operation',
			name: 'operation',
			type: 'options',
			options: [
				{ name: 'Dispatch', value: 'dispatch' },
				{ name: 'Dispatch and Wait', value: 'dispatchAndWait' },
			],
			default: 'dispatch',
		},
	],
});

describe('omitOperationOptions', () => {
	it('removes the given operations from every operation property', () => {
		const result = omitOperationOptions(makeDescription(), ['sendAndWait', 'dispatchAndWait']);

		const operationProperties = result.properties.filter(
			(property) => property.name === 'operation',
		);
		expect(operationProperties).toMatchObject([
			{ options: [{ name: 'Send', value: 'post' }] },
			{ options: [{ name: 'Dispatch', value: 'dispatch' }] },
		]);
	});

	it('remaps the default when it pointed at a removed operation', () => {
		const result = omitOperationOptions(makeDescription(), ['sendAndWait']);

		const operationProperty = result.properties.find((property) => property.name === 'operation');
		expect(operationProperty?.default).toBe('post');
	});

	it('keeps the default when it is not removed', () => {
		const result = omitOperationOptions(makeDescription(), ['dispatchAndWait']);

		const otherOperation = result.properties.filter((property) => property.name === 'operation')[1];
		expect(otherOperation.default).toBe('dispatch');
	});

	it('does not touch non-operation properties', () => {
		const result = omitOperationOptions(makeDescription(), ['message']);

		const resourceProperty = result.properties.find((property) => property.name === 'resource');
		expect(resourceProperty?.options).toEqual([{ name: 'Message', value: 'message' }]);
	});

	it('does not mutate the input description', () => {
		const description = makeDescription();

		omitOperationOptions(description, ['sendAndWait']);

		const operationProperty = description.properties.find(
			(property) => property.name === 'operation',
		);
		expect(operationProperty?.options).toHaveLength(2);
		expect(operationProperty?.default).toBe('sendAndWait');
	});
});
