<script lang="ts" setup>
import { FocusScope } from 'reka-ui';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import N8nCommandBarItem from './CommandBarItem.vue';
import type { CommandBarIcon, CommandBarItem } from './types';
import N8nIcon from '../N8nIcon';
import N8nLoading from '../N8nLoading/Loading.vue';
import N8nScrollArea from '../N8nScrollArea/N8nScrollArea.vue';
import N8nSpinner from '../N8nSpinner';
import N8nText from '../N8nText';

interface CommandBarProps {
	placeholder?: string;
	context?: string;
	/** Optional icon shown inside the context chip (e.g. project icon). */
	contextIcon?: CommandBarIcon;
	/** Accessible label for the context dismiss control. */
	contextClearLabel?: string;
	items: CommandBarItem[];
	isLoading?: boolean;
	zIndex?: number;
}

defineOptions({ name: 'N8nCommandBar' });
const props = withDefaults(defineProps<CommandBarProps>(), {
	placeholder: 'Type a command...',
	context: '',
	contextIcon: undefined,
	contextClearLabel: 'Clear context',
	isLoading: false,
	zIndex: 1900,
});

const emit = defineEmits<{
	inputChange: [value: string];
	navigateTo: [parentId: string | null];
	clearContext: [];
}>();

const NUM_LOADING_ITEMS_FULL = 8;
const NUM_LOADING_ITEMS_PARTIAL = 3;

const isOpen = defineModel<boolean>('open', { default: false });
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

			if (item.matchAnySearchTerm) {
				return query
					.split(' ')
					.filter(Boolean)
					.some((word) => searchText.includes(word));
			}

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
		sections: Object.entries(sections).map(([title, sectionItems]) => {
			const subsections = new Map<string | null, CommandBarItem[]>();
			for (const item of sectionItems) {
				const key = item.subsection ?? null;
				const bucket = subsections.get(key) ?? [];
				bucket.push(item);
				subsections.set(key, bucket);
			}

			return {
				title,
				icon: sectionItems.find((item) => item.sectionIcon)?.sectionIcon,
				subsections: [...subsections.entries()].map(([subsectionTitle, items]) => ({
					title: subsectionTitle,
					icon: items.find((item) => item.subsectionIcon)?.subsectionIcon,
					items,
				})),
			};
		}),
	};
});

const flattenedItems = computed(() => {
	const result: CommandBarItem[] = [];

	result.push(...groupedItems.value.ungrouped);

	groupedItems.value.sections.forEach((section) => {
		section.subsections.forEach((subsection) => {
			result.push(...subsection.items);
		});
	});

	return result;
});

const numLoadingItems = computed(() => {
	return flattenedItems.value.length > 0 ? NUM_LOADING_ITEMS_PARTIAL : NUM_LOADING_ITEMS_FULL;
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

	event.stopPropagation();

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

const clearContext = () => {
	emit('clearContext');
	// Keep focus in the input so removing the badge doesn't dismiss the bar
	// (click-outside treats a detached button target as outside).
	void nextTick(() => {
		inputRef.value?.focus();
	});
};

watch(inputValue, (newValue) => {
	emit('inputChange', newValue);
	selectedIndex.value = 0;
});

onMounted(() => {
	document.addEventListener('keydown', handleKeydown, { capture: true });
	document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
	document.removeEventListener('keydown', handleKeydown, { capture: true });
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
						<span :class="$style.contextChip">
							<span
								v-if="contextIcon && 'html' in contextIcon"
								v-n8n-html="contextIcon.html"
								:class="$style.contextIcon"
							></span>
							<component
								:is="contextIcon.component"
								v-else-if="contextIcon && 'component' in contextIcon"
								v-bind="contextIcon.props"
								:class="$style.contextIcon"
							/>
							<N8nText size="small" :compact="true">{{ context }}</N8nText>
							<button
								type="button"
								:class="$style.contextClear"
								:aria-label="contextClearLabel"
								data-test-id="command-bar-clear-context"
								@mousedown.stop.prevent
								@click.stop="clearContext"
							>
								<N8nIcon icon="x" size="xsmall" />
							</button>
						</span>
					</div>
					<div :class="$style.inputWrapper">
						<input
							ref="inputRef"
							v-model="inputValue"
							:placeholder="currentPlaceholder"
							:class="$style.input"
							type="text"
						/>
						<div
							v-if="isLoading"
							:class="$style.inputSpinner"
							data-test-id="command-bar-input-spinner"
							aria-hidden="true"
						>
							<N8nSpinner size="medium" />
						</div>
					</div>
					<N8nScrollArea
						v-if="flattenedItems.length > 0 || isLoading"
						ref="scrollAreaRef"
						max-height="350px"
						:class="$style.scrollArea"
						data-test-id="command-bar-items-list"
					>
						<div :class="$style.itemsList">
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
								<div :class="$style.sectionHeader">
									<span
										v-if="section.icon && 'html' in section.icon"
										v-n8n-html="section.icon.html"
										:class="$style.sectionIcon"
									></span>
									<component
										:is="section.icon.component"
										v-else-if="section.icon && 'component' in section.icon"
										v-bind="section.icon.props"
										:class="$style.sectionIcon"
									/>
									{{ section.title }}
								</div>
								<div
									v-for="(subsection, subsectionIndex) in section.subsections"
									:key="subsection.title ?? `section-${subsectionIndex}`"
									:class="[$style.subsection, { [$style.nested]: !!subsection.title }]"
								>
									<div v-if="subsection.title" :class="$style.subsectionHeader">
										<span
											v-if="subsection.icon && 'html' in subsection.icon"
											v-n8n-html="subsection.icon.html"
											:class="$style.sectionIcon"
										></span>
										<component
											:is="subsection.icon.component"
											v-else-if="subsection.icon && 'component' in subsection.icon"
											v-bind="subsection.icon.props"
											:class="$style.sectionIcon"
										/>
										{{ subsection.title }}
									</div>
									<div v-for="item in subsection.items" :key="item.id">
										<N8nCommandBarItem
											:item="item"
											:is-selected="getGlobalIndex(item) === selectedIndex"
											@select="selectItem"
										/>
									</div>
								</div>
							</template>

							<div
								v-if="isLoading"
								:class="[$style.loadingSection, { [$style.hasItems]: flattenedItems.length > 0 }]"
							>
								<div v-for="i in numLoadingItems" :key="i" :class="$style.loadingItem">
									<N8nLoading variant="custom" :class="$style.loading" />
								</div>
							</div>
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

.inputWrapper {
	position: relative;
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
	padding-right: var(--spacing--xl);
	border-bottom: var(--border);

	&::placeholder {
		color: var(--color--text--tint-1);
	}
}

.inputSpinner {
	position: absolute;
	top: 0;
	right: var(--spacing--sm);
	height: 100%;
	display: flex;
	align-items: center;
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
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs) var(--spacing--2xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	color: var(--color--text--tint-1);
}

.subsection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);

	&.nested {
		margin-left: var(--spacing--xs);
		padding-left: var(--spacing--xs);
		border-left: var(--border-width) var(--border-style) var(--color--foreground);
	}

	& + &.nested {
		margin-top: var(--spacing--3xs);
	}
}

.subsectionHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--5xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--tint-1);
}

.sectionIcon {
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
}

.noResults {
	padding: var(--spacing--lg);
	text-align: center;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--sm);
}

.contextContainer {
	display: flex;
	align-items: center;
	padding: var(--spacing--xs) var(--spacing--xs) 0;
}

.contextChip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--5xs) var(--spacing--4xs) var(--spacing--5xs) var(--spacing--3xs);
	border: var(--border);
	border-radius: var(--radius);
	border-color: var(--color--text--tint-1);
	color: var(--color--text--tint-1);
	white-space: nowrap;
}

.contextIcon {
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
}

.contextClear {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	margin: calc(-1 * var(--spacing--5xs)) calc(-1 * var(--spacing--5xs))
		calc(-1 * var(--spacing--5xs)) 0;
	padding: var(--spacing--5xs);
	border: none;
	background: transparent;
	color: inherit;
	cursor: pointer;
	border-radius: var(--radius);

	&:hover {
		color: var(--color--text);
		background-color: var(--command-bar-item--color--background--hover);
	}
}

.loadingSection {
	padding-top: var(--spacing--2xs);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);

	&.hasItems {
		padding-top: 0;
	}
}

.loadingItem {
	height: var(--command-bar-item--height);
	display: flex;
	align-items: center;
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
