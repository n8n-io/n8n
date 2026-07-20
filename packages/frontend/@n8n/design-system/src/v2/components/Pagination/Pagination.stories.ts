/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import Pagination from './Pagination.vue';

export default {
	title: 'Experimental/Pagination',
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
		size: {
			control: 'select',
			options: ['default', 'small'],
			description: 'Size variant',
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

type Story = StoryObj<typeof Pagination>;

const Template: NonNullable<Story['render']> = (args) => ({
	components: { Pagination },
	setup() {
		const currentPage = ref(args.currentPage ?? 1);
		return { args, currentPage };
	},
	template: '<Pagination v-bind="args" v-model:current-page="currentPage" />',
});

export const Default: Story = {
	args: {
		total: 100,
		pageSize: 10,
		layout: 'prev, pager, next',
		showEdges: true,
	},
	render: Template,
};

export const OnePage: Story = {
	render: Template,
	args: {
		total: 8,
		pageSize: 10,
		layout: 'prev, pager, next',
	},
};

export const FullLayout: Story = {
	render: Template,
	args: {
		total: 500,
		pageSize: 20,
		layout: 'total, prev, pager, next, sizes',
		pageSizes: [10, 20, 50, 100],
	},
};

export const WithJumper: Story = {
	render: Template,
	args: {
		total: 300,
		pageSize: 30,
		layout: 'prev, pager, next, jumper',
	},
};

export const Sizes: Story = {
	render: (args) => ({
		components: { Pagination },
		setup() {
			const defaultPage = ref(args.currentPage ?? 1);
			const smallPage = ref(args.currentPage ?? 1);
			return { args, defaultPage, smallPage };
		},
		template: `
		<div style="display: flex; flex-direction: column; gap: 24px; padding: 16px;">
			<div>
				<h3 style="margin: 0 0 8px;">Default</h3>
				<Pagination v-bind="args" size="default" v-model:current-page="defaultPage" />
			</div>
			<div>
				<h3 style="margin: 0 0 8px;">Small</h3>
				<Pagination v-bind="args" size="small" v-model:current-page="smallPage" />
			</div>
		</div>
		`,
	}),
	args: {
		total: 1000,
		pageSize: 10,
		layout: 'prev, pager, next, jumper',
		showEdges: true,
		currentPage: 50,
	},
};

export const Disabled: Story = {
	render: Template,
	args: {
		total: 100,
		pageSize: 10,
		currentPage: 3,
		disabled: true,
		layout: 'total, prev, pager, next, sizes, jumper',
		pageSizes: [10, 20, 50],
	},
};

export const CustomButtons: Story = {
	name: 'Custom navigation buttons',
	render: Template,
	args: {
		total: 100,
		pageSize: 10,
		prevText: 'Previous',
		nextText: 'Next',
	},
};

export const ManyPages: Story = {
	render: Template,
	args: {
		total: 1000,
		pageSize: 10,
		pagerCount: 7,
		showEdges: true,
		currentPage: 50,
		layout: 'prev, pager, next, jumper',
	},
};

export const ClientSidePagination: Story = {
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
		<div style="padding: 16px;">
			<div style="margin-bottom: 16px;">
				<div v-for="item in paginatedItems" :key="item.id" style="padding: 8px; border-bottom: 1px solid #eee;">
					{{ item.name }}
				</div>
			</div>
			<Pagination
				v-model:current-page="currentPage"
				:page-size="pageSize"
				:total="allItems.length"
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
