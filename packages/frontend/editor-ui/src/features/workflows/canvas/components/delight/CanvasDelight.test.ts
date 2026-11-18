import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import CanvasSleepEffect from './CanvasSleepEffect.vue';
import CanvasOrigamiEffect from './CanvasOrigamiEffect.vue';

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
	);
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('canvas sleep', () => {
	it('sleeps after inactivity and wakes on activity', async () => {
		const wrapper = mount(CanvasSleepEffect, { props: { eligible: true, delay: 1000 } });
		await vi.advanceTimersByTimeAsync(1000);
		expect(wrapper.attributes('data-sleeping')).toBe('true');
		for (const event of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'focusin']) {
			document.dispatchEvent(new Event(event));
			await nextTick();
			expect(wrapper.attributes('data-sleeping')).toBe('false');
			await vi.advanceTimersByTimeAsync(1000);
			expect(wrapper.attributes('data-sleeping')).toBe('true');
		}
		wrapper.unmount();
		expect(vi.getTimerCount()).toBe(0);
	});
	it('keeps connected or running nodes awake and reacts to eligibility', async () => {
		const wrapper = mount(CanvasSleepEffect, { props: { eligible: false, delay: 500 } });
		wrapper.vm.sleepNow();
		await vi.advanceTimersByTimeAsync(1000);
		expect(wrapper.attributes('data-sleeping')).toBe('false');
		await wrapper.setProps({ eligible: true });
		await vi.advanceTimersByTimeAsync(500);
		expect(wrapper.attributes('data-sleeping')).toBe('true');
		await wrapper.setProps({ eligible: false });
		expect(wrapper.attributes('data-sleeping')).toBe('false');
		wrapper.unmount();
		expect(vi.getTimerCount()).toBe(0);
	});
	it('updates the delay and removes activity listeners on unmount', async () => {
		const wrapper = mount(CanvasSleepEffect, { props: { eligible: true, delay: 1000 } });
		await wrapper.setProps({ delay: 2000 });
		await vi.advanceTimersByTimeAsync(1000);
		expect(wrapper.attributes('data-sleeping')).toBe('false');
		wrapper.unmount();
		document.dispatchEvent(new Event('pointermove'));
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe('sticky note origami', () => {
	it('adds no layout wrapper when the demo is disabled', () => {
		const wrapper = mount(CanvasOrigamiEffect, {
			props: { enabled: false, label: 'Fold' },
			slots: { default: '<div class="original-note">Original note</div>' },
		});
		expect(wrapper.find('.original-note').exists()).toBe(true);
		expect(wrapper.find('.canvas-origami').exists()).toBe(false);
		expect(wrapper.find('.origami-paper').exists()).toBe(false);
		expect(wrapper.find('button').exists()).toBe(false);
		expect(vi.getTimerCount()).toBe(0);
		wrapper.unmount();
	});

	it('keeps the original note and geometry through repeated flights', async () => {
		const wrapper = mount(CanvasOrigamiEffect, {
			props: { enabled: true, label: 'Fold' },
			slots: { default: '<div style="width:330px;height:178px">Original note</div>' },
		});
		const note = wrapper.find('.origami-paper > div').element;
		const initialStyle = note.getAttribute('style');
		for (let flight = 0; flight < 3; flight++) {
			await wrapper.find('button').trigger('click');
			expect(wrapper.findAll('[data-testid="origami-bird"]')).toHaveLength(1);
			wrapper.vm.fold();
			expect(vi.getTimerCount()).toBe(1);
			await vi.advanceTimersByTimeAsync(3400);
			expect(wrapper.find('[data-testid="origami-bird"]').exists()).toBe(false);
			expect(wrapper.find('.origami-paper > div').element).toBe(note);
			expect(note.textContent).toBe('Original note');
			expect(note.getAttribute('style')).toBe(initialStyle);
			expect(vi.getTimerCount()).toBe(0);
		}
		wrapper.unmount();
	});
	it('uses a brief static bird for reduced motion', async () => {
		const wrapper = mount(CanvasOrigamiEffect, {
			props: { enabled: true, label: 'Fold', reducedMotion: true },
		});
		await wrapper.find('button').trigger('click');
		expect(wrapper.classes()).toContain('is-reduced');
		await vi.advanceTimersByTimeAsync(650);
		expect(wrapper.attributes('data-folding')).toBe('false');
		wrapper.unmount();
	});
	it('cancels when disabled or unmounted', async () => {
		const wrapper = mount(CanvasOrigamiEffect, { props: { enabled: true, label: 'Fold' } });
		await wrapper.find('button').trigger('click');
		await wrapper.setProps({ disabled: true });
		expect(wrapper.attributes('data-folding')).toBe('false');
		expect(vi.getTimerCount()).toBe(0);
		await wrapper.setProps({ disabled: false });
		await wrapper.find('button').trigger('click');
		wrapper.unmount();
		expect(vi.getTimerCount()).toBe(0);
	});
});
