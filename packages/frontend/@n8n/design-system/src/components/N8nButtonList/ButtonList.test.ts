import { render } from '@testing-library/vue';

import N8nButtonList from './ButtonList.vue';

describe('components', () => {
	describe('N8nButtonList', () => {
		it('should render with default horizontal orientation', () => {
			const { container } = render(N8nButtonList, {
				slots: {
					default: '<button>One</button><button>Two</button>',
				},
			});

			const group = container.querySelector('[role="group"]');
			expect(group).toBeTruthy();
			expect(group?.className).toMatch(/horizontal/);
		});

		it('should apply vertical orientation', () => {
			const { container } = render(N8nButtonList, {
				props: {
					orientation: 'vertical',
				},
				slots: {
					default: '<button>One</button><button>Two</button>',
				},
			});

			const group = container.querySelector('[role="group"]');
			expect(group?.className).toMatch(/vertical/);
		});

		it('should render slotted content', () => {
			const { getByText } = render(N8nButtonList, {
				slots: {
					default: '<button>Save</button><button>Publish</button>',
				},
			});

			expect(getByText('Save')).toBeTruthy();
			expect(getByText('Publish')).toBeTruthy();
		});
	});
});
