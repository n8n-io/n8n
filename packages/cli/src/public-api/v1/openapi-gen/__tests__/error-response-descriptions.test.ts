import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

import { ERROR_RESPONSE_DESCRIPTIONS, ERROR_RESPONSE_REFS } from '../decorator-routes';

/**
 * `ERROR_RESPONSE_DESCRIPTIONS` restates what each shared response file says, because a response
 * that documents a body cannot `$ref` the file. This asserts the copy has not drifted.
 */
const REFS_DIR = path.resolve(__dirname, '../../handlers/workflows/spec/paths');

describe('ERROR_RESPONSE_DESCRIPTIONS', () => {
	it('covers every status in ERROR_RESPONSE_REFS', () => {
		expect(Object.keys(ERROR_RESPONSE_DESCRIPTIONS).sort()).toEqual(
			Object.keys(ERROR_RESPONSE_REFS).sort(),
		);
	});

	it.each(Object.entries(ERROR_RESPONSE_REFS))(
		'matches the description in the shared response file for %s',
		(status, { $ref }) => {
			const file = parse(fs.readFileSync(path.resolve(REFS_DIR, $ref), 'utf8')) as {
				description: string;
			};

			expect(file.description).toBe(ERROR_RESPONSE_DESCRIPTIONS[Number(status)]);
		},
	);
});
