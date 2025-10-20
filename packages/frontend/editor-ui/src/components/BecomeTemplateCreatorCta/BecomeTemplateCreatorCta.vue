<script setup lang="ts">
import { useTelemetry } from '@/composables/useTelemetry';
import { useBecomeTemplateCreatorStore } from './becomeTemplateCreatorStore';
import { useI18n } from '@n8n/i18n';

import { N8nButton, N8nIcon } from '@n8n/design-system';
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
				<N8nIcon icon="x" size="xsmall" :title="i18n.baseText('generic.close')" />
			</button>
		</div>

		<N8nButton
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
	background-color: var(--color--background--light-2);
	border: var(--border);
	border-right: 0;
}

.textAndCloseButton {
	display: flex;
	margin-top: var(--spacing--xs);
	margin-left: var(--spacing--sm);
	margin-right: var(--spacing--2xs);
}

.text {
	flex: 1;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--sm);
}

.closeButton {
	flex: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	height: var(--spacing--2xs);
	border: none;
	color: var(--color--text--tint-1);
	background-color: transparent;
	cursor: pointer;
}

.becomeCreatorButton {
	margin: var(--spacing--sm);
}
</style>
