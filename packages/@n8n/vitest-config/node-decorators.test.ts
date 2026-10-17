import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { backendTestUtilsSourceAlias } from './node-decorators.js';

describe('backendTestUtilsSourceAlias', () => {
	it('resolves backend test utilities from source for a consuming package', () => {
		const packageDir = dirname(fileURLToPath(import.meta.url));
		const backendServicesDir = join(packageDir, '../backend-services');

		expect(backendTestUtilsSourceAlias(backendServicesDir)).toEqual([
			{
				find: /^@n8n\/backend-test-utils$/,
				replacement: join(packageDir, '../backend-test-utils/src/index.ts'),
			},
		]);
	});

	it('does not add an alias when the package is unavailable', () => {
		expect(backendTestUtilsSourceAlias('/')).toEqual([]);
	});
});
