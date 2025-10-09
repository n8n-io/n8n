<script lang="ts" setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import N8nCommandBarItem from './CommandBarItem.vue';
import type { CommandBarItem } from './types';
import N8nBadge from '../N8nBadge';

interface CommandBarProps {
	placeholder?: string;
	context?: string;
	items: CommandBarItem[];
}

defineOptions({ name: 'N8nCommandBar' });
const props = withDefaults(defineProps<CommandBarProps>(), {
	placeholder: 'Type a command...',
	context: '',
});

const emit = defineEmits<{
	inputChange: [value: string];
	navigateTo: [parentId: string | null];
	loadMore: [parentId: string];
}>();

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

const filteredItems = computed(() => {
	let items = currentItems.value;

	if (inputValue.value) {
		const query = inputValue.value.toLowerCase();
		items = items.filter((item) => {
			const searchText = [item.title, ...(item.keywords ?? [])]
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

	void nextTick(() => {
		if (selectedIndex.value === 0) {
			itemsListRef.value?.scrollTo({
				top: 0,
				behavior: 'smooth',
			});
			return;
		} else if (selectedIndex.value === flattenedItems.value.length - 1) {
			itemsListRef.value?.scrollTo({
				top: itemsListRef.value.scrollHeight,
				behavior: 'smooth',
			});
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

const handleScroll = (event: Event) => {
	if (!(event.target instanceof HTMLElement)) return;
	const target = event.target;
	const { scrollTop, scrollHeight, clientHeight } = target;

	if (scrollHeight - scrollTop - clientHeight < 50) {
		if (currentParent.value?.hasMoreChildren) {
			emit('loadMore', currentParent.value.id);
		}
	}
};

const navigateToChildren = (item: CommandBarItem) => {
	currentParentId.value = item.id;
	selectedIndex.value = 0;
	inputValue.value = '';

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

	if (item.href) {
		window.location.href = item.href;
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
		<Transition name="command-bar" appear>
			<div v-if="isOpen" ref="commandBarRef" :class="$style.commandBar">
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
				<div
					v-if="flattenedItems.length > 0"
					ref="itemsListRef"
					:class="$style.itemsList"
					@scroll="handleScroll"
				>
					<template v-for="item in groupedItems.ungrouped" :key="item.id">
						<N8nCommandBarItem
							:item="item"
							:is-selected="getGlobalIndex(item) === selectedIndex"
							@select="selectItem"
						/>
					</template>

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
				<div v-else-if="inputValue && flattenedItems.length === 0" :class="$style.noResults">
					No results found
				</div>
			</div>
		</Transition>
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
	border-radius: var(--radius--lg);
	box-shadow: var(--shadow--dark);
	width: 100%;
	max-width: 600px;
	z-index: 1000;
}

.input {
	width: 100%;
	border: none;
	outline: none;
	background: transparent;
	font-size: var(--font-size--md);
	font-family: var(--font-family);
	color: var(--color--text);
	padding: var(--spacing--md) var(--spacing--lg);
	border-bottom: var(--border);

	&::placeholder {
		color: var(--color--text--tint-1);
	}
}

.itemsList {
	max-height: 300px;
	overflow-y: auto;
	padding-bottom: var(--spacing--sm);
}

.sectionHeader {
	padding: var(--spacing--xs) var(--spacing--lg);
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
	padding: var(--spacing--xs) var(--spacing--lg) 0;
}
</style>

<style lang="scss">
/* Global transition classes for command bar animations */
.command-bar-enter-active {
	transition:
		opacity 0.2s ease-out,
		transform 0.2s ease-out;
}

.command-bar-leave-active {
	transition:
		opacity 0.15s ease-in,
		transform 0.15s ease-in;
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
