import '@n8n/vitest-config/setup/frontend';
import { config } from '@vue/test-utils';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

import { N8nPlugin } from '../plugin';

config.global.plugins = [N8nPlugin];

beforeAll(() => {
	// jsdom lacks elementFromPoint; ProseMirror's posAtCoords calls it during
	// editor mount (tiptap placeholder viewport tracking). null is a valid result.
	//
	// Kept local, not shared: defining it flips the behaviour of anything that
	// feature-detects it. editor-ui's suite has always run without it, and adding
	// it globally hung one of its agents-view tests.
	const documentProto = Document.prototype as Document & {
		elementFromPoint?: (x: number, y: number) => Element | null;
	};
	if (!documentProto.elementFromPoint) {
		documentProto.elementFromPoint = () => null;
	}
});

// Globally mock is-emoji-supported
vi.mock('is-emoji-supported', () => ({
	isEmojiSupported: () => true,
}));

// jsdom + user-event mark synthetic pointer/mouse events as defaultPrevented,
// which makes Reka UI's dismissable-layer logic swallow interactions. Force it
// back to false. Kept local, not shared: the shared harness installs a
// spec-faithful PointerEvent polyfill, and forcing `defaultPrevented` to false
// for every frontend package would hide genuine preventDefault() calls.
const OriginalMouseEvent = window.MouseEvent;
const OriginalPointerEvent = window.PointerEvent || window.MouseEvent;

class PatchedMouseEvent extends OriginalMouseEvent {
	constructor(type: string, eventInit?: MouseEventInit) {
		super(type, eventInit);
		Object.defineProperty(this, 'defaultPrevented', {
			get: () => false,
		});
	}
}

class PatchedPointerEvent extends OriginalPointerEvent {
	constructor(type: string, eventInit?: PointerEventInit) {
		super(type, eventInit);
		Object.defineProperty(this, 'defaultPrevented', {
			get: () => false,
		});
	}
}

beforeEach(() => {
	vi.stubGlobal('MouseEvent', PatchedMouseEvent);
	vi.stubGlobal('PointerEvent', PatchedPointerEvent);
});
afterEach(() => vi.unstubAllGlobals());

// Reka UI's FocusScope restores focus from a `setTimeout(…, 0)` scheduled while the
// scope unmounts, and nothing cancels it (reka-ui 2.5.0, FocusScope.js). When the
// last test of a file unmounts an open overlay, that timer is still pending when
// vitest tears jsdom down, and it throws `document is not defined` as an uncaught
// exception — a non-zero exit code on a run where every test passed.
afterAll(async () => {
	await new Promise((resolve) => setTimeout(resolve, 0));
});
