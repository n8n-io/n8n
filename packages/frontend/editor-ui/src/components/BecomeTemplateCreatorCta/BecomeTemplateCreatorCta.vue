<script setup lang="ts">
import { useTelemetry } from '@/composables/useTelemetry';
import { useBecomeTemplateCreatorStore } from './becomeTemplateCreatorStore';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
const store = useBecomeTemplateCreatorStore();
const telemetry = useTelemetry();

const onClick = () => {
	telemetry.track('User clicked become creator CTA');
};
</script>

<template>
	<div
		v-if="store.showBecomeCreatorCta"
		:class="$style.container"
		data-test-id="become-template-creator-cta"
	>
		<div :class="$style.textAndCloseButton">
			<p :class="$style.text">
				{{ i18n.baseText('becomeCreator.text') }}
			</p>

			<button
				:class="$style.closeButton"
				data-test-id="close-become-template-creator-cta"
				@click="store.dismissCta()"
			>
				<n8n-icon icon="x" size="xsmall" :title="i18n.baseText('generic.close')" />
			</button>
		</div>

		<n8n-button
			:class="$style.becomeCreatorButton"
			:label="i18n.baseText('becomeCreator.buttonText')"
			size="xmini"
			type="secondary"
			element="a"
			href="https://creators.n8n.io/hub"
			target="_blank"
			@click="onClick"
		/>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	background-color: var(--color-background-light);
	border: var(--border-base);
	border-right: 0;
}

.textAndCloseButton {
	display: flex;
	margin-top: var(--spacing-xs);
	margin-left: var(--spacing-s);
	margin-right: var(--spacing-2xs);
}

.text {
	flex: 1;
	font-size: var(--font-size-3xs);
	line-height: var(--font-line-height-compact);
}

.closeButton {
	flex: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	height: var(--spacing-2xs);
	border: none;
	color: var(--color-text-light);
	background-color: transparent;
	cursor: pointer;
}

.becomeCreatorButton {
	margin: var(--spacing-s);
}
</style>
