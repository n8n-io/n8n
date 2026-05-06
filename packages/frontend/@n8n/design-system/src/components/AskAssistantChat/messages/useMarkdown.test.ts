import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../composables/useI18n', () => ({
	useI18n: () => ({
		t: (key: string) => key,
	}),
}));

import { useMarkdown } from './useMarkdown';

describe('useMarkdown', () => {
	const { renderMarkdown } = useMarkdown();

	it('should render standard markdown', () => {
		const result = renderMarkdown('**bold** text');
		expect(result).toContain('<strong>bold</strong>');
	});

	it('should not render raw script tags', () => {
		const result = renderMarkdown('<script>alert(1)</script>');
		expect(result).not.toContain('<script>');
		expect(result).not.toContain('</script>');
	});

	it('should not render raw img tags with event handlers', () => {
		const result = renderMarkdown('<img src=x onerror=alert(1)>');
		expect(result).not.toContain('<img');
	});

	it('should not render raw iframe tags', () => {
		const result = renderMarkdown('<iframe src="https://evil.com"></iframe>');
		expect(result).not.toContain('<iframe');
	});
});
