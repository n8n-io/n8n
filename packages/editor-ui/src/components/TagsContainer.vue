<template>
	<IntersectionObserver
		:threshold="1.0"
		@observed="onObserved"
		class="tags-container"
		:enabled="responsive"
	>
		<template>
			<span class="tags">
				<span
					v-for="tag in tags"
					:key="tag.id"
					:class="{ clickable: !tag.hidden }"
					@click="(e) => onClick(e, tag)"
				>
					<el-tag
						:title="tag.title"
						type="info"
						size="small"
						v-if="tag.isCount"
						class="count-container"
					>
						{{ tag.name }}
					</el-tag>
					<IntersectionObserved
						:class="{ hidden: tag.hidden }"
						:data-id="tag.id"
						:enabled="responsive"
						v-else
					>
						<el-tag :title="tag.name" type="info" size="small" :class="{ hoverable }">
							{{ tag.name }}
						</el-tag>
					</IntersectionObserved>
				</span>
			</span>
		</template>
	</IntersectionObserver>
</template>

<script lang="ts">
import Vue, { defineComponent } from 'vue';

import type { ITag } from '@/Interface';
import IntersectionObserver from './IntersectionObserver.vue';
import IntersectionObserved from './IntersectionObserved.vue';
import { mapStores } from 'pinia';
import { useTagsStore } from '@/stores/tags.store';

// random upper limit if none is set to minimize performance impact of observers
const DEFAULT_MAX_TAGS_LIMIT = 20;

interface TagEl extends ITag {
	hidden?: boolean;
	title?: string;
	isCount?: boolean;
}

export default defineComponent({
	components: { IntersectionObserver, IntersectionObserved },
	name: 'TagsContainer',
	props: ['tagIds', 'limit', 'clickable', 'responsive', 'hoverable'],
	data() {
		return {
			visibility: {} as { [id: string]: boolean },
		};
	},
	computed: {
		...mapStores(useTagsStore),
		tags() {
			const tags = this.tagIds
				.map((tagId: string) => this.tagsStore.getTagById(tagId))
				.filter(Boolean); // if tag has been deleted from store

			const limit = this.limit || DEFAULT_MAX_TAGS_LIMIT;

			let toDisplay: TagEl[] = limit ? tags.slice(0, limit) : tags;
			toDisplay = toDisplay.map((tag: ITag) => ({
				...tag,
				hidden: this.responsive && !this.$data.visibility[tag.id],
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
		onObserved({ el, isIntersecting }: { el: HTMLElement; isIntersecting: boolean }) {
			if (el.dataset.id) {
				Vue.set(this.$data.visibility, el.dataset.id, isIntersecting);
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
	display: inline-flex;
	overflow: hidden;
}

.tags {
	display: flex;

	> span {
		padding-right: 4px; // why not margin? for space between tags to be clickable
	}
}

.hidden {
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
