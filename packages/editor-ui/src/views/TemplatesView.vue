<template>
	<div :class="$style.template">
		<div :class="$style.container">
			<div :class="$style.header">
				<div :class="$style.goBack" v-if="goBackEnabled">
					<GoBackButton />
				</div>
				<slot name="header"></slot>
			</div>
			<div>
				<slot name="content"></slot>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import GoBackButton from '@/components/GoBackButton.vue';

export default Vue.extend({
	name: 'TemplatesView',
	components: {
		GoBackButton,
	},
	props: {
		goBackEnabled: {
			type: Boolean,
			default: false,
		},
	},
});
</script>

<style lang="scss" module>
.template {
	display: flex;
	padding: var(--spacing-3xl) var(--spacing-xl) var(--spacing-4xl) var(--spacing-xl);
}

.container {
	width: 100%;
	max-width: 1024px;
	margin: 0 auto;

	@media (max-width: $breakpoint-md) {
		width: 900px;
	}
}

.header {
	display: flex;
	flex-direction: column;
	margin-bottom: var(--spacing-2xl);
}

.goBack {
	margin-bottom: var(--spacing-2xs);
}
</style>
