import { userEvent } from '@testing-library/user-event';
import NDVHeader from '@/components/NDVHeader.vue';
import { renderComponent } from '../__tests__/render';
import type { ComponentProps } from 'vue-component-type-helpers';

describe('NDVHeader', () => {
	const defaultProps: Partial<ComponentProps<typeof NDVHeader>> = {
		nodeName: 'My Custom Name',
		nodeTypeName: 'Edit Fields',
		docsUrl: 'https://example.com/docs',
		icon: { type: 'icon', name: 'code' },
		readOnly: false,
	};

	it('renders docs label', () => {
		const { getByText } = renderComponent(NDVHeader, { props: defaultProps });
		expect(getByText('Docs')).toBeInTheDocument();
	});

	it('emits rename when inline text is changed', async () => {
		const { getByTestId, emitted } = renderComponent(NDVHeader, {
			props: defaultProps,
		});

		const input = getByTestId('inline-edit-input');
		const preview = getByTestId('inline-edit-preview');
		await userEvent.click(preview);
		await userEvent.tripleClick(input);
		await userEvent.keyboard('Updated Name');
		await userEvent.keyboard('{enter}');

		expect(emitted().rename).toHaveLength(1);
		expect(emitted().rename[0]).toEqual(['Updated Name']);
	});

	it('emits close when close button is clicked', async () => {
		const { getByRole, emitted } = renderComponent(NDVHeader, {
			props: defaultProps,
		});

		const closeButton = getByRole('button');
		await userEvent.click(closeButton);

		expect(emitted().close).toBeTruthy();
	});
});
