import {
	extractBuilderTemplatesArchive,
	validateBuilderTemplatesArchive,
} from '../extract-builder-templates-archive';
import { makeBuilderTemplatesTarGz } from './builder-templates-archive.fixtures';

const VALID_JSON_INDEX_ARCHIVE = makeBuilderTemplatesTarGz([
	{
		name: 'index.json',
		content: JSON.stringify({
			entries: [
				{
					id: 'slack-daily-summary',
					description: 'Daily Slack',
					file: 'templates/slack-daily-summary.ts',
				},
			],
		}),
	},
	{ name: 'slack-daily-summary.ts', content: 'export default {};' },
]);

const VALID_CDN_INDEX_TXT_ARCHIVE = makeBuilderTemplatesTarGz([
	{ name: 'index.txt', content: 'slack-daily-summary.ts | Daily Slack' },
	{ name: 'slack-daily-summary.ts', content: 'export default {};' },
]);

describe('extractBuilderTemplatesArchive', () => {
	it('extracts index.json and template files from a valid archive', () => {
		const extracted = extractBuilderTemplatesArchive(VALID_JSON_INDEX_ARCHIVE);

		expect(extracted?.get('index.json')).toContain('slack-daily-summary');
		expect(extracted?.get('slack-daily-summary.ts')).toBe('export default {};');
	});

	it('accepts CDN archives that still ship index.txt', () => {
		const extracted = extractBuilderTemplatesArchive(VALID_CDN_INDEX_TXT_ARCHIVE);

		expect(extracted?.get('index.txt')).toBe('slack-daily-summary.ts | Daily Slack');
		expect(extracted?.get('slack-daily-summary.ts')).toBe('export default {};');
		expect(validateBuilderTemplatesArchive(VALID_CDN_INDEX_TXT_ARCHIVE)).toBeNull();
	});

	it.each<[string, Buffer]>([
		['absolute path', makeBuilderTemplatesTarGz([{ name: '/escape.ts', content: 'x' }])],
		['parent traversal', makeBuilderTemplatesTarGz([{ name: '../escape.ts', content: 'x' }])],
		['nested path', makeBuilderTemplatesTarGz([{ name: 'nested/template.ts', content: 'x' }])],
		['malformed gzip', Buffer.from('not-a-gzip-archive')],
	])('returns null for invalid archive: %s', (_label, archive) => {
		expect(extractBuilderTemplatesArchive(archive)).toBeNull();
		expect(validateBuilderTemplatesArchive(archive)).not.toBeNull();
	});
});
