import { mock } from 'vitest-mock-extended';

import { renderRichText } from '../rich-text';
import type { BlockRenderContext } from '../types';

const ctx = mock<BlockRenderContext>({
	params: { id: '<img src=x onerror=alert(1)>', name: 'Ada & Co' },
	query: {},
	viewer: null,
});

describe('renderRichText', () => {
	it('keeps inline formatting produced by the editor', () => {
		expect(renderRichText('Hello <b>bold</b>, <i>italic</i><br>next', ctx)).toBe(
			'Hello <b>bold</b>, <i>italic</i><br>next',
		);
	});

	it('keeps links with safe hrefs and drops unsafe ones', () => {
		expect(renderRichText('<a href="https://n8n.io">n8n</a>', ctx)).toBe(
			'<a href="https://n8n.io">n8n</a>',
		);
		expect(renderRichText('<a href="javascript:alert(1)">x</a>', ctx)).toBe('<a>x</a>');
	});

	it('strips block-level and active markup', () => {
		expect(renderRichText('<div>a</div><script>x()</script><img src="https://a/b.png">', ctx)).toBe(
			'a',
		);
	});

	it('escapes interpolated values so a parameter cannot inject markup', () => {
		expect(renderRichText('Client {{ params.id }} / {{ params.name }}', ctx)).toBe(
			'Client &lt;img src&#x3D;x onerror&#x3D;alert(1)&gt; / Ada &amp; Co',
		);
	});
});
