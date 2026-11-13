import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifest = JSON.parse(
	readFileSync(resolve(__dirname, '../../package.json'), 'utf8'),
) as Record<string, Record<string, string> | undefined>;

describe('package manifest', () => {
	it.each(['dependencies', 'peerDependencies', 'optionalDependencies'])(
		'declares no %s',
		(field) => {
			expect(Object.keys(manifest[field] ?? {})).toHaveLength(0);
		},
	);
});
