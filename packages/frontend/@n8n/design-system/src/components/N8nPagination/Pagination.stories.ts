/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';

import Pagination from './Pagination.vue';

export default {
	title: 'Core/Pagination',
	component: Pagination,
	tags: ['autodocs'],
	argTypes: {
		page: {
			control: 'number',
			description:
				'Controlled current page (1-indexed). Supports v-model:page. When set, stays authoritative until the parent accepts the update.',
		},
		defaultPage: {
			control: 'number',
			description: 'Initial page in uncontrolled mode',
		},
		itemsPerPage: {
			control: 'number',
			description:
				'Controlled items per page. Supports v-model:items-per-page. When set, stays authoritative until the parent accepts the update.',
		},
		defaultItemsPerPage: {
			control: 'number',
			description: 'Initial items-per-page in uncontrolled mode',
		},
		pageSizes: {
			control: 'object',
			description: 'Options for the page size selector',
		},
		showTotal: {
			control: 'boolean',
			description: 'Show the total item count',
		},
		showSizes: {
			control: 'boolean',
			description: 'Show the page size selector',
		},
		showJumper: {
			control: 'boolean',
			description: 'Show the go-to-page jumper. Off by default.',
		},
		total: {
			control: 'number',
			description: 'Total number of items across all pages',
		},
		siblingCount: {
			control: 'number',
			description: 'Pages to show on each side of the current page before ellipsis.',
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
	},
} satisfies Meta<typeof Pagination>;

type Story = StoryObj<typeof Pagination>;

const Template: NonNullable<Story['render']> = (args) => ({
	components: { Pagination },
	setup() {
		const page = ref(args.page ?? 1);
		const itemsPerPage = ref(args.itemsPerPage ?? 10);
		return { args, page, itemsPerPage };
	},
	template:
		'<Pagination v-bind="args" v-model:page="page" v-model:items-per-page="itemsPerPage" />',
});

export const Default: Story = {
	args: {
		total: 100,
		itemsPerPage: 10,
	},
	render: Template,
};

export const WithTotal: Story = {
	render: Template,
	args: {
		total: 100,
		itemsPerPage: 10,
		showTotal: true,
		showSizes: false,
	},
};

export const WithPageSizes: Story = {
	render: Template,
	args: {
		total: 500,
		itemsPerPage: 20,
		pageSizes: [10, 20, 50, 100],
		showTotal: false,
		showSizes: true,
	},
};

export const WithJumper: Story = {
	render: Template,
	args: {
		total: 300,
		itemsPerPage: 30,
		showTotal: false,
		showSizes: false,
		showJumper: true,
	},
};

export const OnePage: Story = {
	render: Template,
	args: {
		total: 8,
		itemsPerPage: 10,
	},
};

export const HideOnSinglePage: Story = {
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
					:items-per-page="10"
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
					:items-per-page="10"
					hide-on-single-page
				/>
			</section>
		</div>
		`,
	}),
};

export const Sizes: Story = {
	render: (args) => ({
		components: { Pagination },
		setup() {
			const mediumPage = ref(args.page ?? 1);
			const smallPage = ref(args.page ?? 1);
			return { args, mediumPage, smallPage };
		},
		template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--lg); padding: var(--spacing--md);">
			<div>
				<h3 style="margin: 0 0 var(--spacing--xs);">Medium</h3>
				<Pagination v-bind="args" size="medium" v-model:page="mediumPage" />
			</div>
			<div>
				<h3 style="margin: 0 0 var(--spacing--xs);">Small</h3>
				<Pagination v-bind="args" size="small" v-model:page="smallPage" />
			</div>
		</div>
		`,
	}),
	args: {
		total: 1000,
		itemsPerPage: 10,
		page: 50,
	},
};

export const Disabled: Story = {
	render: Template,
	args: {
		total: 100,
		itemsPerPage: 10,
		page: 3,
		disabled: true,
		pageSizes: [10, 20, 50],
	},
};

export const CustomSlots: Story = {
	name: 'Custom Prev/Next Slots',
	render: (args) => ({
		components: { Pagination },
		setup() {
			const page = ref(args.page ?? 2);
			return { args, page };
		},
		template: `
		<Pagination v-bind="args" v-model:page="page">
			<template #prev="{ disabled }">
				<button type="button" :disabled="disabled" data-test-id="story-prev" style="padding: var(--spacing--3xs) var(--spacing--xs);">
					Previous
				</button>
			</template>
			<template #next="{ disabled }">
				<button type="button" :disabled="disabled" data-test-id="story-next" style="padding: var(--spacing--3xs) var(--spacing--xs);">
					Next
				</button>
			</template>
		</Pagination>
		`,
	}),
	args: {
		total: 100,
		itemsPerPage: 10,
		page: 2,
	},
};

export const ManyPages: Story = {
	render: Template,
	args: {
		total: 1000,
		itemsPerPage: 10,
		siblingCount: 3,
		page: 50,
	},
};

export const SiblingCount: Story = {
	render: (args) => ({
		components: { Pagination },
		setup() {
			const pageNarrow = ref(args.page ?? 50);
			const pageDefault = ref(args.page ?? 50);
			const pageWide = ref(args.page ?? 50);
			return { args, pageNarrow, pageDefault, pageWide };
		},
		template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--xl); padding: var(--spacing--md);">
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					siblingCount: 1
				</h3>
				<Pagination
					v-bind="args"
					:sibling-count="1"
					v-model:page="pageNarrow"
				/>
			</section>
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					siblingCount: 2
				</h3>
				<Pagination
					v-bind="args"
					:sibling-count="2"
					v-model:page="pageDefault"
				/>
			</section>
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					siblingCount: 3
				</h3>
				<Pagination
					v-bind="args"
					:sibling-count="3"
					v-model:page="pageWide"
				/>
			</section>
		</div>
		`,
	}),
	args: {
		total: 1000,
		itemsPerPage: 10,
		page: 50,
	},
};

export const ShowEdges: Story = {
	render: (args) => ({
		components: { Pagination },
		setup() {
			const withEdges = ref(args.page ?? 50);
			const withoutEdges = ref(args.page ?? 50);
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
					v-model:page="withEdges"
				/>
			</section>
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					showEdges: false — only siblings around the current page
				</h3>
				<Pagination
					v-bind="args"
					:show-edges="false"
					v-model:page="withoutEdges"
				/>
			</section>
		</div>
		`,
	}),
	args: {
		total: 1000,
		itemsPerPage: 10,
		page: 50,
		siblingCount: 2,
	},
};

export const ControlledUncontrolled: Story = {
	name: 'Controlled/Uncontrolled',
	render: () => ({
		components: { Pagination },
		setup() {
			const page = ref(3);
			const itemsPerPage = ref(10);
			return { page, itemsPerPage };
		},
		template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--xl); padding: var(--spacing--md);">
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					Controlled
				</h3>
				<p style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
					Parent owns state via <code>v-model:page</code> and <code>v-model:items-per-page</code>.
				</p>
				<Pagination
					key="controlled"
					v-model:page="page"
					v-model:items-per-page="itemsPerPage"
					:total="100"
					:page-sizes="[10, 20, 50]"
				/>
				<div style="display: flex; gap: var(--spacing--2xs); margin-top: var(--spacing--sm); flex-wrap: wrap;">
					<button type="button" @click="page = 1">Go to page 1</button>
					<button type="button" @click="page = 5">Go to page 5</button>
					<button type="button" @click="itemsPerPage = 20">Set page size 20</button>
				</div>
				<p style="margin-top: var(--spacing--sm); font-size: var(--font-size--sm);">
					Page: <strong>{{ page }}</strong> · Size: <strong>{{ itemsPerPage }}</strong>
				</p>
			</section>
			<section>
				<h3 style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--sm); font-weight: var(--font-weight--bold);">
					Uncontrolled
				</h3>
				<p style="margin: 0 0 var(--spacing--sm); font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
					Initial values via <code>default-page</code> and <code>default-items-per-page</code>. The component owns state after mount.
				</p>
				<Pagination
					key="uncontrolled"
					:default-page="3"
					:default-items-per-page="10"
					:total="100"
					:page-sizes="[10, 20, 50]"
				/>
			</section>
		</div>
		`,
	}),
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
			const page = ref(1);
			const itemsPerPage = ref(20);
			const paginatedItems = computed(() => {
				const start = (page.value - 1) * itemsPerPage.value;
				return allItems.value.slice(start, start + itemsPerPage.value);
			});

			return { allItems, page, itemsPerPage, paginatedItems };
		},
		template: `
		<div style="padding: var(--spacing--md);">
			<div style="margin-bottom: var(--spacing--md);">
				<div v-for="item in paginatedItems" :key="item.id" style="padding: var(--spacing--xs); border-bottom: 1px solid var(--border-color);">
					{{ item.name }}
				</div>
			</div>
			<Pagination
				v-model:page="page"
				v-model:items-per-page="itemsPerPage"
				:total="allItems.length"
				:page-sizes="[10, 20, 50]"
			/>
		</div>
		`,
	}),
};
