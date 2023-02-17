import type { IExecuteFunctions } from 'n8n-workflow';
import { createSimplifyFunction, prepareOptions, prepareEmbeds } from '../../v2/helpers/utils';

describe('Test createSimplifyFunction', () => {
	it('should create function', () => {
		const result = createSimplifyFunction(['message_reference']);
		expect(result).toBeDefined();
		expect(typeof result).toBe('function');
	});

	it('should return object containing only specified fields', () => {
		const simplify = createSimplifyFunction(['id', 'name']);
		const data = {
			id: '123',
			name: 'test',
			type: 'test',
			randomField: 'test',
		};
		const result = simplify(data);
		expect(result).toEqual({
			id: '123',
			name: 'test',
		});
	});
});

describe('Test prepareOptions', () => {
	it('should return correct flag value', () => {
		const result = prepareOptions({
			flags: ['SUPPRESS_EMBEDS', 'SUPPRESS_NOTIFICATIONS'],
		});
		expect(result.flags).toBe((1 << 2) + (1 << 12));
	});

	it('should convert message_reference', () => {
		const result = prepareOptions(
			{
				message_reference: '123456',
			},
			'789000',
		);
		expect(result.message_reference).toEqual({
			message_id: '123456',
			guild_id: '789000',
		});
	});
});

describe('Test prepareEmbeds', () => {
	it('should return return empty object removing empty strings', () => {
		const embeds = [
			{
				test1: 'test',
				test2: 'test',
			},
		];

		const executeFunction = {};

		const result = prepareEmbeds.call(executeFunction as unknown as IExecuteFunctions, embeds);

		expect(result).toEqual(embeds);
	});
});
