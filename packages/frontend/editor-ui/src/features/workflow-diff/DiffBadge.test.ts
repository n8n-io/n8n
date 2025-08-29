import { describe, it, expect } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import DiffBadge from '@/features/workflow-diff/DiffBadge.vue';
import { NodeDiffStatus } from '@/features/workflow-diff/useWorkflowDiff';

const renderComponent = createComponentRenderer(DiffBadge);

describe('DiffBadge', () => {
	it('should render "N" label for Added status', () => {
		const { getByText, container } = renderComponent({
			props: {
				type: NodeDiffStatus.Added,
			},
		});

		expect(getByText('N')).toBeInTheDocument();
		const badge = container.querySelector('.diffBadge');
		expect(badge).toBeInTheDocument();
	});

	it('should render "D" label for Deleted status', () => {
		const { getByText } = renderComponent({
			props: {
				type: NodeDiffStatus.Deleted,
			},
		});

		expect(getByText('D')).toBeInTheDocument();
	});

	it('should render "M" label for Modified status', () => {
		const { getByText } = renderComponent({
			props: {
				type: NodeDiffStatus.Modified,
			},
		});

		expect(getByText('M')).toBeInTheDocument();
	});

	it('should render empty label for Equal status', () => {
		const { container } = renderComponent({
			props: {
				type: NodeDiffStatus.Eq,
			},
		});

		const badge = container.querySelector('.diffBadge');
		expect(badge).toBeInTheDocument();
		expect(badge?.textContent?.trim()).toBe('');
	});

	it('should have correct CSS class', () => {
		const { container } = renderComponent({
			props: {
				type: NodeDiffStatus.Added,
			},
		});

		const badge = container.querySelector('.diffBadge');
		expect(badge).toHaveClass('diffBadge');
	});

	it('should apply correct styles for different status types', () => {
		// Test Added status (green)
		const { container: addedContainer } = renderComponent({
			props: {
				type: NodeDiffStatus.Added,
			},
		});
		const addedBadge = addedContainer.querySelector('.diffBadge');
		expect(addedBadge).toBeInTheDocument();

		// Test Deleted status (red)
		const { container: deletedContainer } = renderComponent({
			props: {
				type: NodeDiffStatus.Deleted,
			},
		});
		const deletedBadge = deletedContainer.querySelector('.diffBadge');
		expect(deletedBadge).toBeInTheDocument();

		// Test Modified status (orange)
		const { container: modifiedContainer } = renderComponent({
			props: {
				type: NodeDiffStatus.Modified,
			},
		});
		const modifiedBadge = modifiedContainer.querySelector('.diffBadge');
		expect(modifiedBadge).toBeInTheDocument();
	});

	it('should handle unknown status types gracefully', () => {
		const { container } = renderComponent({
			props: {
				type: 'unknown' as NodeDiffStatus,
			},
		});

		const badge = container.querySelector('.diffBadge');
		expect(badge).toBeInTheDocument();
		expect(badge?.textContent?.trim()).toBe('');
	});
});
