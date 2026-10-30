import { getScrollParent } from './scrollParent';

describe('getScrollParent', () => {
	afterEach(() => {
		document.body.innerHTML = '';
	});

	it('should return the nearest ancestor that scrolls vertically', () => {
		document.body.innerHTML = `
			<div id="outer" style="overflow-y: auto">
				<div id="inner" style="overflow-y: scroll">
					<div><span id="target"></span></div>
				</div>
			</div>
		`;

		expect(getScrollParent(document.getElementById('target'))?.id).toBe('inner');
	});

	it('should skip ancestors that do not scroll', () => {
		document.body.innerHTML = `
			<div id="outer" style="overflow-y: auto">
				<div style="overflow-y: hidden"><span id="target"></span></div>
			</div>
		`;

		expect(getScrollParent(document.getElementById('target'))?.id).toBe('outer');
	});

	it('should fall back to the document scroller', () => {
		document.body.innerHTML = '<span id="target"></span>';

		expect(getScrollParent(document.getElementById('target'))).toBe(
			document.scrollingElement ?? null,
		);
	});
});
