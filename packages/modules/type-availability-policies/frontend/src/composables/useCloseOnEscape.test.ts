import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectScope, ref, type EffectScope } from 'vue';

import { ESCAPE_OWNER_ATTRIBUTE, useCloseOnEscape } from './useCloseOnEscape';

describe('useCloseOnEscape', () => {
	const close = vi.fn();
	// Stands in for the Element Plus modal under the dialog.
	const hostListener = vi.fn();
	let scope: EffectScope;

	function press(key: string, target: EventTarget = document.body) {
		target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
	}

	beforeEach(() => document.addEventListener('keydown', hostListener));
	afterEach(() => {
		scope?.stop();
		document.removeEventListener('keydown', hostListener);
		document.body.innerHTML = '';
		vi.clearAllMocks();
	});

	function mount(isActive = ref(true)) {
		scope = effectScope();
		scope.run(() => useCloseOnEscape(isActive, close));
		return isActive;
	}

	it('closes on Escape and keeps the key from the surface underneath', () => {
		mount();

		press('Escape');

		expect(close).toHaveBeenCalledOnce();
		expect(hostListener).not.toHaveBeenCalled();
	});

	it('lets other keys through', () => {
		mount();

		press('Enter');

		expect(close).not.toHaveBeenCalled();
		expect(hostListener).toHaveBeenCalledOnce();
	});

	it('does nothing while inactive', () => {
		mount(ref(false));

		press('Escape');

		expect(close).not.toHaveBeenCalled();
		expect(hostListener).toHaveBeenCalledOnce();
	});

	it('leaves Escape to an element that handles it itself', () => {
		mount();
		const owner = document.body.appendChild(document.createElement('div'));
		owner.setAttribute(ESCAPE_OWNER_ATTRIBUTE, '');
		const inner = owner.appendChild(document.createElement('button'));

		press('Escape', inner);

		expect(close).not.toHaveBeenCalled();
	});
});
