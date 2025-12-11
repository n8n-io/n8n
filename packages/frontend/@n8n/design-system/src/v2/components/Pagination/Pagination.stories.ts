/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import Pagination from './Pagination.vue';

export default {
	title: 'Components v2/Pagination',
	component: Pagination,
	tags: ['autodocs'],
	argTypes: {
		currentPage: {
			control: 'number',
			description: 'Current active page number (1-indexed)',
		},
		pageSize: {
			control: 'number',
			description: 'Number of items per page',
		},
		total: {
			control: 'number',
			description: 'Total number of items',
		},
		pagerCount: {
			control: 'number',
			description: 'Maximum number of page buttons to display',
		},
		layout: {
			control: 'text',
			description: 'Layout string (comma-separated: prev, pager, next, sizes, jumper, total)',
		},
		background: {
			control: 'boolean',
			description: 'Add background color to pagination buttons',
		},
		size: {
			control: 'select',
			options: ['small', 'medium'],
			description: 'Size variant',
		},
		variant: {
			control: 'select',
			options: ['default', 'ghost'],
			description: 'Visual variant',
		},
		disabled: {
			control: 'boolean',
			description: 'Disable pagination controls',
		},
		hideOnSinglePage: {
			control: 'boolean',
			description: 'Hide when there is only one page',
		},
	},
} satisfies Meta<typeof Pagination>;

const Template = (args: Record<string, unknown>) => ({
	components: { Pagination },
	setup() {
		const currentPage = ref((args as { currentPage?: number }).currentPage || 1);
		return { args, currentPage };
	},
	template: '<Pagination v-bind="args" v-model:current-page="currentPage" />',
});

export const Default: StoryObj = {
	args: {
		total: 100,
		pageSize: 10,
		layout: 'prev, pager, next',
		showEdges: true,
	},
	render: Template,
};

export const WithBackground: StoryObj = {
	render: Template,
	args: {
		total: 150,
		pageSize: 20,
		background: true,
		pagerCount: 5,
	},
};
export const FullLayout: StoryObj = {
	render: Template,
	args: {
		total: 500,
		pageSize: 20,
		layout: 'total, prev, pager, next, sizes',
		pageSizes: [10, 20, 50, 100],
		background: true,
	},
};

export const WithJumper: StoryObj = {
	render: Template,
	args: {
		total: 300,
		pageSize: 30,
		layout: 'prev, pager, next, jumper',
		background: true,
	},
};

export const SmallSize: StoryObj = {
	render: Template,
	args: {
		total: 200,
		pageSize: 10,
		background: true,
		size: 'small',
	},
};

export const MediumSize: StoryObj = {
	render: Template,
	args: {
		total: 200,
		pageSize: 10,
		background: true,
		size: 'medium',
	},
};

export const GhostVariant: StoryObj = {
	render: Template,
	args: {
		total: 100,
		pageSize: 10,
		variant: 'ghost',
	},
};

export const Disabled: StoryObj = {
	render: Template,
	args: {
		total: 100,
		pageSize: 10,
		background: true,
		disabled: true,
	},
};

export const HideOnSinglePage: StoryObj = {
	render: Template,
	args: {
		total: 15,
		pageSize: 20,
		hideOnSinglePage: true,
	},
};

export const CustomText: StoryObj = {
	render: Template,
	args: {
		total: 100,
		pageSize: 10,
		background: true,
		prevText: 'Previous',
		nextText: 'Next',
	},
};

export const ManyPages: StoryObj = {
	render: Template,
	args: {
		total: 1000,
		pageSize: 10,
		background: true,
		pagerCount: 7,
		showEdges: true,
		currentPage: 50,
	},
};

export const ClientSidePagination: StoryObj = {
	render: () => ({
		components: { Pagination },
		setup() {
			const allItems = ref(
				Array.from({ length: 95 }, (_, i) => ({
					id: i + 1,
					name: `Item ${i + 1}`,
				})),
			);
			const currentPage = ref(1);
			const pageSize = 20;

			return { allItems, currentPage, pageSize };
		},
		template: `
		<div>
			<div style="margin-bottom: 16px;">
				<div v-for="item in paginatedItems" :key="item.id" style="padding: 8px; border-bottom: 1px solid #eee;">
					{{ item.name }}
				</div>
			</div>
			<Pagination
				v-model:current-page="currentPage"
				:page-size="pageSize"
				:total="allItems.length"
				background
			/>
		</div>
	`,
		computed: {
			paginatedItems() {
				const start = (this.currentPage - 1) * this.pageSize;
				const end = start + this.pageSize;
				return this.allItems.slice(start, end);
			},
		},
	}),
};
