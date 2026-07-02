/* eslint-disable import-x/no-extraneous-dependencies -- test-only source assertion */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(
	resolve(dirname(fileURLToPath(import.meta.url)), '../views/AgentSessionsListView.vue'),
	'utf8',
);

describe('AgentSessionsListView', () => {
	it('can defer outer padding to the builder tab panel when embedded', () => {
		expect(componentSource).toContain('embedded?: boolean');
		expect(componentSource).toContain('{ [$style.embedded]: props.embedded }');
		expect(componentSource).toContain('.embedded');
		expect(componentSource).toContain('padding: 0;');
	});
});
