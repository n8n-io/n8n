import { elementAttachmentLabel } from './elementAttachment';

const element = (text?: string) => ({
	type: 'element' as const,
	appId: 'app-1',
	tagName: 'span',
	text,
});

describe('elementAttachmentLabel', () => {
	it('shows the tag name and the text', () => {
		expect(elementAttachmentLabel(element('Save'))).toBe('span: "Save"');
	});

	it('shows only the tag name without text', () => {
		expect(elementAttachmentLabel(element())).toBe('span');
		expect(elementAttachmentLabel(element('  \n '))).toBe('span');
	});

	it('collapses whitespace and shortens long text', () => {
		expect(elementAttachmentLabel(element('Programme   is taking\nshape for the day'))).toBe(
			'span: "Programme is taking shap..."',
		);
	});
});
