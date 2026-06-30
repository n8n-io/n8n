import { createComponentRenderer } from '@/__tests__/render';
import InputTriple from './InputTriple.vue';

const renderComponent = createComponentRenderer(InputTriple);

describe('InputTriple.vue', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('renders layout correctly', async () => {
		const { getByText } = renderComponent({
			props: { middleWidth: '200px' },
			slots: {
				left: '<div>left</div>',
				middle: '<div>middle</div>',
				right: '<div>right</div>',
			},
		});

		expect(getByText('left')).toBeInTheDocument();
		expect(getByText('middle')).toBeInTheDocument();
		expect(getByText('right')).toBeInTheDocument();

		// Check that middle slot has custom width via inline style
		const middleSlot = getByText('middle').parentElement;
		expect(middleSlot).toHaveStyle('flex-basis: 200px');
	});

	it('does not render missing slots', async () => {
		const { getByText, queryByText } = renderComponent({
			props: { middleWidth: '200px' },
			slots: {
				left: '<div>left</div>',
				middle: '<div>middle</div>',
			},
		});

		expect(getByText('left')).toBeInTheDocument();
		expect(getByText('middle')).toBeInTheDocument();
		expect(queryByText('right')).not.toBeInTheDocument();
	});
});
