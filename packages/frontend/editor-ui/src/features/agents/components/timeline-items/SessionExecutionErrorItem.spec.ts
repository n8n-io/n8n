import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import SessionExecutionErrorItem from './SessionExecutionErrorItem.vue';
import type { TimelineItem } from '../../session-timeline.types';

describe('SessionExecutionErrorItem', () => {
	it.each([
		{
			status: 'error',
			label: 'Execution failed',
			fallback: 'The agent execution failed before completing.',
		},
		{
			status: 'interrupted',
			label: 'Execution interrupted',
			fallback: 'The agent execution was interrupted before completing.',
		},
	] as const)(
		'shows the $status status and fallback without content',
		({ status, label, fallback }) => {
			const item: TimelineItem = {
				kind: 'execution-error',
				executionId: 'e1',
				timestamp: 0,
				executionStatus: status,
			};
			const wrapper = mount(SessionExecutionErrorItem, { props: { item, selected: false } });
			expect(wrapper.text()).toContain(`${label}: ${fallback}`);
			wrapper.unmount();
		},
	);

	it.each(['error', 'interrupted'] as const)(
		'preserves the supplied %s message',
		(executionStatus) => {
			const item: TimelineItem = {
				kind: 'execution-error',
				executionId: 'e1',
				timestamp: 0,
				executionStatus,
				content: 'The model connection closed.',
			};
			const wrapper = mount(SessionExecutionErrorItem, { props: { item, selected: false } });
			expect(wrapper.text()).toContain('The model connection closed.');
			expect(wrapper.text()).not.toContain('before completing.');
			expect(wrapper.text()).toContain(
				executionStatus === 'interrupted' ? 'Execution interrupted:' : 'Execution failed:',
			);
			wrapper.unmount();
		},
	);
});
