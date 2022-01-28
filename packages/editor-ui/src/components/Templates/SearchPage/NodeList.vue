<template>
	<div :class="$style.list">
		<div :class="$style.container" v-for="node in nodes.slice(0, 2)" :key="node.name">
			<img v-if="node.iconData.fileBuffer" :class="$style.image" :src="node.iconData.fileBuffer" />
			<FontAwesomeIcon v-else :icon="node.iconData.icon" :color="node.defaults.color" />
		</div>
		<div :class="$style.button" v-if="nodes.length > 2">+{{ nodes.length - 2 }}</div>
	</div>
</template>

<script lang="ts">
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

import mixins from 'vue-typed-mixins';

export default mixins(genericHelpers).extend({
	name: 'TemplateCard',
	props: {
		nodes: Array,
	},
	components: {
		FontAwesomeIcon,
	},
});
</script>

<style lang="scss" module>
.list {
	max-width: 100px;
	height: 20px;
	display: flex;
	flex-direction: row;
	justify-content: flex-end;
	align-items: center;

	.container {
		width: 16px;
		height: 16px;
		margin-left: var(--spacing-2xs);
		position: relative;
		display: block;

		.image {
			width: 16px;
			height: 16px;
			display: block;
		}
	}

	.button {
		width: 20px;
		height: 20px;
		margin-left: var(--spacing-2xs);
		top: 1px;
		position: relative;
		display: flex;
		justify-content: center;
		align-items: center;
		background: var(--color-background-light);
		border: $--version-card-border;
		border-radius: var(--border-radius-base);
		font-size: 10px;
		font-weight: var(--font-weight-bold);
		color: var(--color-text-base);
	}
}
</style>
