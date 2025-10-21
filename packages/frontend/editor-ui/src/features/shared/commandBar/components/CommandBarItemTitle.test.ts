import { describe, it, expect, vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import CommandBarItemTitle from '@/features/shared/commandBar/components/CommandBarItemTitle.vue';

vi.mock('@/features/collaboration/projects/components/ProjectIcon.vue', () => ({
	default: {
		name: 'ProjectIcon',
		template: '<div data-test-id="project-icon"></div>',
	},
}));

const renderComponent = createComponentRenderer(CommandBarItemTitle);

describe('CommandBarItemTitle', () => {
	it('should render title', () => {
		const { container } = renderComponent({
			props: {
				title: 'Test Title',
			},
		});
		expect(container.textContent).toContain('Test Title');
	});

	it('should render suffix with text', () => {
		const { container } = renderComponent({
			props: {
				title: 'Test Title',
				suffix: 'Test Suffix',
			},
		});
		expect(container.textContent).toContain('Test Suffix');
	});

	it('should render ProjectIcon when suffixIcon is provided', () => {
		const { getByTestId } = renderComponent({
			props: {
				title: 'Test Title',
				suffix: 'Project Name',
				suffixIcon: { type: 'icon', value: 'bolt-filled' },
			},
		});
		expect(getByTestId('project-icon')).toBeInTheDocument();
	});

	it('should not render suffix when not provided', () => {
		const { container } = renderComponent({
			props: {
				title: 'Test Title',
			},
		});
		const spans = container.querySelectorAll('span');
		expect(spans.length).toBe(2); // container and title only
	});

	it('should show action text when isSelected is true', () => {
		const { container } = renderComponent({
			props: {
				title: 'Test Title',
				actionText: 'Execute',
				isSelected: true,
			},
		});
		expect(container.textContent).toContain('Execute');
	});

	it('should show action text when isHovered is true', () => {
		const { container } = renderComponent({
			props: {
				title: 'Test Title',
				actionText: 'Execute',
				isHovered: true,
			},
		});
		expect(container.textContent).toContain('Execute');
	});

	it('should not show action text when neither isSelected nor isHovered', () => {
		const { container } = renderComponent({
			props: {
				title: 'Test Title',
				actionText: 'Execute',
				isSelected: false,
				isHovered: false,
			},
		});
		expect(container.textContent).not.toContain('Execute');
	});

	it('should render all parts together', () => {
		const { container, getByTestId } = renderComponent({
			props: {
				title: 'Workflow',
				suffix: 'My Project',
				suffixIcon: { type: 'icon', value: 'bolt-filled' },
				actionText: 'Open',
				isSelected: true,
			},
		});
		expect(container.textContent).toContain('Workflow');
		expect(container.textContent).toContain('My Project');
		expect(container.textContent).toContain('Open');
		expect(getByTestId('project-icon')).toBeInTheDocument();
	});
});
