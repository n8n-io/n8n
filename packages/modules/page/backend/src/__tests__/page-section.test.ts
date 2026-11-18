import { replaceMarkdownSection } from '../page-section';

describe('replaceMarkdownSection', () => {
	it('should replace the text under the heading and keep the heading', () => {
		const content = '# Report\n\n## Latest report\n\nOld\n\nOlder\n\n## Related\n\nNotes';

		expect(replaceMarkdownSection(content, 'Latest report', 'New')).toBe(
			'# Report\n\n## Latest report\n\nNew\n\n## Related\n\nNotes',
		);
	});

	it('should replace up to the end of the content for the last section', () => {
		expect(replaceMarkdownSection('## Latest report\n\nOld', 'Latest report', 'New')).toBe(
			'## Latest report\n\nNew',
		);
	});

	it('should replace the sub-sections of the section', () => {
		const content = '## Latest report\n\nOld\n\n### Detail\n\nRows\n\n## Related';

		expect(replaceMarkdownSection(content, 'Latest report', 'New')).toBe(
			'## Latest report\n\nNew\n\n## Related',
		);
	});

	it('should match the title without regard to case', () => {
		expect(replaceMarkdownSection('## Latest Report\n\nOld', 'latest report', 'New')).toBe(
			'## Latest Report\n\nNew',
		);
	});

	it('should add the section at the end when the content has no such heading', () => {
		expect(replaceMarkdownSection('# Report\n\nIntro', 'Latest report', 'New')).toBe(
			'# Report\n\nIntro\n\n## Latest report\n\nNew',
		);
	});

	it('should give the same content when it runs twice with the same text', () => {
		const once = replaceMarkdownSection('# Report', 'Latest report', 'New');

		expect(replaceMarkdownSection(once, 'Latest report', 'New')).toBe(once);
	});
});
