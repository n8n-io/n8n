import { describe, it, expect } from 'vitest';
import { fireEvent } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import { createComponentRenderer } from '@/__tests__/render';
import InstanceAiConfirmationCard from '../agentsChat/InstanceAiConfirmationCard.vue';

const renderComponent = createComponentRenderer(InstanceAiConfirmationCard, {
	pinia: createTestingPinia(),
});

describe('InstanceAiConfirmationCard', () => {
	it('submits domain access through the resume callback', async () => {
		const { getByTestId, emitted } = renderComponent({
			props: {
				input: {
					requestId: 'req-1',
					message: 'Allow access?',
					domainAccess: { url: 'https://example.com/a', host: 'example.com' },
				},
			},
		});

		await fireEvent.click(getByTestId('domain-access-allow-once'));

		expect(emitted().submit).toEqual([
			[{ kind: 'domainAccessApprove', domainAccessAction: 'allow_once' }],
		]);
	});

	it('submits the continue card as an approval', async () => {
		const { getByRole, emitted } = renderComponent({
			props: {
				input: { requestId: 'req-2', message: 'Paused', inputType: 'continue' },
			},
		});

		await fireEvent.click(getByRole('button'));

		expect(emitted().submit).toEqual([[{ kind: 'approval', approved: true }]]);
	});

	it('submits only once', async () => {
		const { getByRole, emitted } = renderComponent({
			props: {
				input: { requestId: 'req-3', message: 'Paused', inputType: 'continue' },
			},
		});

		await fireEvent.click(getByRole('button'));
		await fireEvent.click(getByRole('button'));

		expect(emitted().submit).toHaveLength(1);
	});

	it('renders the fallback approval card for unported card types', () => {
		const { getByTestId } = renderComponent({
			props: {
				input: {
					requestId: 'req-4',
					message: 'Set up credentials',
					credentialRequests: [],
				},
			},
		});

		expect(getByTestId('instance-ai-agents-chat-approval')).toBeInTheDocument();
	});
});
