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
				<el-tag
					v-if="tag.isCount"
					:title="tag.title"
					type="info"
					size="small"
					class="count-container"
					:disable-transitions="true"
				>
					{{ tag.name }}
				</el-tag>
				<IntersectionObserved
					v-else
					:class="{ hideTag: tag.hidden }"
					:data-id="tag.id"
					:enabled="responsive"
					:event-bus="intersectionEventBus"
				>
					<el-tag
						:title="tag.name"
						type="info"
						size="small"
						:class="{ hoverable }"
						:disable-transitions="true"
					>
						{{ tag.name }}
					</el-tag>
				</IntersectionObserved>
			</span>
		</span>
	</IntersectionObserver>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import type { ITag } from '@/Interface';
import IntersectionObserver from './IntersectionObserver.vue';
import IntersectionObserved from './IntersectionObserved.vue';
import { mapStores } from 'pinia';
import { useTagsStore } from '@/stores/tags.store';
import { createEventBus } from 'n8n-design-system/utils';
import { debounce } from 'lodash-es';

// random upper limit if none is set to minimize performance impact of observers
const DEFAULT_MAX_TAGS_LIMIT = 20;

interface TagEl extends ITag {
	hidden?: boolean;
	title?: string;
	isCount?: boolean;
}

export default defineComponent({
	name: 'TagsContainer',
	components: { IntersectionObserver, IntersectionObserved },
	props: ['tagIds', 'limit', 'clickable', 'responsive', 'hoverable'],
	data() {
		return {
			maxWidth: 320,
			intersectionEventBus: createEventBus(),
			visibility: {} as { [id: string]: boolean },
			debouncedSetMaxWidth: () => {},
		};
	},
	created() {
		this.debouncedSetMaxWidth = debounce(this.setMaxWidth, 100);
	},
	mounted() {
		this.setMaxWidth();
		window.addEventListener('resize', this.debouncedSetMaxWidth);
	},
	beforeUnmount() {
		window.removeEventListener('resize', this.debouncedSetMaxWidth);
	},
	computed: {
		...mapStores(useTagsStore),
		style() {
			return {
				'max-width': `${this.maxWidth}px`,
			};
		},
		tags() {
			const tags = this.tagIds
				.map((tagId: string) => this.tagsStore.getTagById(tagId))
				.filter(Boolean); // if tag has been deleted from store

			const limit = this.limit || DEFAULT_MAX_TAGS_LIMIT;

			let toDisplay: TagEl[] = limit ? tags.slice(0, limit) : tags;
			toDisplay = toDisplay.map((tag: ITag) => ({
				...tag,
				hidden: this.responsive && !this.visibility[tag.id],
			}));

			let visibleCount = toDisplay.length;
			if (this.responsive) {
				visibleCount = Object.values(this.visibility).reduce(
					(accu, val) => (val ? accu + 1 : accu),
					0,
				);
			}

			if (visibleCount < tags.length) {
				const hidden = tags.slice(visibleCount);
				const hiddenTitle = hidden.reduce((accu: string, tag: ITag) => {
					return accu ? `${accu}, ${tag.name}` : tag.name;
				}, '');

				const countTag: TagEl = {
					id: 'count',
					name: `+${hidden.length}`,
					title: hiddenTitle,
					isCount: true,
				};
				toDisplay.splice(visibleCount, 0, countTag);
			}

			return toDisplay;
		},
	},
	methods: {
		setMaxWidth() {
			const container = this.$refs.tagsContainer.$el as HTMLElement;
			const parent = container.parentNode as HTMLElement;

			if (parent) {
				this.maxWidth = 0;
				void this.$nextTick(() => {
					this.maxWidth = parent.clientWidth;
				});
			}
		},
		onObserved({ el, isIntersecting }: { el: HTMLElement; isIntersecting: boolean }) {
			if (el.dataset.id) {
				this.visibility = { ...this.visibility, [el.dataset.id]: isIntersecting };
			}
		},
		onClick(e: MouseEvent, tag: TagEl) {
			if (this.clickable) {
				e.stopPropagation();
			}

			// if tag is hidden or not displayed
			if (!tag.hidden) {
				this.$emit('click', tag.id);
			}
		},
	},
});
</script>

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
