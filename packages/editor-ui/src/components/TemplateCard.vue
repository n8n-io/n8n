<template>
		<div :class="$style.templateCard" @mouseover="hover = true" @mouseleave="hover = false">
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
</template>

<script lang="ts">

import mixins from 'vue-typed-mixins';
import { genericHelpers } from '@/components/mixins/genericHelpers';

export default mixins(
	genericHelpers,
).extend({
	name: 'TemplateCard',
	props: {
		title: String,
	},
	data() {
		return {
			hover: false,
		};
	},
	computed: {
		shortTitle() {
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

		.rightSlot {
			top: 10px;
		}
	}
	.cardFooter {
		bottom: 16px;
		width: 100%;
		right: 24px;
	}
}

</style>
