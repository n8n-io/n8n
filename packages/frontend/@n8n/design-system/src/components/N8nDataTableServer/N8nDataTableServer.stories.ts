import type { StoryFn } from '@storybook/vue3-vite';
import { computed, ref, type Component } from 'vue';

import { PAGINATION_ALL_ITEMS_PER_PAGE } from '../N8nPagination';
import N8nDataTableServer, { type TableHeader, type TableOptions } from './N8nDataTableServer.vue';

type Person = {
	id: string;
	name: string;
	role: string;
};

const roles = ['Admin', 'Member', 'Viewer'];

const people: Person[] = Array.from({ length: 48 }, (_, index) => {
	const label = String(index + 1).padStart(2, '0');
	return {
		id: label,
		name: `Person ${label}`,
		role: roles[index % roles.length],
	};
});

const headers: Array<TableHeader<Person>> = [
	{ title: 'Name', key: 'name' },
	{ title: 'Role', key: 'role' },
];

function sortedPeople(rows: Person[], sortBy: TableOptions['sortBy']) {
	if (sortBy.length === 0) return rows;

	return rows.slice().sort((a, b) => {
		for (const sort of sortBy) {
			const key = sort.id as keyof Person;
			const diff = String(a[key]).localeCompare(String(b[key]));
			if (diff !== 0) return sort.desc ? -diff : diff;
		}
		return 0;
	});
}

function formatSort(sortBy: TableOptions['sortBy']) {
	if (sortBy.length === 0) return 'none';
	return sortBy.map((sort) => `${sort.id} ${sort.desc ? 'descending' : 'ascending'}`).join(', ');
}

export default {
	title: 'Core/DataTableServer',
	component: N8nDataTableServer,
	parameters: {
		docs: {
			description: {
				component:
					'Renders one page of rows. The parent supplies that page and the total count. Page, page size, and sort changes emit update:options. Page is 0-indexed.',
			},
		},
	},
};

type Account = Person & {
	email: string;
	lastActive: string;
	twoFactor: string;
	projects: string;
	createdAt: string;
};

const accounts: Account[] = people.slice(0, 8).map((person, index) => ({
	...person,
	email: `person.${person.id}@example.com`,
	lastActive: `${index + 1} day${index === 0 ? '' : 's'} ago`,
	twoFactor: index % 2 === 0 ? 'Enabled' : 'Disabled',
	projects: ['Marketing', 'Sales', 'Engineering', 'Support'].slice(0, (index % 4) + 1).join(', '),
	createdAt: `2026-0${(index % 9) + 1}-14`,
}));

const wideHeaders: Array<TableHeader<Account>> = [
	{ title: 'Name', key: 'name', width: 220 },
	{ title: 'Email', key: 'email', width: 260 },
	{ title: 'Role', key: 'role', width: 160 },
	{ title: 'Last active', key: 'lastActive', width: 160 },
	{ title: '2FA', key: 'twoFactor', width: 120 },
	{ title: 'Projects', key: 'projects', width: 320, disableSort: true },
	{ title: 'Created', key: 'createdAt', width: 140 },
];

export const Default: StoryFn = () => ({
	// The generic table is not assignable to Storybook's component type.
	components: { N8nDataTableServer: N8nDataTableServer as unknown as Component },
	setup() {
		const page = ref(0);
		const itemsPerPage = ref(10);
		const sortBy = ref<TableOptions['sortBy']>([]);
		const latest = ref<TableOptions>({
			page: page.value,
			itemsPerPage: itemsPerPage.value,
			sortBy: [],
		});
		const pageItems = computed(() => {
			const sorted = sortedPeople(people, sortBy.value);
			if (itemsPerPage.value === PAGINATION_ALL_ITEMS_PER_PAGE) return sorted;

			const start = page.value * itemsPerPage.value;
			return sorted.slice(start, start + itemsPerPage.value);
		});
		const pageSizeLabel = computed(() =>
			latest.value.itemsPerPage === PAGINATION_ALL_ITEMS_PER_PAGE
				? 'all'
				: `${latest.value.itemsPerPage} per page`,
		);
		const sortLabel = computed(() => formatSort(latest.value.sortBy));

		function onOptions(payload: TableOptions) {
			latest.value = payload;
		}

		return {
			headers,
			page,
			itemsPerPage,
			sortBy,
			pageItems,
			total: people.length,
			latest,
			pageSizeLabel,
			sortLabel,
			onOptions,
		};
	},
	template: `
		<div style="display: flex; flex-direction: column; gap: var(--spacing--sm); padding: var(--spacing--md);">
			<N8nDataTableServer
				v-model:page="page"
				v-model:items-per-page="itemsPerPage"
				v-model:sort-by="sortBy"
				:headers="headers"
				:items="pageItems"
				:items-length="total"
				show-all
				@update:options="onOptions"
			/>
			<p style="margin: 0; font-size: var(--font-size--2xs); color: var(--color--text--tint-1);">
				update:options — page {{ latest.page }} (0-indexed), {{ pageSizeLabel }}, sort {{ sortLabel }}
			</p>
		</div>
	`,
});

function wideTableStory(): StoryFn {
	return (args) => ({
		components: { N8nDataTableServer: N8nDataTableServer as unknown as Component },
		setup() {
			return { args, headers: wideHeaders, items: accounts, total: accounts.length };
		},
		template: `
			<div style="max-width: 720px; padding: var(--spacing--md);">
				<N8nDataTableServer
					v-bind="args"
					:headers="headers"
					:items="items"
					:items-length="total"
				/>
			</div>
		`,
	});
}

export const HorizontalScroll = wideTableStory();
HorizontalScroll.args = { showSelect: false };
HorizontalScroll.parameters = {
	docs: {
		description: {
			story:
				'The table is wider than its container. It scrolls sideways. No column stays in place.',
		},
	},
};

export const PinnedColumn = wideTableStory();
PinnedColumn.args = { pinColumns: 1, showSelect: true };
PinnedColumn.argTypes = {
	pinColumns: {
		control: { type: 'number', min: 0, max: wideHeaders.length, step: 1 },
	},
};
PinnedColumn.parameters = {
	docs: {
		description: {
			story:
				'Leading columns stay in place while the table scrolls. Change Pin columns in the controls. The selection column stays in front of them when it is shown. A border appears on the inner edge once you scroll.',
		},
	},
};
