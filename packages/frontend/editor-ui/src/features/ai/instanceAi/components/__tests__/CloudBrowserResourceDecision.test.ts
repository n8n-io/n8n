import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import CloudBrowserResourceDecision from '../CloudBrowserResourceDecision.vue';

const thread = vi.hoisted(() => ({ confirmResourceDecision: vi.fn() }));
vi.mock('../../instanceAi.store', () => ({ useThread: () => thread }));

const renderComponent = createComponentRenderer(CloudBrowserResourceDecision);

const hostProps = {
	requestId: 'req-1',
	kind: 'host',
	resource: 'example.com',
	description: 'Browser: example.com',
	options: ['denyOnce', 'allowOnce', 'allowForSession'],
} as const;

const credentialProps = {
	requestId: 'req-2',
	kind: 'credential-write',
	resource: 'credentials',
	description: 'Create credential "Acme API" (acmeApi)',
	options: ['denyOnce', 'allowOnce'],
} as const;

describe('CloudBrowserResourceDecision', () => {
	beforeEach(() => {
		thread.confirmResourceDecision.mockReset();
	});

	it('asks to open the host in the cloud browser', () => {
		const { getByText } = renderComponent({ props: hostProps });

		expect(
			getByText('Allow n8n Assistant to open example.com in the cloud browser?'),
		).toBeInTheDocument();
		expect(getByText('Browser: example.com')).toBeInTheDocument();
	});

	it('uses the host wording when the request does not say what it touches', () => {
		const { getByText } = renderComponent({ props: { ...hostProps, kind: undefined } });

		expect(
			getByText('Allow n8n Assistant to open example.com in the cloud browser?'),
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

	it('asks to save a credential, with no session option', () => {
		const { getByText, queryByTestId, getByTestId } = renderComponent({ props: credentialProps });

		expect(
			getByText('Allow n8n Assistant to save a credential from the cloud browser?'),
		).toBeInTheDocument();
		expect(getByText('Create credential "Acme API" (acmeApi)')).toBeInTheDocument();
		expect(queryByTestId('cloud-browser-decision-allow-session')).not.toBeInTheDocument();
		expect(getByTestId('cloud-browser-decision-allow-once')).toBeInTheDocument();
		expect(getByTestId('cloud-browser-decision-deny')).toBeInTheDocument();
	});
});
