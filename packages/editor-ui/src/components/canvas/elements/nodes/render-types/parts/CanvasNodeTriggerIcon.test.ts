import CanvasNodeTriggerIcon from './CanvasNodeTriggerIcon.vue';
import { createComponentRenderer } from '@/__tests__/render';

vi.mock('@/composables/useI18n', () => ({
	useI18n: vi.fn(() => ({
		baseText: vi.fn().mockReturnValue('This is a trigger node'),
	})),
}));

const renderComponent = createComponentRenderer(CanvasNodeTriggerIcon, {
	global: {
		stubs: {
			FontAwesomeIcon: true,
		},
	},
});

describe('CanvasNodeTriggerIcon', () => {
	it('should render trigger icon with tooltip', () => {
		const { container } = renderComponent();

		expect(container.querySelector('.triggerIcon')).toBeInTheDocument();

		const icon = container.querySelector('font-awesome-icon-stub');
		expect(icon).toBeInTheDocument();
		expect(icon?.getAttribute('icon')).toBe('bolt');
		expect(icon?.getAttribute('size')).toBe('lg');
	});

	it('should render tooltip with correct content', () => {
		const { getByText } = renderComponent();

		expect(getByText('This is a trigger node')).toBeInTheDocument();
	});
});
