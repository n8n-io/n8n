<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useId, useTemplateRef, watch } from 'vue';
import {
	N8nButton,
	N8nIcon,
	N8nInput,
	N8nPopover,
	N8nRecycleScroller,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentHitlOption, AgentHitlOptionsPage } from '@n8n/api-types';

const props = defineProps<{
	modelValue?: AgentHitlOption;
	label: string;
	icon: 'hash' | 'user' | 'server';
	load: (query: string, cursor?: string) => Promise<AgentHitlOptionsPage>;
}>();
const emit = defineEmits<{ 'update:modelValue': [option: AgentHitlOption] }>();
const i18n = useI18n();
const open = ref(false);
const query = ref('');
const options = ref<AgentHitlOption[]>([]);
const visibleRowCount = computed(() => Math.min(options.value.length, 6));
const cursor = ref<string>();
const loading = ref(false);
const error = ref(false);
const activeIndex = ref(-1);
const listId = useId();
const scroller = useTemplateRef('scroller');
let generation = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let disposed = false;

async function loadPage(append = false) {
	const version = ++generation;
	loading.value = true;
	error.value = false;
	if (!append) {
		options.value = [];
		cursor.value = undefined;
		activeIndex.value = -1;
	}
	let nextCursor = append ? cursor.value : undefined;
	try {
		const search = query.value;
		const visited = new Set<string | undefined>();
		let page: AgentHitlOptionsPage;
		do {
			visited.add(nextCursor);
			page = await props.load(search, nextCursor);
			if (disposed || version !== generation) return;
			nextCursor = page.nextCursor && !visited.has(page.nextCursor) ? page.nextCursor : undefined;
		} while (!page.options.length && nextCursor);
		options.value = [
			...new Map(
				[...(append ? options.value : []), ...page.options].map((option) => [option.id, option]),
			).values(),
		];
		cursor.value = nextCursor;
	} catch {
		if (!disposed && version === generation) {
			cursor.value = nextCursor;
			error.value = true;
		}
	} finally {
		if (!disposed && version === generation) loading.value = false;
	}
}
watch(open, (value) => {
	clearTimeout(timer);
	if (value) void loadPage();
	else {
		++generation;
		loading.value = false;
	}
});
watch(query, () => {
	++generation;
	options.value = [];
	cursor.value = undefined;
	activeIndex.value = -1;
	clearTimeout(timer);
	if (!open.value) return;
	loading.value = true;
	error.value = false;
	timer = setTimeout(() => {
		void loadPage();
	}, 250);
});
onBeforeUnmount(() => {
	disposed = true;
	++generation;
	clearTimeout(timer);
});
function select(option: AgentHitlOption) {
	emit('update:modelValue', option);
	open.value = false;
}
function move(event: KeyboardEvent) {
	if (event.key === 'Enter' && activeIndex.value >= 0) {
		const option = options.value[activeIndex.value];
		if (option) {
			event.preventDefault();
			select(option);
		}
	} else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
		event.preventDefault();
		const direction = event.key === 'ArrowDown' ? 1 : -1;
		activeIndex.value = Math.max(
			0,
			Math.min(options.value.length - 1, activeIndex.value + direction),
		);
		const option = options.value[activeIndex.value];
		if (option) scroller.value?.scrollToKey(option.id);
	}
}
</script>

<template>
	<N8nPopover
		v-model:open="open"
		side="bottom"
		align="start"
		:teleported="false"
		:enable-scrolling="false"
		:content-class="$style.popover"
	>
		<template #trigger>
			<button
				type="button"
				:class="$style.trigger"
				:aria-label="label"
				data-testid="agent-hitl-destination-picker"
			>
				<N8nIcon :icon="icon" :size="16" />
				<span :class="[$style.value, !modelValue && $style.placeholder]">{{
					modelValue?.name ?? label
				}}</span>
				<N8nIcon icon="chevron-down" :size="16" color="text-light" />
			</button>
		</template>
		<template #content>
			<div :class="$style.content">
				<N8nInput
					v-model="query"
					@keydown="move"
					:placeholder="i18n.baseText('agents.hitl.searchDestinations')"
					:aria-label="i18n.baseText('agents.hitl.searchDestinations')"
					role="combobox"
					aria-expanded="true"
					:aria-controls="listId"
					:aria-activedescendant="
						activeIndex >= 0 ? `${listId}-${options[activeIndex]?.id}` : undefined
					"
				/>
				<div :id="listId" role="listbox" :aria-label="label" :aria-busy="loading">
					<N8nRecycleScroller
						v-if="options.length"
						:key="visibleRowCount"
						ref="scroller"
						:items="options"
						item-key="id"
						:item-size="40"
						:class="$style.list"
						:style="{ '--destination-count': visibleRowCount }"
					>
						<template #default="{ item }">
							<button
								:id="`${listId}-${item.id}`"
								type="button"
								role="option"
								tabindex="-1"
								:aria-selected="modelValue?.id === item.id"
								:class="[$style.option, options[activeIndex]?.id === item.id && $style.active]"
								@click="select(item)"
							>
								<N8nIcon :icon="icon" :size="16" />
								<span :class="$style.value">{{ item.name }}</span>
							</button>
						</template>
					</N8nRecycleScroller>
					<N8nText v-else-if="loading" role="status" color="text-light">{{
						i18n.baseText('generic.loadingEllipsis')
					}}</N8nText>
					<N8nText v-else-if="!error" color="text-light">{{
						i18n.baseText('agents.hitl.noDestinations')
					}}</N8nText>
				</div>
				<N8nText v-if="error" color="danger">{{
					i18n.baseText('agents.hitl.destinationLoadFailed')
				}}</N8nText>
				<N8nButton
					v-if="error || (cursor && options.length)"
					variant="ghost"
					:loading="loading"
					:label="i18n.baseText(error ? 'generic.retry' : 'agents.hitl.loadMore')"
					@click="loadPage(true)"
				/>
			</div>
		</template>
	</N8nPopover>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/input';
@use '@n8n/design-system/css/mixins/focus';

.popover {
	width: var(--reka-popover-trigger-width);
}
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs);
}
.trigger {
	@include input.theme-variables;
	@include input.size-variables('large');
	@include focus.focus-visible-ring;

	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	min-height: var(--input--height);
	padding: 0 var(--input--padding);
	border: var(--border-width) solid var(--input--border-color);
	border-radius: var(--input--radius);
	background: var(--input--color--background);
	color: var(--input--color--text);
	font-size: var(--input--font-size);
	text-align: left;
	cursor: pointer;

	&:hover {
		border-color: var(--input--border-color--hover);
	}

	&:focus-visible,
	&[data-state='open'] {
		border-color: var(--input--border-color--focus);
	}
}
.value {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.placeholder {
	color: var(--input--placeholder--color);
}
.list {
	height: calc(var(--height--xl) * var(--destination-count));
	flex: none;
	overflow-y: auto;
}
.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	text-align: left;
	height: var(--height--xl);
	border: 0;
	background: transparent;
	color: var(--text-color);
	padding: var(--spacing--xs);
	border-radius: var(--radius--xs);
	cursor: pointer;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.option:hover,
.option:focus-visible,
.active {
	background: var(--background--light-3);
}
</style>
