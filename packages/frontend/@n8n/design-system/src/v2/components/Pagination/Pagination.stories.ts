/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';

import Pagination from './Pagination.vue';

export default {
	title: 'Experimental/Pagination',
	component: Pagination,
	tags: ['autodocs'],
	argTypes: {
		currentPage: {
			control: 'number',
			description: 'Current active page number (1-indexed). Alias for `page`.',
		},
		page: {
			control: 'number',
			description: 'Current page (Reka prop). Prefer `currentPage` for Element+ compatibility.',
		},
		pageSize: {
			control: 'number',
			description: 'Number of items per page. Alias for `itemsPerPage`.',
		},
		itemsPerPage: {
			control: 'number',
			description: 'Items per page (Reka prop). Prefer `pageSize` for Element+ compatibility.',
		},
		total: {
			control: 'number',
			description: 'Total number of items',
		},
		pageCount: {
			control: 'number',
			description: 'Total number of pages. Takes precedence over `total`.',
		},
		pagerCount: {
			control: 'number',
			description:
				'Odd number of page buttons around the current page before ellipsis (e.g. 5 or 7). Alias for siblingCount.',
		},
		siblingCount: {
			control: 'number',
			description:
				'Pages to show on each side of the current page before ellipsis. Prefer pagerCount for Element+ compatibility.',
		},
		showEdges: {
			control: 'boolean',
			description: 'Always show first and last page buttons (with ellipsis when needed)',
		},
		size: {
			control: 'select',
			options: ['small', 'medium'],
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
		prevText: {
			control: 'text',
			description: 'Custom text for the previous button',
		},
		nextText: {
			control: 'text',
			description: 'Custom text for the next button',
		},
		defaultCurrentPage: {
			control: 'number',
			description: 'Initial page in uncontrolled mode',
		},
		defaultPageSize: {
			control: 'number',
			description: 'Initial page size in uncontrolled mode',
		},
		defaultPage: {
			control: 'number',
			description: 'Initial page in uncontrolled mode (Reka prop). Prefer `defaultCurrentPage`.',
		},
	},
} satisfies Meta<typeof Pagination>;

type Story = StoryObj<typeof Pagination>;

const Template: NonNullable<Story['render']> = (args) => ({
	components: { Pagination },
	setup() {
		const currentPage = ref(args.currentPage ?? args.page ?? 1);
		return { args, currentPage };
	},
	template: '<Pagination v-bind="args" v-model:current-page="currentPage" />',
});

export const Default: Story = {
	args: {
		total: 100,
		pageSize: 10,
	},
	render: Template,
};

export const OnePage: Story = {
	name: 'One Page',
	render: Template,
	args: {
		total: 8,
		pageSize: 10,
	},
};

export const HideOnSinglePage: Story = {
	name: 'Hide On Single Page',
	render: () => ({
		components: { Pagination },
		template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--xl); padding: var(--spacing--md);">
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					One page — hidden
				</h3>
				<Pagination
					:total="8"
					:page-size="10"
					hide-on-single-page
				/>
				<p style="margin: var(--spacing--sm) 0 0; font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
					(nothing rendered)
				</p>
			</section>
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					Multiple pages — visible
				</h3>
				<Pagination
					:total="100"
					:page-size="10"
					hide-on-single-page
				/>
			</section>
		</div>
		`,
	}),
};

export const PageCount: Story = {
	name: 'Page Count (no total)',
	render: Template,
	args: {
		pageCount: 12,
		pageSize: 10,
	},
};

export const Sizes: Story = {
	render: (args) => ({
		components: { Pagination },
		setup() {
			const mediumPage = ref(args.currentPage ?? 1);
			const smallPage = ref(args.currentPage ?? 1);
			return { args, mediumPage, smallPage };
		},
		template: `
		<div style="display: flex; flex-direction: column; gap: 24px; padding: 16px;">
			<div>
				<h3 style="margin: 0 0 8px;">Medium</h3>
				<Pagination v-bind="args" size="medium" v-model:current-page="mediumPage" />
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
	},
};

export const CustomButtons: Story = {
	name: 'Custom Navigation Text',
	render: Template,
	args: {
		total: 100,
		pageSize: 10,
		prevText: 'Previous',
		nextText: 'Next',
	},
};

export const CustomSlots: Story = {
	name: 'Custom Prev/Next Slots',
	render: (args) => ({
		components: { Pagination },
		setup() {
			const currentPage = ref(args.currentPage ?? 2);
			return { args, currentPage };
		},
		template: `
		<Pagination v-bind="args" v-model:current-page="currentPage">
			<template #prev="{ disabled }">
				<button type="button" :disabled="disabled" style="padding: 4px 8px;">← Prev</button>
			</template>
			<template #next="{ disabled }">
				<button type="button" :disabled="disabled" style="padding: 4px 8px;">Next →</button>
			</template>
		</Pagination>
		`,
	}),
	args: {
		total: 100,
		pageSize: 10,
		currentPage: 2,
	},
};

export const ManyPages: Story = {
	name: 'Many Pages',
	render: Template,
	args: {
		total: 1000,
		pageSize: 10,
		pagerCount: 7,
		currentPage: 50,
	},
};

export const PagerCount: Story = {
	name: 'Pager Count / Sibling Count',
	render: (args) => ({
		components: { Pagination },
		setup() {
			const pageNarrow = ref(args.currentPage ?? 50);
			const pageDefault = ref(args.currentPage ?? 50);
			const pageWide = ref(args.currentPage ?? 50);
			const pageSibling = ref(args.currentPage ?? 50);
			return { args, pageNarrow, pageDefault, pageWide, pageSibling };
		},
		template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--xl); padding: var(--spacing--md);">
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					pagerCount: 3
				</h3>
				<Pagination
					v-bind="args"
					:pager-count="3"
					v-model:current-page="pageNarrow"
				/>
			</section>
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					pagerCount: 5
				</h3>
				<Pagination
					v-bind="args"
					:pager-count="5"
					v-model:current-page="pageDefault"
				/>
			</section>
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					pagerCount: 7
				</h3>
				<Pagination
					v-bind="args"
					:pager-count="7"
					v-model:current-page="pageWide"
				/>
			</section>
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					siblingCount: 2 (Reka prop)
				</h3>
				<Pagination
					v-bind="args"
					:sibling-count="2"
					v-model:current-page="pageSibling"
				/>
			</section>
		</div>
		`,
	}),
	args: {
		total: 1000,
		pageSize: 10,
		currentPage: 50,
	},
};

export const ShowEdges: Story = {
	name: 'Show Edges',
	render: (args) => ({
		components: { Pagination },
		setup() {
			const withEdges = ref(args.currentPage ?? 50);
			const withoutEdges = ref(args.currentPage ?? 50);
			return { args, withEdges, withoutEdges };
		},
		template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--xl); padding: var(--spacing--md);">
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					showEdges: true (default) — always shows first &amp; last page
				</h3>
				<Pagination
					v-bind="args"
					:show-edges="true"
					v-model:current-page="withEdges"
				/>
			</section>
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					showEdges: false — only siblings around the current page
				</h3>
				<Pagination
					v-bind="args"
					:show-edges="false"
					v-model:current-page="withoutEdges"
				/>
			</section>
		</div>
		`,
	}),
	args: {
		total: 1000,
		pageSize: 10,
		currentPage: 50,
		pagerCount: 5,
	},
};

export const PropAliases: Story = {
	name: 'Prop Aliases (page / itemsPerPage)',
	render: (args) => ({
		components: { Pagination },
		setup() {
			const page = ref(args.page ?? 2);
			return { args, page };
		},
		template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--md); padding: var(--spacing--md);">
			<p style="margin: 0; font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
				Uses Reka names <code>page</code> and <code>items-per-page</code> instead of <code>current-page</code> / <code>page-size</code>.
			</p>
			<Pagination
				v-bind="args"
				v-model:page="page"
				:items-per-page="20"
				:total="100"
			/>
			<p style="margin: 0; font-size: var(--font-size--sm);">
				Page: <strong>{{ page }}</strong>
			</p>
		</div>
		`,
	}),
	args: {
		page: 2,
	},
};

export const ControlledUncontrolled: Story = {
	name: 'Controlled/Uncontrolled',
	render: () => ({
		components: { Pagination },
		setup() {
			const currentPage = ref(3);
			return { currentPage };
		},
		template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--xl); padding: var(--spacing--md);">
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					Controlled
				</h3>
				<p style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
					Parent owns state via <code>v-model:current-page</code>.
				</p>
				<Pagination
					key="controlled"
					v-model:current-page="currentPage"
					:page-size="10"
					:total="100"
				/>
				<div style="display: flex; gap: var(--spacing--2xs); margin-top: var(--spacing--sm); flex-wrap: wrap;">
					<button type="button" @click="currentPage = 1">Go to page 1</button>
					<button type="button" @click="currentPage = 5">Go to page 5</button>
				</div>
				<p style="margin-top: var(--spacing--sm); font-size: var(--font-size--sm);">
					Page: <strong>{{ currentPage }}</strong>
				</p>
			</section>
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					Uncontrolled
				</h3>
				<p style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
					Initial state via <code>default-current-page</code>. The component manages its own state after mount.
				</p>
				<Pagination
					key="uncontrolled"
					:default-current-page="3"
					:page-size="10"
					:total="100"
				/>
			</section>
		</div>
		`,
	}),
};

export const ClientSidePagination: Story = {
	name: 'Client Side Pagination',
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
			const paginatedItems = computed(() => {
				const start = (currentPage.value - 1) * pageSize;
				return allItems.value.slice(start, start + pageSize);
			});

			return { allItems, currentPage, pageSize, paginatedItems };
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
	}),
};
