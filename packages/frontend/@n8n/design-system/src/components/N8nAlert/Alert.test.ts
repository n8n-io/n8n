import { render, screen } from '@testing-library/vue';

import N8nAlert from './Alert.vue';

describe('components', () => {
	describe('N8nAlert', () => {
		it('should render with props', () => {
			render(N8nAlert, {
				props: { title: 'Title', description: 'Message' },
			});
			expect(screen.getByRole('alert')).toBeVisible();
			expect(screen.getByText('Title')).toBeVisible();
			expect(screen.getByText('Message')).toBeVisible();
		});

		it('should render slots instead of props', () => {
			const { container } = render(N8nAlert, {
				props: { showIcon: false },
				slots: {
					title: 'Title',
					default: 'Message',
					aside: '<button>Click me</button>',
					icon: '<n8n-icon icon="circle-plus" />',
				},
				global: {
					components: {
						N8nIcon: {
							template: '<span class="n8n-icon" />',
							props: ['icon'],
						},
					},
				},
			});
			expect(screen.getByRole('alert')).toBeVisible();
			expect(screen.getByText('Title')).toBeVisible();
			expect(screen.getByText('Message')).toBeVisible();
			expect(screen.getByRole('button')).toBeVisible();
			expect(container.querySelector('.n8n-icon')).toBeInTheDocument();
		});
	});
});
