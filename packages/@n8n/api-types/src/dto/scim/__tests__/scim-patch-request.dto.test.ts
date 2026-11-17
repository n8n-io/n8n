import { ScimPatchRequestDto } from '../scim-patch-request.dto';

describe('ScimPatchRequestDto', () => {
	it.each(['replace', 'Replace', 'REPLACE'])('accepts the operation %s as replace', (op) => {
		const result = ScimPatchRequestDto.safeParse({
			Operations: [{ op, path: 'active', value: false }],
		});

		expect(result.data?.Operations).toEqual([{ op: 'replace', path: 'active', value: false }]);
	});

	it.each([
		['Add', 'add'],
		['Remove', 'remove'],
	])('accepts the operation %s', (op, expected) => {
		const result = ScimPatchRequestDto.safeParse({ Operations: [{ op, path: 'title' }] });

		expect(result.data?.Operations[0].op).toBe(expected);
	});

	it.each([
		['an unknown operation', 'move'],
		['a missing operation', undefined],
	])('rejects %s', (_, op) => {
		expect(ScimPatchRequestDto.safeParse({ Operations: [{ op }] }).success).toBe(false);
	});
});
