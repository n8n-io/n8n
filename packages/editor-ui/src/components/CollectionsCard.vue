<template>
		<div :class="$style.collectionCard">
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
	name: 'CollectionsCard',
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

.collectionCard {
	width: 240px;
	height: 140px;
	border-radius: var(--border-radius-large);
	border: 1px solid #DBDFE7;
	margin-right: 8px;
	background-color: #FFFFFF;
	padding: 16px;

	.cardFooter {
		width: 212px;
		position: absolute;
		bottom: 16px;
		display: flex;
		justify-content: space-between;
	}
}

</style>
