<script setup lang="ts">
import { useBecomeTemplateCreatorStore } from './becomeTemplateCreatorStore';
import { useI18n } from '@/composables/useI18n';

const i18n = useI18n();
const store = useBecomeTemplateCreatorStore();
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
				<n8n-icon icon="times" size="xsmall" :title="i18n.baseText('generic.close')" />
			</button>
		</div>

		<a :class="$style.becomeButtonLink" href="https://creators.n8n.io/hub" target="_blank">
			<n8n-button
				:label="i18n.baseText('becomeCreator.buttonText')"
				size="xmini"
				type="secondary"
			/>
		</a>
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
	width: var(--spacing-2xs);
	height: var(--spacing-2xs);
	border: none;
	color: #909398;
	background-color: transparent;
}

.becomeButtonLink {
	display: flex;
	flex-direction: column;
	margin: var(--spacing-s);
}
</style>
