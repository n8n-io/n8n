<script lang="ts" setup>
import { ref, watch } from 'vue';
import { N8nButton, N8nHeading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import Modal from '@/app/components/Modal.vue';
import { useInstanceAiSettingsStore } from '../../instanceAiSettings.store';
import ComputerUseSetupContent from './ComputerUseSetupContent.vue';

import { CHROME_EXTENSION_URL } from './constants';

const props = defineProps<{ modalName: string }>();

const i18n = useI18n();
const store = useInstanceAiSettingsStore();

type Step = 'gateway' | 'extension';

const step = ref<Step>(store.isGatewayConnected ? 'extension' : 'gateway');

// Advance from gateway step once the daemon connects.
watch(
	() => store.isGatewayConnected,
	(connected) => {
		if (connected && step.value === 'gateway') {
			step.value = 'extension';
		}
	},
);
</script>

<template>
	<Modal
		:name="props.modalName"
		:show-close="true"
		custom-class="instance-ai-browser-use-setup-modal"
		width="540"
	>
		<template #content>
			<ComputerUseSetupContent v-if="step === 'gateway'" />

			<div v-else :class="$style.body">
				<div :class="$style.header">
					<N8nHeading tag="h2" size="large" :class="$style.title">
						{{ i18n.baseText('instanceAi.browserUse.step.extension.title') }}
					</N8nHeading>
				</div>

				<N8nText color="text-light" :class="$style.description">
					{{ i18n.baseText('instanceAi.browserUse.step.extension.description') }}
				</N8nText>

				<N8nButton
					:label="i18n.baseText('instanceAi.browserUse.step.extension.cta')"
					:href="CHROME_EXTENSION_URL"
					target="_blank"
					variant="solid"
					size="large"
					icon="external-link"
					data-test-id="browser-use-install-extension"
				/>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.title {
	margin: 0;
	font-size: var(--font-size--xl);
}

.description {
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
}

.waitingRow {
	display: flex;
	font-size: var(--font-size--2xs);
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 10px 14px;
	background: var(--color--background--light-2);
	color: var(--color--text--tint-1);
	font-weight: var(--font-weight--bold);
	border-radius: var(--radius);
}
</style>

<style lang="scss">
.instance-ai-browser-use-setup-modal {
	.el-dialog__header {
		padding: 0;
		margin: 0;
	}
	.el-dialog__body {
		padding: 0;
	}
}
</style>
