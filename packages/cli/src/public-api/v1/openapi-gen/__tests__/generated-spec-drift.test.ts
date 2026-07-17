import fs from 'node:fs';
import path from 'node:path';

import { getGeneratedArtifacts } from '../generate';

/**
 * Drift guard: the `*.generated.yml` files are committed to the repo AND regenerated in place by
 * `build:data` on every build. This asserts the committed copies still match a fresh generation,
 * so a DTO/schema change that isn't accompanied by a rebuild can't silently land a stale spec on
 * master. `__dirname` is `<v1>/openapi-gen/__tests__`, so the v1 dir is two levels up.
 */
const V1_DIR = path.resolve(__dirname, '../..');

describe('generated OpenAPI spec is up to date', () => {
	it.each(getGeneratedArtifacts())(
		'committed $outputPath matches a fresh generation',
		({ outputPath, content }) => {
			const committed = fs.readFileSync(path.join(V1_DIR, outputPath), 'utf8');
			expect(committed).toBe(content);
		},
	);
});
