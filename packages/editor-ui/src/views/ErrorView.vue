<template>
	<div :class="$style.container">
		<font-awesome-icon icon="exclamation-triangle" :class="$style.icon" />
		<div :class="$style.message">
			<div>
				<n8n-heading size="2xlarge">
					{{ $locale.baseText(messageKey) }}
				</n8n-heading>
			</div>
			<div>
				<n8n-text v-if="errorCode" size="large">
					{{ errorCode }} {{ $locale.baseText('error') }}
				</n8n-text>
			</div>
		</div>
		<n8n-button :label="$locale.baseText(redirectTextKey)" @click="onButtonClick" />
	</div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { BaseTextKey } from '@/plugins/i18n';

const props = defineProps<{
	messageKey: BaseTextKey;
	errorCode?: number;
	redirectTextKey: BaseTextKey;
	redirectPage?: string;
}>();

const router = useRouter();

const onButtonClick = () => {
	if (props.redirectPage) {
		void router.push({ name: props.redirectPage });
	}
};
</script>

<style lang="scss" module>
.container {
	height: 100%;
	width: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-direction: column;
}

.icon {
	min-height: 96px;
	min-width: 108px;
	margin-bottom: var(--spacing-2xl);
	color: var(--color-foreground-base);
}

.message {
	margin-bottom: var(--spacing-l);

	* {
		margin-bottom: var(--spacing-2xs);
		display: flex;
		justify-content: center;
	}
}
</style>
