import '@testing-library/jest-dom';
import { configure } from '@testing-library/vue';
import { config } from '@vue/test-utils';
import { beforeAll } from 'vitest';

import { N8nPlugin } from '@n8n/design-system/plugin';

configure({ testIdAttribute: 'data-test-id' });

config.global.plugins = [N8nPlugin];

window.ResizeObserver =
	window.ResizeObserver ||
	vi.fn().mockImplementation(() => ({
		disconnect: vi.fn(),
		observe: vi.fn(),
		unobserve: vi.fn(),
	}));

// Globally mock is-emoji-supported
vi.mock('is-emoji-supported', () => ({
	isEmojiSupported: () => true,
}));

/**
 * Fixes missing pointer APIs and defaultPrevented issues for jsdom + user-event
 */
beforeAll(() => {
	// Patch missing pointer APIs
	interface ElementProtoWithPointer extends HTMLElement {
		hasPointerCapture?: (pointerId: number) => boolean;
		setPointerCapture?: (pointerId: number) => void;
		releasePointerCapture?: (pointerId: number) => void;
	}
	
	const elementProto: ElementProtoWithPointer = HTMLElement.prototype;

	if (!elementProto.hasPointerCapture) {
		Object.defineProperties(elementProto, {
			hasPointerCapture: {
				value: (_: number) => false,
				writable: true,
			},
			setPointerCapture: {
				value: (_: number) => {},
				writable: true,
			},
			releasePointerCapture: {
				value: (_: number) => {},
				writable: true,
			},
		});
	}
});

// Preserve originals
const OriginalMouseEvent = window.MouseEvent;
const OriginalPointerEvent = window.PointerEvent || window.MouseEvent;

// Patched MouseEvent
class PatchedMouseEvent extends OriginalMouseEvent {
	private _defaultPrevented = false;

	constructor(type: string, eventInit?: MouseEventInit) {
		super(type, eventInit);
	}

	preventDefault() {
		super.preventDefault();
		this._defaultPrevented = true;
	}

	get defaultPrevented() {
		return this._defaultPrevented;
	}
}

// Patched PointerEvent
class PatchedPointerEvent extends OriginalPointerEvent {
	private _defaultPrevented = false;

	constructor(type: string, eventInit?: PointerEventInit) {
		super(type, eventInit);
	}

	preventDefault() {
		super.preventDefault();
		this._defaultPrevented = true;
	}

	get defaultPrevented() {
		return this._defaultPrevented;
	}
}

// Apply patches
window.MouseEvent = PatchedMouseEvent;
window.PointerEvent = PatchedPointerEvent;
