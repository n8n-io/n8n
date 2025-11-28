import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import Pagination from './Pagination.vue';

const meta = {
	title: 'Design system v3/Pagination',
	component: Pagination,
	parameters: {
		docs: {
			source: { type: 'dynamic' },
		},
	},
} satisfies Meta<typeof Pagination>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: (args) => ({
		components: { Pagination },
		setup() {
			const currentPage = ref(args.currentPage ?? 1);
			return { args, currentPage };
		},
		template: `
			<div style="padding: 40px;">
				<Pagination
					:current-page="currentPage"
					:page-size="args.pageSize"
					:total="args.total"
					@update:current-page="(page) => currentPage = page"
				/>
			</div>
		`,
	}),
	args: {
		currentPage: 1,
		pageSize: 10,
		total: 100,
	},
};

export const ManyPages: Story = {
	render: (args) => ({
		components: { Pagination },
		setup() {
			const currentPage = ref(args.currentPage ?? 1);
			return { args, currentPage };
		},
		template: `
			<div style="padding: 40px;">
				<Pagination
					:current-page="currentPage"
					:page-size="args.pageSize"
					:total="args.total"
					@update:current-page="(page) => currentPage = page"
				/>
			</div>
		`,
	}),
	args: {
		currentPage: 1,
		pageSize: 10,
		total: 500,
	},
};

export const SmallPageSize: Story = {
	render: (args) => ({
		components: { Pagination },
		setup() {
			const currentPage = ref(args.currentPage ?? 1);
			return { args, currentPage };
		},
		template: `
			<div style="padding: 40px;">
				<Pagination
					:current-page="currentPage"
					:page-size="args.pageSize"
					:total="args.total"
					@update:current-page="(page) => currentPage = page"
				/>
			</div>
		`,
	}),
	args: {
		currentPage: 1,
		pageSize: 5,
		total: 50,
	},
};
