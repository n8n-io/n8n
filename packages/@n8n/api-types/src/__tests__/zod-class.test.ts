import { z } from 'zod';

import { Z } from '../zod-class';

describe('Z.array', () => {
	class TagIdDto extends Z.array(z.object({ id: z.string() })) {}

	it('exposes an array-rooted schema, not an object', () => {
		expect(TagIdDto.schema instanceof z.ZodArray).toBe(true);
	});

	it('parses a valid payload via the statics', () => {
		expect(TagIdDto.parse([{ id: 'a' }, { id: 'b' }])).toEqual([{ id: 'a' }, { id: 'b' }]);
		expect(TagIdDto.safeParse([{ id: 'a' }])).toMatchObject({
			success: true,
			data: [{ id: 'a' }],
		});
	});

	it('parses an empty array', () => {
		expect(TagIdDto.parse([])).toEqual([]);
	});

	it('rejects an invalid payload via the statics', () => {
		expect(TagIdDto.safeParse({ id: 'a' }).success).toBe(false);
		expect(TagIdDto.safeParse([{}]).success).toBe(false);
		expect(() => TagIdDto.parse([{}])).toThrow(z.ZodError);
	});

	it('constructs a JavaScript array, not an object with numeric keys, and applies the schema', () => {
		const dto = new TagIdDto([{ id: 'a' }, { id: 'b' }]);

		expect(Array.isArray(dto)).toBe(true);
		expect(dto).toEqual([{ id: 'a' }, { id: 'b' }]);
		expect(dto).toHaveLength(2);
		expect(dto.map((tag) => tag.id)).toEqual(['a', 'b']);

		// @ts-expect-error deliberately passing a payload the schema rejects
		expect(() => new TagIdDto([{}])).toThrow(z.ZodError);
	});
});
