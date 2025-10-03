<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import type { ComponentInstance } from 'vue';
import type { ITag } from '@n8n/rest-api-client/api/tags';
import IntersectionObserver from './IntersectionObserver.vue';
import IntersectionObserved from './IntersectionObserved.vue';
import { createEventBus } from '@n8n/utils/event-bus';
import debounce from 'lodash/debounce';

import { ElTag } from 'element-plus';
interface TagsContainerProps {
	tagIds: string[];
	tagsById: { [id: string]: ITag };
	limit?: number;
	clickable?: boolean;
	responsive?: boolean;
	hoverable?: boolean;
}

const props = withDefaults(defineProps<TagsContainerProps>(), {
	limit: 20,
	clickable: false,
	responsive: false,
	hoverable: false,
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
	const container = tagsContainer.value?.$el as HTMLElement;
	const parent = container?.parentNode as HTMLElement;

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
				<ElTag
					v-if="tag.isCount"
					:title="tag.title"
					type="info"
					size="small"
					class="count-container"
					:disable-transitions="true"
				>
					{{ tag.name }}
				</ElTag>
				<IntersectionObserved
					v-else
					:class="{ hideTag: tag.hidden }"
					:data-id="tag.id"
					:enabled="responsive"
					:event-bus="intersectionEventBus"
				>
					<ElTag
						:title="tag.name"
						type="info"
						size="small"
						:class="{ hoverable }"
						:disable-transitions="true"
					>
						{{ tag.name }}
					</ElTag>
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

.tags {
	display: block;
	white-space: nowrap;
	overflow: hidden;
	max-width: 100%;

	> span {
		padding-right: 4px; // why not margin? for space between tags to be clickable
	}
}

.hideTag {
	visibility: hidden;
}

.el-tag.hoverable:hover {
	border-color: $color-primary;
}

.count-container {
	position: absolute;
	max-width: 40px;
	text-overflow: ellipsis;
	overflow: hidden;
}
</style>
