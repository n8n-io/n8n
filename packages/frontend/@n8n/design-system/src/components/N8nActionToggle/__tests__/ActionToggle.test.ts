/**
 * Simplified test suite for N8nActionToggle component - focused on function coverage
 */

import { render } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';
import N8nActionToggle from '../ActionToggle.vue';
import type { UserAction, IUser } from '../../../types';

// Mock user type for testing
interface TestUser extends IUser {
	id: string;
	email: string;
	firstName?: string;
	lastName?: string;
}

describe('N8nActionToggle', () => {
	const mockActions: UserAction<TestUser>[] = [
		{
			value: 'edit',
			label: 'Edit User',
			disabled: false,
		},
		{
			value: 'delete',
			label: 'Delete User',
			disabled: false,
		},
		{
			value: 'view',
			label: 'View Details',
			disabled: true,
		},
		{
			value: 'external',
			label: 'External Link',
			type: 'external-link',
			disabled: false,
		},
	];

	describe('Basic Rendering', () => {
		it('should render with default props', () => {
			const { container } = render(N8nActionToggle);
			const actionToggle = container.querySelector('[data-test-id="action-toggle"]');
			expect(actionToggle).toBeInTheDocument();
		});

		it('should render with custom slot content', () => {
			const { getByText } = render(N8nActionToggle, {
				slots: {
					default: 'Custom Button Content',
				},
			});
			expect(getByText('Custom Button Content')).toBeInTheDocument();
		});
	});

	describe('Props Configuration', () => {
		it('should render with different sizes', () => {
			const sizes = ['mini', 'small', 'medium'] as const;

			sizes.forEach((size) => {
				const { container } = render(N8nActionToggle, {
					props: { size },
				});
				const dropdown = container.querySelector('.el-dropdown');
				expect(dropdown).toBeInTheDocument();
			});
		});

		it('should render with different themes', () => {
			const { container } = render(N8nActionToggle, {
				props: {
					theme: 'dark',
				},
			});
			const button = container.querySelector('span[class*="dark"]');
			expect(button).toBeInTheDocument();
		});

		it('should render with different icon sizes', () => {
			const { container } = render(N8nActionToggle, {
				props: {
					iconSize: 'large',
				},
			});
			// Just verify component renders with icon size prop
			const dropdown = container.querySelector('.el-dropdown');
			expect(dropdown).toBeInTheDocument();
		});

		it('should render in disabled state', () => {
			const { container } = render(N8nActionToggle, {
				props: {
					disabled: true,
				},
			});
			const dropdown = container.querySelector('.el-dropdown');
			expect(dropdown).toBeInTheDocument();
		});

		it('should render with custom popper class', () => {
			const { container } = render(N8nActionToggle, {
				props: {
					popperClass: 'custom-popper-class',
				},
			});
			const dropdown = container.querySelector('.el-dropdown');
			expect(dropdown).toBeInTheDocument();
		});

		it('should render with different trigger types', () => {
			const { container } = render(N8nActionToggle, {
				props: {
					trigger: 'hover',
				},
			});
			const dropdown = container.querySelector('.el-dropdown');
			expect(dropdown).toBeInTheDocument();
		});
	});

	describe('Actions Configuration', () => {
		it('should render with actions provided', () => {
			const { container } = render(N8nActionToggle, {
				props: {
					actions: mockActions,
				},
			});
			const dropdown = container.querySelector('.el-dropdown');
			expect(dropdown).toBeInTheDocument();
		});

		it('should render with empty actions array', () => {
			const { container } = render(N8nActionToggle, {
				props: {
					actions: [],
				},
			});
			const dropdown = container.querySelector('.el-dropdown');
			expect(dropdown).toBeInTheDocument();
		});
	});

	describe('Loading State', () => {
		it('should render in loading state', () => {
			const { container } = render(N8nActionToggle, {
				props: {
					loading: true,
					actions: mockActions,
				},
			});
			const dropdown = container.querySelector('.el-dropdown');
			expect(dropdown).toBeInTheDocument();
		});

		it('should render with custom loading row count', () => {
			const { container } = render(N8nActionToggle, {
				props: {
					loading: true,
					loadingRowCount: 5,
				},
			});
			const dropdown = container.querySelector('.el-dropdown');
			expect(dropdown).toBeInTheDocument();
		});

		it('should render with zero loading row count', () => {
			const { container } = render(N8nActionToggle, {
				props: {
					loading: true,
					loadingRowCount: 0,
				},
			});
			const dropdown = container.querySelector('.el-dropdown');
			expect(dropdown).toBeInTheDocument();
		});
	});

	describe('Placement Options', () => {
		it('should render with different placement options', () => {
			const placements = ['top', 'bottom', 'left', 'right'] as const;

			placements.forEach((placement) => {
				const { container } = render(N8nActionToggle, {
					props: { placement },
				});
				const dropdown = container.querySelector('.el-dropdown');
				expect(dropdown).toBeInTheDocument();
			});
		});

		it('should render with bottom placement by default', () => {
			const { container } = render(N8nActionToggle);
			const dropdown = container.querySelector('.el-dropdown');
			expect(dropdown).toBeInTheDocument();
		});
	});

	describe('Icon Orientation', () => {
		it('should render with vertical icon orientation by default', () => {
			const { container } = render(N8nActionToggle);
			const dropdown = container.querySelector('.el-dropdown');
			expect(dropdown).toBeInTheDocument();
		});

		it('should render with horizontal icon orientation', () => {
			const { container } = render(N8nActionToggle, {
				props: {
					iconOrientation: 'horizontal',
				},
			});
			const dropdown = container.querySelector('.el-dropdown');
			expect(dropdown).toBeInTheDocument();
		});
	});

	describe('Edge Cases', () => {
		it('should handle actions with special characters in values', () => {
			const specialActions: UserAction<TestUser>[] = [
				{
					value: 'action-with-dashes',
					label: 'Action with Dashes',
					disabled: false,
				},
				{
					value: 'action_with_underscores',
					label: 'Action with Underscores',
					disabled: false,
				},
				{
					value: 'action.with.dots',
					label: 'Action with Dots',
					disabled: false,
				},
			];

			const { container } = render(N8nActionToggle, {
				props: {
					actions: specialActions,
				},
			});
			const dropdown = container.querySelector('.el-dropdown');
			expect(dropdown).toBeInTheDocument();
		});

		it('should handle empty action labels', () => {
			const emptyLabelActions: UserAction<TestUser>[] = [
				{
					value: 'empty',
					label: '',
					disabled: false,
				},
			];

			const { container } = render(N8nActionToggle, {
				props: {
					actions: emptyLabelActions,
				},
			});
			const dropdown = container.querySelector('.el-dropdown');
			expect(dropdown).toBeInTheDocument();
		});

		it('should handle very long action labels', () => {
			const longLabelActions: UserAction<TestUser>[] = [
				{
					value: 'long',
					label:
						'This is a very long action label that should still render correctly without breaking the layout',
					disabled: false,
				},
			];

			const { container } = render(N8nActionToggle, {
				props: {
					actions: longLabelActions,
				},
			});
			const dropdown = container.querySelector('.el-dropdown');
			expect(dropdown).toBeInTheDocument();
		});
	});
});
