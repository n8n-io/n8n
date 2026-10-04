import { parseReply } from '../index';
import type { JsonSchema } from '../schema';

const replyOf = (text: string) => ({ text, toolCalls: [], finishReason: 'stop' });

const invoice: JsonSchema = {
	type: 'object',
	properties: {
		supplier: { type: 'string' },
		total: { type: 'string' },
		note: { anyOf: [{ type: 'string' }, { type: 'null' }] },
		lines: {
			type: 'array',
			items: { type: 'object', properties: { sku: { type: 'string' } }, required: [] },
		},
	},
	required: ['supplier'],
};

describe('parseReply', () => {
	it('drops a null field that the schema does not require', () => {
		const reply = replyOf(
			'{"supplier":"Bergbau AG","total":null,"note":null,"lines":[{"sku":null}]}',
		);

		expect(parseReply(reply, invoice)).toEqual({
			supplier: 'Bergbau AG',
			note: null,
			lines: [{}],
		});
	});

	it('fails on a null field that the schema requires', () => {
		expect(() => parseReply(replyOf('{"supplier":null}'), invoice)).toThrow(
			'The model reply does not match the schema: output.supplier: must be string, got null',
		);
	});
});
