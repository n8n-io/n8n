import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import type { ComponentProps } from 'vue-component-type-helpers';
import { createComponentRenderer } from '@/__tests__/render';
import CloudBrowserResourceDecision from '../CloudBrowserResourceDecision.vue';

const { thread, track } = vi.hoisted(() => ({
	thread: {
		id: 'thread-1',
		confirmResourceDecision: vi.fn(),
		findToolCallByRequestId: vi.fn(() => ({ confirmation: { inputThreadId: 'input-thread-1' } })),
	},
	track: vi.fn(),
}));
vi.mock('../../instanceAi.store', () => ({ useThread: () => thread }));
vi.mock('@n8n/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));
vi.mock('@n8n/stores/useRootStore', () => ({ useRootStore: () => ({ instanceId: 'instance-1' }) }));

const renderComponent = createComponentRenderer(CloudBrowserResourceDecision);

type Props = ComponentProps<typeof CloudBrowserResourceDecision>;

const hostProps: Props = {
	requestId: 'req-1',
	kind: 'host',
	resource: 'example.com',
	description: 'Browser: example.com',
	options: ['denyOnce', 'allowOnce', 'allowForSession'],
	taskTitle: 'Compare plan prices',
};

const credentialProps: Props = {
	requestId: 'req-2',
	kind: 'credential-write',
	resource: 'credentials',
	description: 'Create credential "Acme API" (acmeApi)',
	options: ['denyOnce', 'allowOnce'],
	taskTitle: 'Get the API key',
};

describe('CloudBrowserResourceDecision', () => {
	beforeEach(() => {
		thread.confirmResourceDecision.mockReset();
		track.mockReset();
	});

	it('asks to open the host in the cloud browser for the task, and shows the host', () => {
		const { getByText, queryByText, getByRole } = renderComponent({ props: hostProps });

		expect(
			getByText(
				'Allow n8n Assistant to open example.com in the "Compare plan prices" cloud browser?',
			),
		).toBeInTheDocument();
		expect(getByRole('region')).toHaveTextContent(/^example\.com$/);
		expect(queryByText(/Browser: example\.com/)).not.toBeInTheDocument();
	});

	it('uses the host wording when the request does not say what it touches', () => {
		const { getByText } = renderComponent({ props: { ...hostProps, kind: undefined } });

		expect(
			getByText(
				'Allow n8n Assistant to open example.com in the "Compare plan prices" cloud browser?',
			),
		).toBeInTheDocument();
	});

	it.each([
		['cloud-browser-decision-allow-session', 'allowForSession'],
		['cloud-browser-decision-allow-once', 'allowOnce'],
		['cloud-browser-decision-deny', 'denyOnce'],
	])('sends the decision for %s', async (testId, decision) => {
		const { getByTestId } = renderComponent({ props: hostProps });

		await fireEvent.click(getByTestId(testId));

		expect(thread.confirmResourceDecision).toHaveBeenCalledWith('req-1', decision);
	});

	it('asks to save a credential for the task, with no session option', () => {
		const { getByText, queryByTestId, getByTestId } = renderComponent({ props: credentialProps });

		expect(
			getByText(
				'Allow n8n Assistant to save a credential from the "Get the API key" cloud browser?',
			),
		).toBeInTheDocument();
		expect(getByText('Create credential "Acme API" (acmeApi)')).toBeInTheDocument();
		expect(queryByTestId('cloud-browser-decision-allow-session')).not.toBeInTheDocument();
		expect(getByTestId('cloud-browser-decision-allow-once')).toBeInTheDocument();
		expect(getByTestId('cloud-browser-decision-deny')).toBeInTheDocument();
	});

	it('tracks the decision with the kind of resource', async () => {
		const { getByTestId } = renderComponent({ props: credentialProps });

		await fireEvent.click(getByTestId('cloud-browser-decision-allow-once'));

		expect(track).toHaveBeenCalledWith(
			'User finished providing input',
			expect.objectContaining({
				thread_id: 'thread-1',
				input_thread_id: 'input-thread-1',
				instance_id: 'instance-1',
				type: 'resource-decision',
				browser: 'cloud',
				resource_kind: 'credential-write',
				provided_inputs: [
					{ label: 'credentials', options: ['denyOnce', 'allowOnce'], option_chosen: 'allowOnce' },
				],
				skipped_inputs: [],
			}),
		);
	});
});
