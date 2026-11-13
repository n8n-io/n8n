import { isTrustedCommandSource } from './postMessageUtils';

/** A window stand-in. A top window is its own parent. */
function fakeWindow(parent?: object | null): Window {
	const win = { parent: null as unknown };
	win.parent = parent === undefined ? win : parent;
	return win as unknown as Window;
}

describe(isTrustedCommandSource, () => {
	describe('in an editor that is the top window', () => {
		const editor = fakeWindow();

		it('trusts the editor window itself', () => {
			expect(isTrustedCommandSource(editor, editor)).toBe(true);
		});

		it.each([
			['no source', null],
			['a frame inside the editor', fakeWindow(editor)],
			['a frame nested deeper inside the editor', fakeWindow(fakeWindow(editor))],
			['a frame that was removed, which has no parent', fakeWindow(null)],
			['another top window', fakeWindow()],
		])('does not trust %s', (_case, source) => {
			expect(isTrustedCommandSource(source, editor)).toBe(false);
		});
	});

	describe('in an editor that a page embeds', () => {
		const embedder = fakeWindow();
		const editor = fakeWindow(embedder);

		it('trusts the embedding page', () => {
			expect(isTrustedCommandSource(embedder, editor)).toBe(true);
		});

		it('trusts the editor window itself', () => {
			expect(isTrustedCommandSource(editor, editor)).toBe(true);
		});

		it.each([
			['a frame inside the editor', fakeWindow(editor)],
			['another frame of the embedding page', fakeWindow(embedder)],
			['a frame that was removed', fakeWindow(null)],
		])('does not trust %s', (_case, source) => {
			expect(isTrustedCommandSource(source, editor)).toBe(false);
		});
	});

	it('uses the current window by default', () => {
		expect(isTrustedCommandSource(window)).toBe(true);
	});
});
