import { API_KEY_RESOURCES } from '@n8n/permissions';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

import { resolvePublicApiRoutes, scopesInRequirement } from '../../public-api-route-resolver';

import '../controllers';

vi.unmock('node:fs');

const PUBLIC_API_ROOT = path.resolve(__dirname, '..', '..');
const OPENAPI_SPEC_PATH = path.join(PUBLIC_API_ROOT, 'v1', 'openapi.yml');

describe('Public API scope parity', () => {
	test('openapi.yml tags are sorted alphabetically by name', () => {
		const spec = yaml.parse(fs.readFileSync(OPENAPI_SPEC_PATH, 'utf8')) as {
			tags?: Array<{ name: string }>;
		};
		const tagNames = (spec.tags ?? []).map((tag) => tag.name);
		const sorted = [...tagNames].sort((a, b) => (a < b ? -1 : 1));
		expect(tagNames).toEqual(sorted);
	});

	test('every API key scope in API_KEY_RESOURCES is consumed by at least one endpoint', () => {
		const consumed = new Set<string>(
			resolvePublicApiRoutes().flatMap((route) =>
				route.apiKeyScope ? scopesInRequirement(route.apiKeyScope) : [],
			),
		);
		const declared = new Set<string>();
		for (const [resource, operations] of Object.entries(API_KEY_RESOURCES)) {
			for (const operation of operations) {
				declared.add(`${resource}:${operation}`);
			}
		}
		const orphans = [...declared].filter((scope) => !consumed.has(scope));
		expect(orphans).toEqual([]);
	});
});
