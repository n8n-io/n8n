<script lang="ts" setup>
import { FocusScope } from 'reka-ui';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import N8nCommandBarItem from './CommandBarItem.vue';
import type { CommandBarItem } from './types';
import N8nBadge from '../N8nBadge';
import N8nLoading from '../N8nLoading/Loading.vue';
import N8nScrollArea from '../N8nScrollArea/N8nScrollArea.vue';

interface CommandBarProps {
	placeholder?: string;
	context?: string;
	items: CommandBarItem[];
	isLoading?: boolean;
	zIndex?: number;
}

defineOptions({ name: 'N8nCommandBar' });
const props = withDefaults(defineProps<CommandBarProps>(), {
	placeholder: 'Type a command...',
	context: '',
	isLoading: false,
	zIndex: 1900,
});

const emit = defineEmits<{
	inputChange: [value: string];
	navigateTo: [parentId: string | null];
}>();

const NUM_LOADING_ITEMS = 8;

const isOpen = ref(false);
const inputRef = ref<HTMLInputElement>();
const selectedIndex = ref(-1);
const inputValue = ref('');
const currentParentId = ref<string | null>(null);

const currentParent = computed(() => {
	return props.items.find((item) => item.id === currentParentId.value);
});

const currentItems = computed(() => {
	return currentParent.value ? (currentParent.value.children ?? []) : props.items;
});

const currentPlaceholder = computed(() => {
	return currentParent.value?.placeholder ?? props.placeholder;
});

const commandBarRef = ref<HTMLElement>();
const itemsListRef = ref<HTMLElement>();
const scrollAreaRef = ref<InstanceType<typeof N8nScrollArea>>();

const filteredItems = computed(() => {
	let items = currentItems.value;

	if (inputValue.value) {
		const query = inputValue.value.toLowerCase();
		items = items.filter((item) => {
			const searchText = [
				typeof item.title === 'string' ? item.title : '',
				...(item.keywords ?? []),
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();

			return searchText.includes(query);
		});
	}

	return items;
});

const groupedItems = computed(() => {
	const items = filteredItems.value;
	const ungrouped: CommandBarItem[] = [];
	const sections: Record<string, CommandBarItem[]> = {};

	items.forEach((item) => {
		if (item.section) {
			if (!sections[item.section]) {
				sections[item.section] = [];
			}
			sections[item.section].push(item);
		} else {
			ungrouped.push(item);
		}
	});

	return {
		ungrouped,
		sections: Object.entries(sections).map(([title, items]) => ({
			title,
			items,
		})),
	};
});

const flattenedItems = computed(() => {
	const result: CommandBarItem[] = [];

	result.push(...groupedItems.value.ungrouped);

	groupedItems.value.sections.forEach((section) => {
		result.push(...section.items);
	});

	return result;
});

const getGlobalIndex = (item: CommandBarItem): number => {
	return flattenedItems.value.findIndex((flatItem) => flatItem.id === item.id);
};

const scrollSelectedIntoView = () => {
	if (selectedIndex.value < 0) return;

	void nextTick(async () => {
		if (selectedIndex.value === 0) {
			await scrollAreaRef.value?.scrollToTop({ smooth: true });
			return;
		} else if (selectedIndex.value === flattenedItems.value.length - 1) {
			await scrollAreaRef.value?.scrollToBottom({ smooth: true });
			return;
		}

		const selectedItem = flattenedItems.value[selectedIndex.value];
		if (!selectedItem) return;

		const selectedElement = document.querySelector(`[data-item-id="${selectedItem.id}"]`);
		if (selectedElement) {
			selectedElement.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
			});
		}
	});
};

const openCommandBar = async () => {
	isOpen.value = true;
	selectedIndex.value = 0;
	inputValue.value = '';
	await nextTick();
	inputRef.value?.focus();
};

const closeCommandBar = () => {
	isOpen.value = false;
	selectedIndex.value = -1;
	inputValue.value = '';
	currentParentId.value = null;
};

const navigateToChildren = (item: CommandBarItem) => {
	currentParentId.value = item.id;
	selectedIndex.value = 0;
	inputValue.value = '';
	scrollSelectedIntoView();

	emit('navigateTo', item.id);
};

const navigateBack = () => {
	if (!currentParent.value) return;

	currentParentId.value = null;
	selectedIndex.value = 0;
	inputValue.value = '';

	emit('navigateTo', null);
};

const selectItem = (item: CommandBarItem) => {
	if (item.children) {
		navigateToChildren(item);
		return;
	}

	if (item.handler) {
		void item.handler();
	}

	closeCommandBar();
};

const handleKeydown = (event: KeyboardEvent) => {
	if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
		event.preventDefault();
		void openCommandBar();
		return;
	}

	if (!isOpen.value) return;

	switch (event.key) {
		case 'Escape':
			event.preventDefault();
			void closeCommandBar();
			break;
		case 'ArrowDown':
			event.preventDefault();
			selectedIndex.value = Math.min(selectedIndex.value + 1, flattenedItems.value.length - 1);
			scrollSelectedIntoView();
			break;
		case 'ArrowUp':
			event.preventDefault();
			selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
			scrollSelectedIntoView();
			break;
		case 'ArrowLeft':
			if (!inputValue.value && currentParent.value) {
				event.preventDefault();
				void navigateBack();
			}
			break;
		case 'ArrowRight':
			if (selectedIndex.value >= 0 && flattenedItems.value[selectedIndex.value]) {
				const selectedItem = flattenedItems.value[selectedIndex.value];
				if (selectedItem.children) {
					event.preventDefault();
					void navigateToChildren(selectedItem);
				}
			}
			break;
		case 'Enter':
			event.preventDefault();
			event.stopPropagation();
			if (selectedIndex.value >= 0 && flattenedItems.value[selectedIndex.value]) {
				void selectItem(flattenedItems.value[selectedIndex.value]);
			}
			break;
	}
};

const handleClickOutside = (event: MouseEvent) => {
	if (!isOpen.value) return;

	if (commandBarRef.value && !commandBarRef.value.contains(event.target as Node)) {
		closeCommandBar();
	}
};

watch(inputValue, (newValue) => {
	emit('inputChange', newValue);
	selectedIndex.value = 0;
});

onMounted(() => {
	document.addEventListener('keydown', handleKeydown);
	document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
	document.removeEventListener('keydown', handleKeydown);
	document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
	<Teleport to="body">
		<FocusScope :trapped="isOpen">
			<Transition name="command-bar" appear>
				<div
					v-if="isOpen"
					ref="commandBarRef"
					:class="$style.commandBar"
					:style="{ zIndex }"
					data-test-id="command-bar"
				>
					<div v-if="context" :class="$style.contextContainer">
						<N8nBadge size="small">{{ context }}</N8nBadge>
					</div>
					<input
						ref="inputRef"
						v-model="inputValue"
						:placeholder="currentPlaceholder"
						:class="$style.input"
						type="text"
					/>
					<div v-if="isLoading" :class="$style.loadingContainer">
						<div v-for="i in NUM_LOADING_ITEMS" :key="i" :class="$style.loadingItem">
							<N8nLoading variant="custom" :class="$style.loading" />
						</div>
					</div>
					<N8nScrollArea
						v-else-if="flattenedItems.length > 0"
						ref="scrollAreaRef"
						max-height="350px"
						:class="$style.scrollArea"
						data-test-id="command-bar-items-list"
					>
						<div ref="itemsListRef" :class="$style.itemsList">
							<div v-if="groupedItems.ungrouped.length > 0" :class="$style.ungroupedSection">
								<div v-for="item in groupedItems.ungrouped" :key="item.id">
									<N8nCommandBarItem
										:item="item"
										:is-selected="getGlobalIndex(item) === selectedIndex"
										@select="selectItem"
									/>
								</div>
							</div>

							<template v-for="section in groupedItems.sections" :key="section.title">
								<div :class="$style.sectionHeader">{{ section.title }}</div>
								<div v-for="item in section.items" :key="item.id">
									<N8nCommandBarItem
										:item="item"
										:is-selected="getGlobalIndex(item) === selectedIndex"
										@select="selectItem"
									/>
								</div>
							</template>
						</div>
					</N8nScrollArea>
					<div v-else-if="inputValue && flattenedItems.length === 0" :class="$style.noResults">
						No results found
					</div>
				</div>
			</Transition>
		</FocusScope>
	</Teleport>
</template>

<style lang="scss" module>
.commandBar {
	position: fixed;
	top: 20vh;
	left: 50%;
	transform: translateX(-50%);
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius);
	box-shadow: var(--command-bar--shadow);

	width: 100%;
	max-width: 700px;
}

.input {
	width: 100%;
	border: none;
	outline: none;
	background: transparent;
	font-size: var(--font-size--sm);
	font-family: var(--font-family);
	color: var(--color--text);
	height: var(--spacing--2xl);
	padding: 0 var(--spacing--2xs);
	padding-left: var(--spacing--sm);
	border-bottom: var(--border);

	&::placeholder {
		color: var(--color--text--tint-1);
	}
}

.scrollArea {
	padding: 0 var(--spacing--2xs) var(--spacing--2xs);
}

.itemsList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.ungroupedSection {
	padding-top: var(--spacing--2xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.sectionHeader {
	padding: var(--spacing--xs) var(--spacing--2xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	color: var(--color--text--tint-1);
}

.noResults {
	padding: var(--spacing--lg);
	text-align: center;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
}

.contextContainer {
	padding: var(--spacing--xs) var(--spacing--xs) 0;
}

.loadingContainer {
	max-height: 300px;
	overflow-y: auto;
}

.loadingItem {
	height: var(--spacing--2xl);
	padding: var(--spacing--xs) var(--spacing--sm);
}
</style>

<style lang="scss">
/* Global transition classes for command bar animations */
.command-bar-enter-active {
	transition:
		opacity 0.1s ease-out,
		transform 0.1s ease-out;
}

.command-bar-leave-active {
	transition:
		opacity 0.1s ease-in,
		transform 0.1s ease-in;
}

.command-bar-enter-from {
	opacity: 0;
	transform: translateX(-50%) translateY(-20px) scale(0.95);
}

.command-bar-leave-to {
	opacity: 0;
	transform: translateX(-50%) translateY(-10px) scale(0.98);
}

.command-bar-enter-to,
.command-bar-leave-from {
	opacity: 1;
	transform: translateX(-50%) translateY(0) scale(1);
}
</style>
