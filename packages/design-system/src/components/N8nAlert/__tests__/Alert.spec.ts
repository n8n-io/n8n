import { render, screen } from '@testing-library/vue';
import N8nAlert from '../Alert.vue';

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
			render(N8nAlert, {
				slots: { title: 'Title', default: 'Message', aside: '<button>Click me</button>' },
			});
			expect(screen.getByRole('alert')).toBeVisible();
			expect(screen.getByText('Title')).toBeVisible();
			expect(screen.getByText('Message')).toBeVisible();
			expect(screen.getByRole('button')).toBeVisible();
		});
	});
});
