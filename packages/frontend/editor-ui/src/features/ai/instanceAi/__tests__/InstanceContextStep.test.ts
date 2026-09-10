import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
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
		block: '<instance-context>\nLead enrichment ran 6x, 6 failed\n</instance-context>',
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

	/** Collapsed by default: expanding is what shows it, not the transcript. */
	it('shows the block once expanded, which is the record the chat transcript strips', async () => {
		const { getByRole, queryByText, getByText } = renderComponent({
			props: { entry: injected() },
		});

		expect(queryByText(/Lead enrichment ran 6x, 6 failed/)).toBeNull();

		await userEvent.click(getByRole('button'));

		expect(getByText(/Lead enrichment ran 6x, 6 failed/)).toBeTruthy();
	});

	/**
	 * The distinction this row exists to draw: told nothing, versus told and ignored it.
	 */
	it('reads differently when the turn was handed nothing', () => {
		const entry = injected({
			injection: { state: 'absent', reason: 'empty' },
			block: undefined,
		});

		const text = renderComponent({ props: { entry } }).getByTestId(
			'instance-ai-context-step',
		).textContent;

		expect(text).toContain('No instance context to read');
		expect(text).not.toContain('Read instance context');
	});

	it('names each surface the turn used', () => {
		const entry = injected({
			reach: { surfaces: ['activity-list', 'workflow-read'] },
		});

		const label = renderComponent({ props: { entry } }).getByTestId(
			'instance-ai-context-step',
		).textContent;

		expect(label).toContain('listed more activity');
		expect(label).toContain('read a workflow in full');
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
