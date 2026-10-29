import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

import { GITBOOK_DISPLAY_NAME_FIELD, GITBOOK_PARENT_TAG_FIELD } from '@/public-api/swagger-spec';

import { resolvePublicApiRoutes } from '../../public-api-route-resolver';

import '../controllers';

vi.unmock('node:fs');

const OPENAPI_SPEC_PATH = path.resolve(__dirname, '..', 'openapi.yml');

interface TagDeclaration {
	name: string;
	description?: string;
	[GITBOOK_DISPLAY_NAME_FIELD]?: string;
	[GITBOOK_PARENT_TAG_FIELD]?: string;
}

const spec = yaml.parse(fs.readFileSync(OPENAPI_SPEC_PATH, 'utf8')) as {
	tags?: TagDeclaration[];
};
const tags = spec.tags ?? [];
// A parent tag has no GitBook parent field. It groups child tags and has no operations.
const parentTags = tags.filter((tag) => tag[GITBOOK_PARENT_TAG_FIELD] === undefined);
const childTags = tags.filter((tag) => tag[GITBOOK_PARENT_TAG_FIELD] !== undefined);
const parentNames = new Set(parentTags.map((tag) => tag.name));
const childNames = new Set(childTags.map((tag) => tag.name));

const compareNames = (a: string, b: string) => (a < b ? -1 : 1);

// Our expected grouping of OpenAPI tags in GitBook.
const EXPECTED_GROUPS: Record<string, string[]> = {
	BuildAndRun: [
		'Credential',
		'DataTable',
		'Evaluation',
		'Executions',
		'Folders',
		'Tags',
		'Variables',
		'Workflow',
	],
	AccessAndOrganization: ['Projects', 'Role', 'RoleMappingRule', 'User'],
	InstanceSettings: [
		'CredentialTypePolicy',
		'LogStreaming',
		'NodeTypePolicy',
		'SecurityPolicy',
		'SettingsLdap',
		'SettingsOtel',
		'SettingsSsoOidc',
		'SettingsSsoSaml',
	],
	InstanceOperations: [
		'Audit',
		'CommunityPackage',
		'Discover',
		'Insights',
		'N8nPackage',
		'Promotions',
		'SourceControl',
	],
};

describe('openapi.yml tags', () => {
	test('declares each tag name once', () => {
		expect(new Set(tags.map((tag) => tag.name)).size).toBe(tags.length);
	});

	test('declares at least one child tag and each contains parent tag and display name values', () => {
		expect(childTags.length).toBeGreaterThan(0);

		childTags.forEach((tag) => {
			expect(parentNames.has(tag[GITBOOK_PARENT_TAG_FIELD] ?? '')).toBe(true);
			expect(tag[GITBOOK_DISPLAY_NAME_FIELD]).toEqual(expect.any(String));
		});
	});

	test('declares at least one parent tag and each contains display name and description values', () => {
		expect(parentTags.length).toBeGreaterThan(0);

		parentTags.forEach((tag) => {
			expect(tag[GITBOOK_DISPLAY_NAME_FIELD]).toEqual(expect.any(String));
			expect(tag.description).toEqual(expect.any(String));
		});
	});

	test('groups each child tag under its expected parent', () => {
		const actualGroups = Object.fromEntries(
			parentTags.map((parent) => [
				parent.name,
				childTags
					.filter((child) => child[GITBOOK_PARENT_TAG_FIELD] === parent.name)
					.map((child) => child.name)
					.sort(compareNames),
			]),
		);
		expect(actualGroups).toEqual(
			Object.fromEntries(
				Object.entries(EXPECTED_GROUPS).map(([parent, children]) => [
					parent,
					[...children].sort(compareNames),
				]),
			),
		);
	});

	test('lists child tags alphabetically followed by parent tags', () => {
		const expectedOrder = [
			...childTags.map((tag) => tag.name).sort(compareNames),
			...Object.keys(EXPECTED_GROUPS).sort(compareNames),
		];
		expect(tags.map((tag) => tag.name)).toEqual(expectedOrder);
	});

	test('declares a child tag for every operation tag in the routes', () => {
		const undeclared = [
			...new Set(resolvePublicApiRoutes().flatMap((route) => route.tags ?? [])),
		].filter((tag) => !childNames.has(tag));
		expect(undeclared).toEqual([]);
	});
});
