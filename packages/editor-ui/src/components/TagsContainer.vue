<template>
	<IntersectionObserver :threshold="1.0" @observed="onObserved" class="tags-container">
		<template v-slot="{ observer }">
			<div class="tags" v-if="observer">
					<IntersectionObserved
						v-for="tag in tags" 
						:key="tag.id"
						:observer="observer"
						:ignore="tag.isCount"
						:class="{'count-container': tag.isCount}"
						:style="!tag.isCount ? 'visibility: hidden' : ''"
					>
						<div @click="onClick" class="clickable">
							<el-tag 
								:title="tag.title || tag.name"
								type="info"
								size="small"
							>
								{{ tag.name }}
							</el-tag>
						</div>
					</IntersectionObserved>
				</div>
		</template>
	</IntersectionObserver>
</template>

<script lang="ts">
import Vue from 'vue';

import { ITag } from '@/Interface';
import IntersectionObserver from './IntersectionObserver.vue';
import IntersectionObserved from './IntersectionObserved.vue';

// random upper limit if none is set to minimize performance impact of observers
const DEFAULT_MAX_TAGS_LIMIT = 20;

export default Vue.extend({
	components: { IntersectionObserver, IntersectionObserved },
	name: 'TagsContainer',
	props: [
		"tagIds",
		"limit",
		"clickable",
	],
	data() {
		return {
			visibleCount: 0,
		};
	},
	computed: {
		tags() {
			const tags = this.$props.tagIds.map((tagId: string) => this.$store.getters['tags/getTagById'](tagId))
				.filter(Boolean); // todo update store

			const limit = this.$props.limit || DEFAULT_MAX_TAGS_LIMIT;
			const toDisplay = limit ? tags.slice(0, limit) : tags;

			if (this.visibleCount < tags.length) {
				const hidden = tags.slice(this.visibleCount);
				const hiddenTitle = hidden.reduce((accu: string, tag: ITag) => {
					return accu ? `${accu}, ${tag.name}` : tag.name;
				}, '');

				toDisplay.splice(this.visibleCount, 0, {
					id: 'count',
					name: `+${hidden.length}`,
					title: hiddenTitle,
					isCount: true,
				});
			}

			return toDisplay;
		},
	},
	methods: {
		onObserved({el, isIntersecting}: {el: HTMLElement, isIntersecting: boolean}) {
			const visibility = isIntersecting ? 'visible' : 'hidden';
			if (el.style.visibility === visibility) {
				return;
			}

			const style = `visibility: ${visibility}`;
			el.setAttribute('style', style);

			const count = this.$data.visibleCount;
			this.$data.visibleCount = isIntersecting ? count + 1 : count - 1;

			const rect = el.getBoundingClientRect();
			if (rect.right > this.$data.lastTagXPosition) {
				this.$data.lastTagXPosition = rect.right;
			}
		},
		onClick() {
			this.$emit('click');
		},
	},
});
</script>

<style lang="scss" scoped>
	.tags-container {
		display: inline-flex;
		flex-wrap: nowrap;
		overflow: hidden;
	}

	.tags {
		display: flex; 
	}

	.count-container {
		max-width: 0;
		position: relative;

		> div {
			position: absolute;

			> span {
				position: fixed;
				max-width: 40px;
				text-overflow: ellipsis;
				overflow: hidden;
			}
		}
	}

	.tags-container .el-tag {
		margin-right: 4px;
	}
</style>
