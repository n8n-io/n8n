import { computed } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';

import ResourceListSkeleton from './ResourceListSkeleton.vue';
import { ResourceListColumnsKey, type ResourceListColumn } from './resourceListColumns';

const columns: ResourceListColumn[] = [
	{ key: 'name', label: 'Name' },
	{ key: 'location', label: 'Project', width: '100px' },
	{ key: 'updated', label: 'Last updated', width: '100px' },
	{ key: 'dependencies', width: '64px' },
	{ key: 'actions', width: '32px' },
];

const renderComponent = createComponentRenderer(ResourceListSkeleton, {
	global: {
		provide: {
			[ResourceListColumnsKey as symbol]: computed(() => columns),
		},
	},
});

describe('ResourceListSkeleton', () => {
	it('should render the column header and the requested number of rows', () => {
		const { getByTestId } = renderComponent({ props: { rows: 4 } });

		const skeleton = getByTestId('resources-list-skeleton');
		expect(getByTestId('resources-list-header')).toHaveTextContent('Name');
		// One name cell in the header, one in each row
		expect(skeleton.querySelectorAll('[data-column="name"]')).toHaveLength(5);
	});

	it('should hide the column header when asked', () => {
		const { queryByTestId } = renderComponent({ props: { header: false } });

		expect(queryByTestId('resources-list-header')).not.toBeInTheDocument();
	});

	it('should show placeholder bars only in the data columns', () => {
		const { getByTestId } = renderComponent({ props: { rows: 1, header: false } });

		const skeleton = getByTestId('resources-list-skeleton');
		expect(skeleton.querySelector('[data-column="location"]')?.children).toHaveLength(1);
		expect(skeleton.querySelector('[data-column="updated"]')?.children).toHaveLength(1);
		expect(skeleton.querySelector('[data-column="dependencies"]')?.children).toHaveLength(0);
		expect(skeleton.querySelector('[data-column="actions"]')?.children).toHaveLength(0);
	});
});
