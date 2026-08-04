<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import type { ComponentInstance } from 'vue';
import type { ITag } from '@n8n/rest-api-client/api/tags';
import IntersectionObserver from '@/app/components/IntersectionObserver.vue';
import IntersectionObserved from '@/app/components/IntersectionObserved.vue';
import { createEventBus } from '@n8n/utils/event-bus';
import debounce from 'lodash/debounce';

import { N8nTag } from '@n8n/design-system';

interface TagsContainerProps {
	tagIds: readonly string[];
	tagsById: { [id: string]: ITag };
	limit?: number;
	clickable?: boolean;
	responsive?: boolean;
}

const props = withDefaults(defineProps<TagsContainerProps>(), {
	limit: 20,
	clickable: false,
	responsive: false,
});

const emit = defineEmits<{
	click: [tagId: string];
}>();

// Data
const maxWidth = ref(320);
const intersectionEventBus = createEventBus();
const visibility = ref<{ [id: string]: boolean }>({});
const tagsContainer = ref<ComponentInstance<typeof IntersectionObserver>>();

// Computed
const style = computed(() => ({
	'max-width': `${maxWidth.value}px`,
}));

const tags = computed(() => {
	const allTags = props.tagIds.map((tagId: string) => props.tagsById[tagId]).filter(Boolean);

	let toDisplay: Array<ITag & { hidden?: boolean; title?: string; isCount?: boolean }> = props.limit
		? allTags.slice(0, props.limit)
		: allTags;

	toDisplay = toDisplay.map((tag: ITag) => ({
		...tag,
		hidden: props.responsive && !visibility.value[tag.id],
	}));

	let visibleCount = toDisplay.length;
	if (props.responsive) {
		visibleCount = Object.values(visibility.value).reduce(
			(accu, val) => (val ? accu + 1 : accu),
			0,
		);
	}

	if (visibleCount < allTags.length) {
		const hidden = allTags.slice(visibleCount);
		const hiddenTitle = hidden.reduce(
			(accu: string, tag: ITag) => (accu ? `${accu}, ${tag.name}` : tag.name),
			'',
		);

		const countTag = {
			id: 'count',
			name: `+${hidden.length}`,
			title: hiddenTitle,
			isCount: true,
		};
		toDisplay.splice(visibleCount, 0, countTag);
	}

	return toDisplay;
});

// Methods
const setMaxWidth = () => {
	const container = (tagsContainer.value as { $el?: HTMLElement })?.$el;
	const parent = container?.parentNode as HTMLElement | null;

	if (parent) {
		maxWidth.value = 0;
		void nextTick(() => {
			maxWidth.value = parent.clientWidth;
		});
	}
};

const debouncedSetMaxWidth = debounce(setMaxWidth, 100);

const onObserved = ({ el, isIntersecting }: { el: HTMLElement; isIntersecting: boolean }) => {
	if (el.dataset.id) {
		visibility.value = { ...visibility.value, [el.dataset.id]: isIntersecting };
	}
};

const onClick = (e: MouseEvent, tag: ITag & { hidden?: boolean }) => {
	if (props.clickable) {
		e.stopPropagation();
	}

	if (!tag.hidden) {
		emit('click', tag.id);
	}
};

// Lifecycle hooks
onMounted(() => {
	setMaxWidth();
	window.addEventListener('resize', debouncedSetMaxWidth);
});

onBeforeUnmount(() => {
	window.removeEventListener('resize', debouncedSetMaxWidth);
});
</script>

<template>
	<IntersectionObserver
		ref="tagsContainer"
		:threshold="1.0"
		class="tags-container"
		:style="style"
		:enabled="responsive"
		:event-bus="intersectionEventBus"
		@observed="onObserved"
	>
		<span class="tags">
			<span
				v-for="tag in tags"
				:key="tag.id"
				:class="{ clickable: !tag.hidden }"
				@click="(e) => onClick(e, tag)"
			>
				<N8nTag
					v-if="tag.isCount"
					:title="tag.title"
					:text="tag.name"
					:clickable="false"
					class="count-container"
				/>
				<IntersectionObserved
					v-else
					:class="{ hideTag: tag.hidden }"
					:data-id="tag.id"
					:enabled="responsive"
					:event-bus="intersectionEventBus"
				>
					<N8nTag :title="tag.name" :text="tag.name" :clickable="clickable" />
				</IntersectionObserved>
			</span>
		</span>
	</IntersectionObserver>
</template>

<style lang="scss" scoped>
.tags-container {
	display: block;
	max-width: 300px;
}

.hideTag {
	visibility: hidden;
}

.tags {
	display: flex;
	gap: var(--spacing--4xs);
}

.count-container {
	position: absolute;
	max-width: 40px;
	text-overflow: ellipsis;
	overflow: hidden;
}
</style>
