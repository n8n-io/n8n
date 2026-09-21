import { render } from '@testing-library/vue';

import NodeCreatorNode from './NodeCreatorNode.vue';

function renderNode(tag: { text: string; pill?: boolean; type?: string }) {
	return render(NodeCreatorNode, {
		props: { title: 'OpenAI', tag },
		global: { stubs: ['N8nIcon'] },
	});
}

describe('N8nNodeCreatorNode', () => {
	it('passes info type to the credits pill', () => {
		const { getByText } = renderNode({ text: 'n8n credits', pill: true, type: 'info' });
		expect(getByText('n8n credits').className).toContain('info');
	});

	it('passes danger type to the credits pill', () => {
		const { getByText } = renderNode({ text: 'No credits', pill: true, type: 'danger' });
		expect(getByText('No credits').className).toContain('danger');
	});

	it('defaults the credits pill type when tag type is not info or danger', () => {
		const { getByText } = renderNode({ text: 'Free credits', pill: true, type: 'success' });
		const className = getByText('Free credits').className;
		expect(className).not.toContain('info');
		expect(className).not.toContain('danger');
	});

	it('greys the row and renders the trailing slot when disabled', () => {
		const { container, getByText } = render(NodeCreatorNode, {
			props: { title: 'Gmail', description: 'Send email', disabled: true },
			slots: { trailing: '<span data-test-id="trailing">lock</span>' },
			global: { stubs: ['N8nIcon'] },
		});

		expect(container.firstElementChild?.className).toContain('disabled');
		expect(getByText('lock')).toBeInTheDocument();
	});

	it('shows the action arrow instead of the trailing slot when the row has actions', () => {
		const { container, queryByText } = render(NodeCreatorNode, {
			props: { title: 'Gmail', showActionArrow: true },
			slots: { trailing: '<span>lock</span>' },
			global: { stubs: ['N8nIcon'] },
		});

		expect(container.querySelector('button')).toBeInTheDocument();
		expect(queryByText('lock')).not.toBeInTheDocument();
	});
});
