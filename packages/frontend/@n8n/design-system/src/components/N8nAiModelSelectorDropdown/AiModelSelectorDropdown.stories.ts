import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref, watch } from 'vue';

import { items } from './AiModelSelectorDropdown.stories.utils';
import type {
	AiModelSelectorMenuItem,
	AiModelSelectorMenuItemData,
} from './AiModelSelectorDropdown.types';
import N8nAiModelSelectorDropdown from './AiModelSelectorDropdown.vue';
import { useDropdownSearch } from '../N8nDropdownMenu/composables/useDropdownSearch';

type GenericMeta<C> = Omit<Meta<C>, 'component'> & {
	component: Record<keyof C, unknown>;
};

function findItemById(
	itemsToSearch: AiModelSelectorMenuItem[],
	id: string,
): AiModelSelectorMenuItem | undefined {
	for (const item of itemsToSearch) {
		if (item.id === id) return item;
		const child = item.children ? findItemById(item.children, id) : undefined;
		if (child) return child;
	}

	return undefined;
}

function findItemByLabel(
	itemsToSearch: AiModelSelectorMenuItem[],
	label: string,
): AiModelSelectorMenuItem | undefined {
	for (const item of itemsToSearch) {
		if (item.label === label) return item;
		const child = item.children ? findItemByLabel(item.children, label) : undefined;
		if (child) return child;
	}

	return undefined;
}

const meta = {
	title: 'AI/AiModelSelectorDropdown',
	component: N8nAiModelSelectorDropdown,
	parameters: {
		docs: {
			description: {
				component:
					'A reusable dropdown shell for AI model selectors. Product features provide model data, leading icons, search behavior, and selection handling.',
			},
		},
	},
	render: (args) => ({
		components: { N8nAiModelSelectorDropdown },
		setup: () => {
			const selectedItem = ref(findItemByLabel(args.items ?? [], args.selectedLabel));
			const selectedLabel = ref(args.selectedLabel);
			const getProviderId = (id: string) => id.split('::')[0];
			const getProviderLogo = (id: string) => `https://models.dev/logos/${getProviderId(id)}.svg`;
			const selectedProviderLogo = computed(() =>
				selectedItem.value ? getProviderLogo(selectedItem.value.id) : undefined,
			);
			const { search, filteredItems, handleSearch } = useDropdownSearch(() => args.items ?? [], {
				flatList: true,
				searchFields: (item) => [item.label, item.data?.fullName],
				mapResult: (item, path) => ({
					...item,
					divided: false,
					data: item.data
						? { ...item.data, parts: path.map((pathItem) => pathItem.label) }
						: undefined,
				}),
			});

			const storyArgs = computed(() => ({
				...args,
				items: search.value.trim() ? filteredItems.value : args.items,
				selectedLabel: selectedLabel.value,
			}));

			function handleSelect(id: string) {
				const item = findItemById(args.items ?? [], id);
				if (!item) return;

				selectedItem.value = item;
				selectedLabel.value = item.label;
			}

			watch(
				() => [args.items, args.selectedLabel] as const,
				([nextItems, nextSelectedLabel]) => {
					selectedItem.value = findItemByLabel(nextItems ?? [], nextSelectedLabel);
					selectedLabel.value = nextSelectedLabel;
				},
			);

			return { storyArgs, selectedProviderLogo, getProviderLogo, handleSearch, handleSelect };
		},
		template: `
			<N8nAiModelSelectorDropdown v-bind="storyArgs" @search="handleSearch" @select="handleSelect">
				<template #trigger-leading="{ ui }">
					<img
						v-if="selectedProviderLogo"
						:class="ui.class"
						:src="selectedProviderLogo"
						alt="OpenAI"
						style="width: 20px; height: 20px; border-radius: 999px;"
					/>
				</template>
				<template #item-leading="{ item, ui }">
					<img
						:class="ui.class"
						:src="getProviderLogo(item.id)"
						alt=""
						style="width: 20px; height: 20px; border-radius: 999px;"
					/>
				</template>
			</N8nAiModelSelectorDropdown>
		`,
	}),
} satisfies GenericMeta<typeof N8nAiModelSelectorDropdown<AiModelSelectorMenuItemData>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		items,
		selectedLabel: 'GPT-5.2',
		selectedCredentialName: 'Production OpenAI credential',
		noMatchLabel: 'No models found',
		dataTestId: 'ai-model-selector',
		credentialDataTestId: 'ai-model-selector-credential',
	},
};

export const MissingCredentials: Story = {
	args: {
		...Default.args,
		selectedLabel: 'Claude Sonnet 4.6',
		selectedCredentialName: undefined,
		credentialsMissing: true,
	},
};
