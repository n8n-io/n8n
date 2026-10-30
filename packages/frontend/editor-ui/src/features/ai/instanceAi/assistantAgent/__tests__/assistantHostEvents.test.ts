import { createTestingPinia } from '@pinia/testing';

import { createComponentRenderer } from '@/__tests__/render';
import { findHostEventRenderer } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { AgentsChatHostEvent } from '@/features/ai/shared/agentsChat/types';

import AssistantInstanceContextHostEvent from '../AssistantInstanceContextHostEvent.vue';
import AssistantStatusHostEvent from '../AssistantStatusHostEvent.vue';
import {
	assistantHostEventExtensions,
	assistantInstanceContextExtension,
	assistantStatusExtension,
	parseInstanceContextHostEvent,
	parseStatusHostEvent,
} from '../assistantHostEvents';

function hostEvent(name: string, payload: unknown): AgentsChatHostEvent {
	return { id: `${name}-1`, name, payload, key: 'turn' };
}

const MCP_NOTICE = "Couldn't reach MCP server Acme; continuing without their tools.";

const injectedContext = hostEvent('instance-context', {
	injection: {
		state: 'injected',
		isUpdate: false,
		legs: { inventory: 3, events: 0, runs: 1 },
		chars: 1200,
	},
});

describe('assistant host event extensions', () => {
	it('renders the instance context in the thinking block', () => {
		expect(findHostEventRenderer(injectedContext, assistantHostEventExtensions)).toEqual({
			component: assistantInstanceContextExtension.hostEventComponent,
			placement: 'thinking',
		});
	});

	it('renders a status notice at the start of the message', () => {
		const status = hostEvent('status', { message: MCP_NOTICE });
		expect(findHostEventRenderer(status, assistantHostEventExtensions)).toEqual({
			component: assistantStatusExtension.hostEventComponent,
			placement: 'start',
		});
	});

	it('does not render a cleared status', () => {
		expect(parseStatusHostEvent(hostEvent('status', { message: '' }))).toBeUndefined();
		expect(
			findHostEventRenderer(hostEvent('status', { message: '' }), assistantHostEventExtensions),
		).toBeUndefined();
	});

	it('does not render a payload that does not match the event schema', () => {
		expect(parseInstanceContextHostEvent(hostEvent('instance-context', {}))).toBeUndefined();
		expect(parseStatusHostEvent(hostEvent('status', { message: 1 }))).toBeUndefined();
	});

	it('does not render the events that have no step in the chat', () => {
		for (const name of ['preferences-applied', 'tasks-update', 'setup-items']) {
			expect(findHostEventRenderer(hostEvent(name, {}), assistantHostEventExtensions)).toBe(
				undefined,
			);
		}
	});
});

describe('AssistantInstanceContextHostEvent', () => {
	const renderComponent = createComponentRenderer(AssistantInstanceContextHostEvent, {
		pinia: createTestingPinia(),
	});

	it('shows the instance context label', () => {
		const { getByTestId } = renderComponent({ props: { event: injectedContext } });
		expect(getByTestId('assistant-agent-instance-context')).toHaveTextContent(
			'Read instance context — 3 workflows, 1 workflow with runs',
		);
	});

	it('shows a failed read', () => {
		const { getByTestId } = renderComponent({
			props: {
				event: hostEvent('instance-context', { injection: { state: 'absent', reason: 'failed' } }),
			},
		});
		expect(getByTestId('assistant-agent-instance-context')).toHaveTextContent(
			'Instance context could not be read',
		);
	});
});

describe('AssistantStatusHostEvent', () => {
	const renderComponent = createComponentRenderer(AssistantStatusHostEvent);

	it('shows the status text', () => {
		const { getByTestId } = renderComponent({
			props: { event: hostEvent('status', { message: MCP_NOTICE }) },
		});
		expect(getByTestId('assistant-agent-status')).toHaveTextContent(MCP_NOTICE);
	});
});
