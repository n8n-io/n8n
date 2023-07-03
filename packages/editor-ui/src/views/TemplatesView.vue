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
import { defineComponent } from 'vue';
import GoBackButton from '@/components/GoBackButton.vue';

export default defineComponent({
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
	width: 100%;
	max-width: 1280px;
	padding: var(--spacing-l) var(--spacing-l) 0;
	justify-content: center;
	@media (min-width: 1200px) {
		padding: var(--spacing-2xl) var(--spacing-2xl) 0;
	}
}

.container {
	width: 100%;
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
