import { describe, expect, it } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import SharedThreadNotice from '../SharedThreadNotice.vue';

const renderNotice = createComponentRenderer(SharedThreadNotice);

describe('SharedThreadNotice', () => {
	it('names the owner as the only sender and says that requests can still be answered', () => {
		const { getByRole } = renderNotice({ props: { ownerName: 'Alice Owner' } });

		expect(getByRole('note')).toHaveTextContent(
			'Only Alice Owner can send messages here. You can still answer requests.',
		);
	});

	it('is not announced as an alert each time the chat opens', () => {
		const { queryByRole } = renderNotice({ props: { ownerName: 'Alice Owner' } });

		expect(queryByRole('alert')).not.toBeInTheDocument();
	});

	it('names "the owner" when the server sent no name', () => {
		const { getByTestId } = renderNotice({ props: { ownerName: '' } });

		expect(getByTestId('instance-ai-shared-thread-notice')).toHaveTextContent(
			'Only the owner can send messages here.',
		);
	});

	it('shows a name with markup as text', () => {
		const { getByTestId } = renderNotice({ props: { ownerName: '<b>Eve</b>' } });

		const notice = getByTestId('instance-ai-shared-thread-notice');
		expect(notice).toHaveTextContent('Only <b>Eve</b> can send messages here.');
		expect(notice.querySelector('b')).toBeNull();
	});
});
