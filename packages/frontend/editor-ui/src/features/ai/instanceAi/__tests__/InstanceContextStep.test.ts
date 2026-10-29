import { describe, it, expect } from 'vitest';
import type { InstanceAiTimelineEntry } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceContextStep from '../components/InstanceContextStep.vue';

type ContextEntry = Extract<InstanceAiTimelineEntry, { type: 'instance-context' }>;

const renderComponent = createComponentRenderer(InstanceContextStep);

function injected(overrides: Partial<ContextEntry> = {}): ContextEntry {
	return {
		type: 'instance-context',
		runId: 'run-1',
		injection: {
			state: 'injected',
			isUpdate: false,
			legs: { inventory: 3, events: 2, runs: 1 },
			chars: 120,
		},
		...overrides,
	};
}

describe('InstanceContextStep', () => {
	it('names each leg that carried something', () => {
		const { getByTestId } = renderComponent({ props: { entry: injected() } });

		const label = getByTestId('instance-ai-context-step').textContent ?? '';
		expect(label).toContain('Read instance context');
		expect(label).toContain('3 workflows');
		expect(label).toContain('2 recent changes');
		expect(label).toContain('1 workflow with runs');
	});

	it('leaves out a leg that carried nothing, so an empty leg is not read as a zero', () => {
		const entry = injected({
			injection: {
				state: 'injected',
				isUpdate: false,
				legs: { inventory: 4, events: 0, runs: 0 },
				chars: 60,
			},
		});

		const label = renderComponent({ props: { entry } }).getByTestId(
			'instance-ai-context-step',
		).textContent;

		expect(label).toContain('4 workflows');
		expect(label).not.toContain('change');
		expect(label).not.toContain('runs');
	});

	it('says a delta is a delta rather than the whole story', () => {
		const entry = injected({
			injection: {
				state: 'injected',
				isUpdate: true,
				legs: { inventory: 0, events: 1, runs: 0 },
				chars: 40,
			},
		});

		expect(
			renderComponent({ props: { entry } }).getByTestId('instance-ai-context-step').textContent,
		).toContain('Read new instance activity');
	});

	/**
	 * A turn handed nothing is no longer traced, but the timeline is durable: threads that ran
	 * before that change still replay these rows, so the label has to keep rendering them.
	 */
	it('reads differently when the turn was handed nothing', () => {
		const entry = injected({
			injection: { state: 'absent', reason: 'empty' },
		});

		const text = renderComponent({ props: { entry } }).getByTestId(
			'instance-ai-context-step',
		).textContent;

		expect(text).toContain('No instance context to read');
		expect(text).not.toContain('Read instance context');
	});

	/** A broken read is a different finding from a quiet instance. */
	it('says a read failed rather than calling it empty', () => {
		const entry = injected({
			injection: { state: 'absent', reason: 'failed' },
		});

		const text = renderComponent({ props: { entry } }).getByTestId(
			'instance-ai-context-step',
		).textContent;

		expect(text).toContain('could not be read');
		expect(text).not.toContain('No instance context to read');
	});

	/**
	 * A line, not an expandable one. The row still renders as a button for layout, but it
	 * carries no expanded state, which is what `aria-expanded` would announce.
	 */
	it('renders as a plain row with nothing to expand', () => {
		const { getByRole, getByTestId } = renderComponent({ props: { entry: injected() } });

		expect(getByTestId('instance-ai-context-step')).toBeTruthy();
		expect(getByRole('button').getAttribute('aria-expanded')).toBeNull();
	});

	it('names each surface the turn used', () => {
		const entry = injected({
			reach: { surfaces: ['activity-list', 'workflow-read'] },
		});

		const label = renderComponent({ props: { entry } }).getByTestId(
			'instance-ai-context-step',
		).textContent;

		expect(label).toContain('listed more activity');
		expect(label).toContain('inspected a workflow');
		expect(label).not.toContain('in full');
	});

	it('says nothing about reach on a turn that only used the block', () => {
		const entry = injected({ reach: { surfaces: [] } });

		const label = renderComponent({ props: { entry } }).getByTestId(
			'instance-ai-context-step',
		).textContent;

		expect(label).toContain('Read instance context');
		expect(label).not.toContain('looked further');
	});
});
