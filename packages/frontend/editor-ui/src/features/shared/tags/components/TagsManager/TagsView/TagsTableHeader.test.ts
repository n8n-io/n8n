import { describe, it, expect, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import { screen } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import TagsTableHeader from './TagsTableHeader.vue';

const renderHeader = createComponentRenderer(TagsTableHeader, {
	props: { disabled: false, search: '' },
});

describe('TagsTableHeader — canCreate prop', () => {
	beforeEach(() => {
		createTestingPinia();
	});

	it('shows the "Add new" button when canCreate is true', () => {
		renderHeader({ props: { canCreate: true } });
		expect(screen.getByText('Add new')).toBeInTheDocument();
	});

	it('hides the "Add new" button when canCreate is false', () => {
		renderHeader({ props: { canCreate: false } });
		expect(screen.queryByText('Add new')).not.toBeInTheDocument();
	});

	it('defaults to showing the button when canCreate is not provided', () => {
		renderHeader();
		expect(screen.getByText('Add new')).toBeInTheDocument();
	});
});
