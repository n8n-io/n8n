<script lang="ts" setup>
import GoBackButton from '@/app/components/GoBackButton.vue';

interface Props {
	goBackEnabled?: boolean;
	fullWidth?: boolean;
}

withDefaults(defineProps<Props>(), {
	goBackEnabled: false,
	fullWidth: false,
});
</script>

<template>
	<div :class="[$style.template, { [$style.fullWidth]: fullWidth }]">
		<div :class="$style.container">
			<div :class="$style.header" v-if="goBackEnabled">
				<div :class="$style.goBack">
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

<style lang="scss" module>
.template {
	display: flex;
	width: 100%;
	max-width: var(--content-container--width);
	padding: var(--spacing--lg) var(--spacing--lg) 0;
	justify-content: center;
	@media (min-width: 1200px) {
		padding: var(--spacing--2xl) var(--spacing--2xl) 0;
	}

	&.fullWidth {
		max-width: none;
		padding: 0;
	}
}

.container {
	width: 100%;
}

.header {
	display: flex;
	flex-direction: column;
	margin-bottom: var(--spacing--2xl);
}

.goBack {
	margin-bottom: var(--spacing--2xs);
}
</style>
