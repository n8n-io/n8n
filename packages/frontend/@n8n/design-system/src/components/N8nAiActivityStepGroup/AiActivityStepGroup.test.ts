import userEvent from '@testing-library/user-event';
import { render, fireEvent, waitFor } from '@testing-library/vue';
import { h } from 'vue';

import AiActivityStep from '../N8nAiActivityStep';
import AiActivityStepGroup from './AiActivityStepGroup.vue';

describe('AiActivityStepGroup', () => {
	it('keeps the test hook on the button and can silence streamed labels', async () => {
		const { getByTestId, getByText, rerender } = render(AiActivityStepGroup, {
			props: { label: 'Activity', headerTestId: 'activity-header' },
		});
		expect(getByTestId('activity-header').tagName).toBe('BUTTON');
		expect(getByText('Activity')).toHaveAttribute('aria-live', 'polite');
		await rerender({ announceLabel: false });
		expect(getByText('Activity')).toHaveAttribute('aria-live', 'off');
	});

	it('uses defaultOpen for uncontrolled state and emits changes', async () => {
		const { getByRole, getByText, emitted, rerender } = render(AiActivityStepGroup, {
			props: { label: 'Activity', defaultOpen: true },
			slots: { default: 'Activity details' },
		});
		const button = getByRole('button');
		expect(button).toHaveAttribute('aria-expanded', 'true');
		expect(getByText('Activity details')).toBeVisible();

		await fireEvent.click(button);
		expect(button).toHaveAttribute('aria-expanded', 'false');
		expect(emitted('update:open')).toEqual([[false]]);

		await rerender({ defaultOpen: false });
		await rerender({ defaultOpen: true });
		expect(button).toHaveAttribute('aria-expanded', 'false');

		await fireEvent.click(button);
		expect(button).toHaveAttribute('aria-expanded', 'true');
		expect(emitted('update:open')).toEqual([[false], [true]]);
	});

	it('keeps controlled state until the parent updates open', async () => {
		const user = userEvent.setup();
		const { getByRole, emitted, rerender } = render(AiActivityStepGroup, {
			props: { label: 'Activity', open: false, defaultOpen: true },
		});
		const button = getByRole('button');
		expect(button).toHaveAttribute('aria-expanded', 'false');

		await user.tab();
		await user.keyboard('{Enter}');
		expect(emitted('update:open')).toEqual([[true]]);
		expect(button).toHaveAttribute('aria-expanded', 'false');

		await rerender({ open: true });
		expect(button).toHaveAttribute('aria-expanded', 'true');
		await user.keyboard(' ');
		expect(emitted('update:open')).toEqual([[true], [false]]);
		expect(button).toHaveAttribute('aria-expanded', 'true');

		await rerender({ open: false });
		expect(button).toHaveAttribute('aria-expanded', 'false');
	});

	it.each(['above', 'below'] as const)(
		'shows scoped header slots and a closed preview with content %s',
		async (contentPosition) => {
			const { getByRole, getByText, queryByText } = render(AiActivityStepGroup, {
				props: { label: 'Fallback label', contentPosition },
				slots: {
					label:
						'<template #label="{ open }"><Transition><span :key="String(open)">{{ open ? "All activity" : "Recent activity" }}</span></Transition></template>',
					'header-trailing':
						'<template #header-trailing="{ open }">{{ open ? "Expanded" : "Collapsed" }}</template>',
					'collapsed-preview': '<p>Latest activity</p>',
					default: '<p>Full activity</p>',
				},
			});
			const button = getByRole('button');
			expect(button).toHaveTextContent('Recent activity');
			expect(button).toHaveTextContent('Collapsed');
			expect(queryByText('Fallback label')).not.toBeInTheDocument();
			expect(getByText('Latest activity')).toBeVisible();
			expect(button).not.toContainElement(getByText('Latest activity'));

			await fireEvent.click(button);
			expect(button).toHaveTextContent('All activity');
			expect(button).toHaveTextContent('Expanded');
			expect(queryByText('Latest activity')).not.toBeInTheDocument();
			await waitFor(() => expect(getByText('Full activity')).toBeVisible());

			await fireEvent.click(button);
			expect(getByText('Latest activity')).toBeVisible();
		},
	);

	it('supports a label slot without a label prop', () => {
		const { getByRole } = render(AiActivityStepGroup, {
			slots: { label: 'Activity' },
		});
		expect(getByRole('button', { name: 'Activity' })).toBeInTheDocument();
	});

	it('keeps child rails by default and updates them when nested changes', async () => {
		const { container, rerender } = render(AiActivityStepGroup, {
			props: { label: 'Activity', defaultOpen: true },
			slots: { default: () => h(AiActivityStep, { label: 'Step', hasContent: false }) },
		});
		expect(container.querySelector('.nestedRow')).toBeInTheDocument();
		expect(container.querySelector('.rail')).toBeInTheDocument();

		await rerender({ nested: false });
		expect(container.querySelector('.nestedRow')).not.toBeInTheDocument();
		expect(container.querySelector('.rail')).not.toBeInTheDocument();

		await rerender({ nested: true });
		expect(container.querySelector('.nestedRow')).toBeInTheDocument();
		expect(container.querySelector('.rail')).toBeInTheDocument();
	});

	it('uses the nearest group to set child nesting', () => {
		const { container, getByText } = render(AiActivityStepGroup, {
			props: { label: 'Outer group', defaultOpen: true },
			slots: {
				default: () =>
					h(
						AiActivityStepGroup,
						{ label: 'Inner group', defaultOpen: true, nested: false },
						{
							default: () => h(AiActivityStep, { label: 'Plain step', hasContent: false }),
						},
					),
			},
		});
		expect(getByText('Plain step')).toBeVisible();
		expect(container.querySelector('.rail')).not.toBeInTheDocument();
	});

	it('keeps label updates in a live region without the timer', async () => {
		const { getByRole, getByText, rerender } = render(AiActivityStepGroup, {
			props: { label: 'Running 2 background tasks' },
			slots: { 'header-trailing': '<span aria-live="off">0:31</span>' },
		});
		const label = getByText('Running 2 background tasks');
		expect(getByRole('button')).toHaveAttribute('aria-live', 'off');
		expect(label).toHaveAttribute('aria-live', 'polite');
		expect(label).toHaveAttribute('aria-atomic', 'true');
		expect(label).not.toContainElement(getByText('0:31'));
		await rerender({ label: 'Background tasks finished' });
		expect(label).toHaveTextContent('Background tasks finished');
	});

	it.each(['above', 'below'] as const)(
		'supports slots and keyboard expansion %s the header',
		async (contentPosition) => {
			const user = userEvent.setup();
			const { container, getByRole, queryByText, getByText } = render(AiActivityStepGroup, {
				props: { label: 'Background tasks', fullWidth: true, contentPosition },
				slots: {
					prefix: '<span aria-hidden="true">Status</span>',
					'header-trailing': '<span>0:31</span>',
					default: '<ul><li>Check escalations</li></ul>',
				},
			});
			if (contentPosition === 'above') {
				expect(container.firstElementChild).toHaveClass('contentAbove');
			} else {
				expect(container.firstElementChild).not.toHaveClass('contentAbove');
			}
			const button = getByRole('button');
			expect(button).toHaveAttribute('aria-expanded', 'false');
			expect(button).toHaveAttribute('aria-live', 'off');
			expect(button).toHaveTextContent('Background tasks');
			expect(button).toHaveTextContent('0:31');
			expect(queryByText('Check escalations')).not.toBeInTheDocument();
			await user.tab();
			expect(button).toHaveFocus();
			await user.keyboard('{Enter}');
			expect(button).toHaveAttribute('aria-expanded', 'true');
			await waitFor(() => expect(getByText('Check escalations')).toBeVisible());
			expect(button.compareDocumentPosition(getByText('Check escalations'))).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING,
			);
			await user.keyboard(' ');
			expect(button).toHaveAttribute('aria-expanded', 'false');
			await fireEvent.click(button);
			expect(button).toHaveAttribute('aria-expanded', 'true');
		},
	);
});
