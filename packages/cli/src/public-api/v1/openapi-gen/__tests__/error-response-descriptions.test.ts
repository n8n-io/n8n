import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

import { ERROR_RESPONSE_DESCRIPTIONS, ERROR_RESPONSE_REFS } from '../decorator-routes';

const REFS_DIR = path.resolve(__dirname, '../../handlers/workflows/spec/paths');

describe('ERROR_RESPONSE_DESCRIPTIONS', () => {
	it.each(Object.entries(ERROR_RESPONSE_REFS))(
		'matches the description in the shared response file for %s',
		(status, { $ref }) => {
			const file = parse(fs.readFileSync(path.resolve(REFS_DIR, $ref), 'utf8')) as {
				description: string;
			};

			expect(file.description).toBe(
				ERROR_RESPONSE_DESCRIPTIONS[Number(status) as keyof typeof ERROR_RESPONSE_DESCRIPTIONS],
			);
		},
	);
});
