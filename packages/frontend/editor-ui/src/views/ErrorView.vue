<script setup lang="ts">
import type { BaseTextKey } from '@n8n/i18n';
import { useRouter } from 'vue-router';
import { VIEWS } from '@/constants';
import { useI18n } from '@n8n/i18n';
const router = useRouter();

const props = defineProps<{
	messageKey: BaseTextKey;
	errorCode: number;
	redirectTextKey: BaseTextKey;
	redirectPage?: keyof typeof VIEWS;
}>();

const i18n = useI18n();

function onButtonClick() {
	void router.push({ name: props.redirectPage ?? VIEWS.HOMEPAGE });
}
</script>

<template>
	<div :class="$style.container">
		<n8n-icon icon="triangle-alert" :class="$style.icon" />
		<div :class="$style.message">
			<div>
				<n8n-heading size="2xlarge">
					{{ i18n.baseText(messageKey) }}
				</n8n-heading>
			</div>
			<div>
				<n8n-text v-if="errorCode" size="large">
					{{ errorCode }} {{ i18n.baseText('error') }}
				</n8n-text>
			</div>
		</div>
		<n8n-button :label="i18n.baseText(redirectTextKey)" @click="onButtonClick" />
	</div>
</template>

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
