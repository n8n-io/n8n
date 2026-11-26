import { createComponentRenderer } from '@/__tests__/render';
import { NodeVersionNewParameterKey } from '@/app/constants';
import ParameterNewTag from './ParameterNewTag.vue';

const renderComponent = createComponentRenderer(ParameterNewTag);

const provide = {
	[NodeVersionNewParameterKey as symbol]: (path: string) => path === 'parameters.options.timeout',
};

describe('ParameterNewTag', () => {
	it('shows the tag for a new parameter', () => {
		const { getByTestId } = renderComponent({
			props: { path: 'parameters.options.timeout' },
			global: { provide },
		});

		expect(getByTestId('parameter-new-tag')).toHaveTextContent('New');
	});

	it('shows no tag for another parameter', () => {
		const { queryByTestId } = renderComponent({
			props: { path: 'parameters.options.redirect' },
			global: { provide },
		});

		expect(queryByTestId('parameter-new-tag')).not.toBeInTheDocument();
	});

	it('shows no tag when no node settings panel provides the lookup', () => {
		const { queryByTestId } = renderComponent({ props: { path: 'parameters.options.timeout' } });

		expect(queryByTestId('parameter-new-tag')).not.toBeInTheDocument();
	});
});
