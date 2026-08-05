import '@n8n/vitest-config/frontend-setup';
import { config } from '@vue/test-utils';
import { afterEach, beforeEach, vi } from 'vitest';

import { N8nPlugin } from '@n8n/design-system/plugin';

config.global.plugins = [N8nPlugin];

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
