import { describe, expect, it } from 'vitest';
import { within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import ProjectNavigationSectionHeader from './ProjectNavigationSectionHeader.vue';

const renderHeader = createComponentRenderer(ProjectNavigationSectionHeader, {
	props: { title: 'Projects', chevronSize: 'small', inWorkspace: false, collapsed: false },
});

describe('ProjectNavigationSectionHeader', () => {
	it.each([
		['a top section', false, 2],
		['a sub-section of the Simple Workspace', true, 3],
	])('is a heading of %s whose toggle names the section', (_case, inWorkspace, level) => {
		const { getByRole } = renderHeader({ props: { inWorkspace } });

		const heading = getByRole('heading', { level, name: 'Projects' });
		const toggle = within(heading).getByRole('button', { name: 'Projects' });
		expect(toggle).toHaveAttribute('type', 'button');
		expect(toggle).toHaveAttribute('aria-expanded', 'true');
	});

	it('shows a collapsed section as collapsed', () => {
		const { getByRole } = renderHeader({ props: { collapsed: true } });

		expect(getByRole('button', { name: 'Projects' })).toHaveAttribute('aria-expanded', 'false');
	});

	it('toggles the section on a click', async () => {
		const { getByRole, emitted } = renderHeader();

		await userEvent.click(getByRole('button', { name: 'Projects' }));

		expect(emitted()['update:collapsed']).toEqual([[true]]);
	});

	it('toggles the section with Enter and Space', async () => {
		const { getByRole, emitted } = renderHeader({ props: { collapsed: true } });

		getByRole('button', { name: 'Projects' }).focus();
		await userEvent.keyboard('{Enter}');
		await userEvent.keyboard(' ');

		expect(emitted()['update:collapsed']).toEqual([[false], [true]]);
	});
});
