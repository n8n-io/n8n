<script setup lang="ts">
import { onBeforeUnmount, ref, useId, useTemplateRef, watch } from 'vue';
import { N8nButton, N8nInput, N8nPopover, N8nRecycleScroller, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { AgentHitlOption, AgentHitlOptionsPage } from '@n8n/api-types';

const props = defineProps<{
	modelValue?: AgentHitlOption;
	label: string;
	load: (query: string, cursor?: string) => Promise<AgentHitlOptionsPage>;
}>();
const emit = defineEmits<{ 'update:modelValue': [option: AgentHitlOption] }>();
const i18n = useI18n();
const open = ref(false);
const query = ref('');
const options = ref<AgentHitlOption[]>([]);
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
	try {
		const page = await props.load(query.value, append ? cursor.value : undefined);
		if (disposed || version !== generation) return;
		options.value = [
			...new Map(
				[...(append ? options.value : []), ...page.options].map((option) => [option.id, option]),
			).values(),
		];
		cursor.value = page.nextCursor;
	} catch {
		if (!disposed && version === generation) error.value = true;
	} finally {
		if (!disposed && version === generation) loading.value = false;
	}
}
watch(open, (value) => {
	if (value) void loadPage();
});
watch(query, () => {
	++generation;
	options.value = [];
	cursor.value = undefined;
	activeIndex.value = -1;
	clearTimeout(timer);
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
			<N8nButton
				type="secondary"
				:class="$style.trigger"
				:label="modelValue?.name ?? label"
				:aria-label="label"
				icon="chevron-down"
				data-testid="agent-hitl-destination-picker"
			/>
		</template>
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
					ref="scroller"
					:items="options"
					item-key="id"
					:item-size="40"
					:class="$style.list"
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
							{{ item.name }}
						</button>
					</template>
				</N8nRecycleScroller>
				<N8nText v-else-if="!loading && !error" color="text-light">{{
					i18n.baseText('agents.hitl.noDestinations')
				}}</N8nText>
			</div>
			<N8nText v-if="error" color="danger">{{
				i18n.baseText('agents.hitl.destinationLoadFailed')
			}}</N8nText>
			<N8nButton
				v-if="cursor || error || loading"
				type="tertiary"
				:loading="loading"
				:label="i18n.baseText(error ? 'generic.retry' : 'agents.hitl.loadMore')"
				@click="loadPage(!error)"
			/>
		</div>
	</N8nPopover>
</template>

<style module lang="scss">
.popover {
	width: min(calc(var(--spacing--2xl) * 8), calc(100vw - var(--spacing--xl)));
}
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
.trigger {
	width: 100%;
	justify-content: space-between;
}
.list {
	height: calc(var(--height--xl) * 6);
	overflow-y: scroll;
}
.option {
	display: block;
	width: 100%;
	text-align: left;
	height: var(--height--xl);
	border: 0;
	background: transparent;
	color: var(--text-color);
	padding: var(--spacing--xs);
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
