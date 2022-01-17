<template>
		<div >
			<div v-if="loading" :class="$style.templateCardLoading">
				<el-skeleton :loading="loading" animated>
					<template slot="template">
						<div :class="$style.cardBodyLoading">
							<el-skeleton-item variant="p" />

							<footer :class="$style.cardFooterLoading">
								<el-skeleton-item variant="text" style="width: 25%;" />
							</footer>
						</div>
						<aside :class="$style.rightSlot">
							<el-skeleton-item variant="text" />
						</aside>
					</template>
				</el-skeleton>

			</div>

			<div v-else :class="$style.templateCard" @mouseover="hover = true" @mouseleave="hover = false">
				<div :class="$style.cardBody">
					<n8n-heading :bold="true" size="medium">{{shortTitle}}</n8n-heading>
					<footer :class="$style.cardFooter">
						<slot name="footer"></slot>
					</footer>
				</div>
				<aside :class="$style.rightSlot">
					<slot v-if="!hover" name="right"></slot>
					<slot v-if="hover" name="rightHover"></slot>
				</aside>
			</div>
		</div>

</template>

<script lang="ts">

import mixins from 'vue-typed-mixins';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import ElSkeletonItem from 'element-ui/lib/skeleton-item';
import ElSkeleton from 'element-ui/lib/skeleton';

export default mixins(
	genericHelpers,
).extend({
	name: 'TemplateCard',
	components: {
		ElSkeleton,
		ElSkeletonItem,
	},
	props: {
		title: String,
		loading: Boolean,
	},
	data() {
		return {
			hover: false,
		};
	},
	computed: {
		shortTitle(): string {
			// todo decide the length
			if (this.title.length > 70) {
				return this.title.slice(0, 67) + '...';
			}
			return this.title;
		},
	},
});
</script>

<style lang="scss" module>

.templateCard {
	width: 100%;
	height: 68px;
	height: auto;
	border-bottom: 1px solid #DBDFE7;
	margin-right: 8px;
	padding: 16px;
	display: flex;
	justify-content: space-between;


	.cardBody {
		display: flex;
		flex-direction: column;
		justify-content: space-around;

		.cardFooter {
			bottom: 16px;
			width: 100%;
			right: 24px;
		}
	}

	.rightSlot {
		top: 10px;
	}

}

.templateCardLoading {
	width: 100%;
	min-height: 68px;
	border-bottom: 1px solid #DBDFE7;
	margin-right: 8px;
	padding: 16px;

	> div > div {
			display: flex;
			justify-content: space-between;

		.cardBodyLoading {
			width: 800px;
			display: flex;
			flex-direction: column;
			justify-content: space-around;

			.cardFooterLoading {
				margin-top: 10px;
				width: 100%;
				right: 24px;
			}
		}

		.rightSlot {
			top: 10px;
			width: 100px;
		}
	}


}

</style>
