<template>
		<div :class="$style.templateCard">
			<n8n-heading :bold="true" size="medium">{{title}}</n8n-heading>
			<footer :class="$style.cardFooter">
				<slot name="footer"></slot>
			</footer>
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
	components: {
	},
	methods: {
	},
});
</script>

<style lang="scss" module>

.templateCard {
	width: 100%;
	min-height: 60px;
	height: auto;
	border-bottom: 1px solid #DBDFE7;
	margin-right: 8px;
	padding: 16px;

	.cardFooter {
		bottom: 16px;
		width: 100%;
		display: flex;
		justify-content: space-between;
		right: 24px;
	}
}

</style>
