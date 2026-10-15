import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AgentBuilderVisualization from './AgentBuilderVisualization.vue';

function setPrefersReducedMotion(matches: boolean) {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn(() => ({ matches })),
	});
}

describe('AgentBuilderVisualization', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		setPrefersReducedMotion(false);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('emits complete after the animation sequence finishes', async () => {
		const wrapper = mount(AgentBuilderVisualization, {
			props: { active: true },
		});

		await vi.advanceTimersByTimeAsync(20000);

		expect(wrapper.emitted('complete')).toHaveLength(1);
	});

	it('fills in the builder sections as the animation progresses', async () => {
		const wrapper = mount(AgentBuilderVisualization, {
			props: { active: true },
		});

		expect(wrapper.text()).not.toContain('Gmail');

		await vi.advanceTimersByTimeAsync(20000);

		const text = wrapper.text();
		expect(text).toContain('Gmail');
		expect(text).toContain('Google Sheets');
		expect(text).toContain('Summarize conversations');
		// The agent is not scheduled — the Schedules section stays empty.
		expect(text).toContain('Add schedule');
		expect(text).not.toContain('Daily digest');
		expect(text).toContain('Claude Opus 5');
		expect(text).toContain('escalate to a human');
	});

	it('stops and resets when deactivated', async () => {
		const wrapper = mount(AgentBuilderVisualization, {
			props: { active: true },
		});

		await vi.advanceTimersByTimeAsync(2000);
		await wrapper.setProps({ active: false });
		await vi.advanceTimersByTimeAsync(20000);

		expect(wrapper.emitted('complete')).toBeUndefined();
		expect(wrapper.text()).not.toContain('Gmail');
	});

	it('does not emit complete when never activated', async () => {
		const wrapper = mount(AgentBuilderVisualization, {
			props: { active: false },
		});

		await vi.advanceTimersByTimeAsync(20000);

		expect(wrapper.emitted('complete')).toBeUndefined();
	});

	it('renders the publish button and flips it to Published after typing finishes', async () => {
		const wrapper = mount(AgentBuilderVisualization, {
			props: { active: true },
		});

		await vi.advanceTimersByTimeAsync(2000);
		const button = wrapper.find('[data-testid="publish-agent-button"]');
		expect(button.exists()).toBe(true);
		expect(button.text()).toBe('Publish');

		await vi.advanceTimersByTimeAsync(18000);
		expect(wrapper.find('[data-testid="publish-agent-button"]').text()).toBe('Published');
	});

	it('plays the Telegram chat first, then the builder, and emits complete at the end', async () => {
		const wrapper = mount(AgentBuilderVisualization, {
			props: { active: true },
		});

		// Chat phase: conversation is playing, builder sections untouched.
		await vi.advanceTimersByTimeAsync(2000);
		expect(wrapper.text()).toContain('order #4712');
		expect(wrapper.text()).not.toContain('Claude Opus 5');
		expect(wrapper.emitted('complete')).toBeUndefined();

		// Builder phase: sections are being filled in.
		await vi.advanceTimersByTimeAsync(14000);
		expect(wrapper.text()).toContain('Claude Opus 5');
		expect(wrapper.emitted('complete')).toBeUndefined();

		await vi.advanceTimersByTimeAsync(6000);
		expect(wrapper.text()).toContain('Published');
		expect(wrapper.emitted('complete')).toHaveLength(1);
	});

	it('shows the final state and completes promptly with reduced motion', async () => {
		setPrefersReducedMotion(true);
		const wrapper = mount(AgentBuilderVisualization, {
			props: { active: true },
		});

		await vi.advanceTimersByTimeAsync(3000);

		const text = wrapper.text();
		expect(text).toContain('Claude Opus 5');
		expect(text).toContain('Published');
		// The chat phase is skipped in the reduced-motion end state.
		expect(text).not.toContain('order #4712');
		expect(wrapper.emitted('complete')).toHaveLength(1);
	});
});
