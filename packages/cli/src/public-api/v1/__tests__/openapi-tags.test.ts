import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

import { resolvePublicApiRoutes } from '../../public-api-route-resolver';

import '../controllers';

vi.unmock('node:fs');

const OPENAPI_SPEC_PATH = path.resolve(__dirname, '..', 'openapi.yml');

interface TagDeclaration {
	name: string;
	description?: string;
	'x-displayName'?: string;
	'x-parent'?: string;
}

const spec = yaml.parse(fs.readFileSync(OPENAPI_SPEC_PATH, 'utf8')) as {
	tags?: TagDeclaration[];
};
const tags = spec.tags ?? [];
// A parent tag has no `x-parent`. It groups child tags and has no operations.
const parentTags = tags.filter((tag) => tag['x-parent'] === undefined);
const childTags = tags.filter((tag) => tag['x-parent'] !== undefined);
const parentNames = new Set(parentTags.map((tag) => tag.name));
const childNames = new Set(childTags.map((tag) => tag.name));

const compareNames = (a: string, b: string) => (a < b ? -1 : 1);

describe('openapi.yml tags', () => {
	test('declares each tag name once', () => {
		expect(new Set(tags.map((tag) => tag.name)).size).toBe(tags.length);
	});

	test('declares parent tags and child tags', () => {
		expect(parentTags.length).toBeGreaterThan(0);
		expect(childTags.length).toBeGreaterThan(0);
	});

	test.each(childTags)('$name has an x-parent that names a parent tag', (tag) => {
		expect(parentNames.has(tag['x-parent'] ?? '')).toBe(true);
	});

	test.each(parentTags)('parent tag $name has an x-displayName and a description', (tag) => {
		expect(tag['x-displayName']).toEqual(expect.any(String));
		expect(tag.description).toEqual(expect.any(String));
	});

	test('lists each parent tag directly above its children, in alphabetical order', () => {
		const expectedOrder = parentTags.flatMap((parent) => [
			parent.name,
			...childTags
				.filter((child) => child['x-parent'] === parent.name)
				.map((child) => child.name)
				.sort(compareNames),
		]);
		expect(tags.map((tag) => tag.name)).toEqual(expectedOrder);
	});

	test('declares a child tag for every operation tag in the routes', () => {
		const undeclared = [
			...new Set(resolvePublicApiRoutes().flatMap((route) => route.tags ?? [])),
		].filter((tag) => !childNames.has(tag));
		expect(undeclared).toEqual([]);
	});
});
