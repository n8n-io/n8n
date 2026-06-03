import {
	extractBuilderTemplatesArchive,
	validateBuilderTemplatesArchive,
} from '../extract-builder-templates-archive';
import { makeBuilderTemplatesTarGz } from './builder-templates-archive.fixtures';

const VALID_ARCHIVE = makeBuilderTemplatesTarGz([
	{ name: 'index.txt', content: 'slack-daily-summary.ts | Daily Slack' },
	{ name: 'slack-daily-summary.ts', content: 'export default {};' },
]);

describe('extractBuilderTemplatesArchive', () => {
	it('extracts index and template files from a valid archive', () => {
		const extracted = extractBuilderTemplatesArchive(VALID_ARCHIVE);

		expect(extracted?.get('index.txt')).toBe('slack-daily-summary.ts | Daily Slack');
		expect(extracted?.get('slack-daily-summary.ts')).toBe('export default {};');
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
