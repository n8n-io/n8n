import { createComponentRenderer } from '@/__tests__/render';
import ExecutionSearchMatch from './ExecutionSearchMatch.vue';

const renderComponent = createComponentRenderer(ExecutionSearchMatch);

describe('ExecutionSearchMatch', () => {
	it('shows the node, the field and the matching text', () => {
		const { getByTestId } = renderComponent({
			props: {
				match: {
					nodeName: 'Webhook',
					source: 'output',
					path: 'body.issue.url',
					snippet: { before: '…linear.app/acme/issue/', match: 'ENG-123', after: '/fix-login' },
				},
			},
		});

		const match = getByTestId('execution-search-match');
		expect(match).toHaveTextContent('Webhook › body.issue.url');
		expect(match).toHaveTextContent('…linear.app/acme/issue/ENG-123/fix-login');
		expect(match.querySelector('mark')).toHaveTextContent('ENG-123');
		// The row can cut the text off, so the whole of it is in the title.
		expect(match).toHaveAttribute(
			'title',
			'Webhook › body.issue.url\n…linear.app/acme/issue/ENG-123/fix-login',
		);
	});

	it('says when the text is in the input of the node', () => {
		const { getByTestId } = renderComponent({
			props: {
				match: {
					nodeName: 'Slack',
					source: 'input',
					path: 'text',
					snippet: { before: '', match: 'hello', after: '' },
				},
			},
		});

		expect(getByTestId('execution-search-match')).toHaveTextContent('Slack (input) › text');
	});

	it('shows only the node for a search without text', () => {
		const { getByTestId } = renderComponent({ props: { match: { nodeName: 'Slack' } } });

		const match = getByTestId('execution-search-match');
		expect(match).toHaveTextContent('Slack');
		expect(match.querySelector('mark')).not.toBeInTheDocument();
		expect(match).toHaveAttribute('title', 'Slack');
	});
});
