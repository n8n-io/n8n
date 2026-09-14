import { renderComponent } from '@/__tests__/render';
import LogsViewNodeName from './LogsViewNodeName.vue';

describe('LogsViewNodeName', () => {
	it('should render the name without strikethrough by default', () => {
		const rendered = renderComponent(LogsViewNodeName, { props: { name: 'Fetch Orders' } });

		expect(rendered.getByText('Fetch Orders')).toBeInTheDocument();
		expect(rendered.queryByTestId('logs-node-name-deleted')).not.toBeInTheDocument();
	});

	it('should strike through the name when the node is deleted', () => {
		const rendered = renderComponent(LogsViewNodeName, {
			props: { name: 'Fetch Orders', isDeleted: true },
		});

		expect(rendered.getByTestId('logs-node-name-deleted')).toHaveTextContent('Fetch Orders');
	});

	it('should not strike through the name when the node still exists', () => {
		const rendered = renderComponent(LogsViewNodeName, {
			props: { name: 'Fetch Orders', isDeleted: false },
		});

		expect(rendered.getByText('Fetch Orders')).toBeInTheDocument();
		expect(rendered.queryByTestId('logs-node-name-deleted')).not.toBeInTheDocument();
	});
});
