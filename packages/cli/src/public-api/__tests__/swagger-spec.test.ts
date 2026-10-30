import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

import {
	GITBOOK_DISPLAY_NAME_FIELD,
	GITBOOK_PARENT_TAG_FIELD,
	stripGitBookParentTags,
} from '../swagger-spec';

vi.unmock('node:fs');

describe('stripGitBookParentTags', () => {
	test('removes parent tags and keeps child tags, keeping the input unchanged', () => {
		const inputSpecTags = [
			{ name: 'Audit', [GITBOOK_PARENT_TAG_FIELD]: 'InstanceOperations', description: 'Audit' },
			{
				name: 'InstanceOperations',
				[GITBOOK_DISPLAY_NAME_FIELD]: 'Instance operations',
				description: 'Ops',
			},
			{ name: 'Tags', [GITBOOK_PARENT_TAG_FIELD]: 'BuildAndRun', description: 'Tags' },
		];
		const inputSpec = {
			tags: inputSpecTags,
		};

		const originalTags = structuredClone(inputSpecTags);

		const spec = stripGitBookParentTags(inputSpec);

		expect(spec.tags).toEqual([
			{ name: 'Audit', description: 'Audit' },
			{ name: 'Tags', description: 'Tags' },
		]);

		expect(inputSpec.tags).toEqual(originalTags);
	});

	test('keeps the other keys of the spec', () => {
		const spec = stripGitBookParentTags({
			openapi: '3.0.0',
			paths: { '/workflows': {} },
			tags: [
				{ name: 'Workflow', [GITBOOK_PARENT_TAG_FIELD]: 'BuildAndRun' },
				{ name: 'BuildAndRun' },
			],
		});

		expect(spec.openapi).toBe('3.0.0');
		expect(spec.paths).toEqual({ '/workflows': {} });
	});

	test('the built-in openapi.yml has no parent tags and no GitBook parent fields', () => {
		const specPath = path.resolve(__dirname, '..', 'v1', 'openapi.yml');
		const openapiSpec = yaml.parse(fs.readFileSync(specPath, 'utf8')) as {
			tags: Record<string, unknown>[];
		};
		const parentTagNames = new Set(
			openapiSpec.tags
				.map((tag) => tag[GITBOOK_PARENT_TAG_FIELD])
				.filter((name): name is string => typeof name === 'string'),
		);

		const spec = stripGitBookParentTags(openapiSpec);
		const tags = Array.isArray(spec.tags) ? spec.tags : [];

		expect(parentTagNames.size).toBeGreaterThan(0);
		expect(tags.length).toBeGreaterThan(0);
		for (const tag of tags) {
			expect(tag).not.toHaveProperty(GITBOOK_PARENT_TAG_FIELD);
		}
		expect(tags.map((tag) => tag.name).filter((name) => parentTagNames.has(name))).toEqual([]);
	});
});
