import { fireEvent } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import ResourcesListEmptyState, {
	type EmptyStateResourceKey,
} from '@/app/components/layouts/ResourcesListEmptyState.vue';

const renderComponent = createComponentRenderer(ResourcesListEmptyState);

describe('ResourcesListEmptyState', () => {
	test.each<[EmptyStateResourceKey, string, string]>([
		['credentials', 'Create your first credential', 'Create credential'],
		['variables', 'Create your first variable', 'Create variable'],
		['dataTable', 'Create your first data table', 'Create data table'],
		['workflows', 'Create your first automation', 'Create workflow'],
		['agents', 'Create your first agent', 'Create agent'],
	])('renders canonical heading and CTA for %s', (resourceKey, heading, cta) => {
		const { getByText, getByRole } = renderComponent({ props: { resourceKey } });
		expect(getByText(heading)).toBeInTheDocument();
		expect(getByRole('button', { name: cta })).toBeInTheDocument();
	});

	it('emits click:button when CTA is clicked', async () => {
		const { getByRole, emitted } = renderComponent({ props: { resourceKey: 'credentials' } });
		await fireEvent.click(getByRole('button', { name: 'Create credential' }));
		expect(emitted()['click:button']).toHaveLength(1);
	});

	it('disables the CTA when buttonDisabled is set', () => {
		const { getByRole } = renderComponent({
			props: { resourceKey: 'credentials', buttonDisabled: true },
		});
		expect(getByRole('button', { name: 'Create credential' })).toBeDisabled();
	});
});
