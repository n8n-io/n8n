import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';

import { createComponentRenderer } from '@/__tests__/render';

import DomainAccessApproval from '../DomainAccessApproval.vue';

const render = createComponentRenderer(DomainAccessApproval, { pinia: createTestingPinia() });

describe('DomainAccessApproval', () => {
	it('emits the approved domain access decision as a confirm body', async () => {
		const { getByTestId, emitted } = render({
			props: { url: 'https://example.com/a', host: 'example.com' },
		});

		await fireEvent.click(getByTestId('domain-access-allow-once'));

		expect(emitted().decide).toEqual([
			[{ kind: 'domainAccessApprove', domainAccessAction: 'allow_once' }],
		]);
	});

	it('emits a denied web search as a deny body', async () => {
		const { getByTestId, emitted } = render({ props: { query: 'n8n release notes' } });

		await fireEvent.click(getByTestId('domain-access-deny'));

		expect(emitted().decide).toEqual([[{ kind: 'domainAccessDeny' }]]);
	});

	it('shows why the "Approve for me" mode asks, below the URL', () => {
		const { getByText, getByTestId } = render({
			props: {
				url: 'https://example.com/a?name=Ada',
				host: 'example.com',
				askReason: { kind: 'judge', text: 'The URL holds data from the conversation.' },
			},
		});

		expect(getByText('https://example.com/a?name=Ada')).toBeVisible();
		expect(getByTestId('approval-ask-reason')).toHaveTextContent(
			'The URL holds data from the conversation.',
		);
	});

	it('shows no reason without one', () => {
		const { getByText, queryByTestId } = render({ props: { query: 'n8n release notes' } });

		expect(getByText('n8n release notes')).toBeVisible();
		expect(queryByTestId('approval-ask-reason')).not.toBeInTheDocument();
	});
});
