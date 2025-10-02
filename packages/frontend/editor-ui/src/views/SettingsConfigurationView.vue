<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useToast } from '@/composables/useToast';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useSettingsStore } from '@/stores/settings.store';
import { useI18n } from '@n8n/i18n';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';

const settingsStore = useSettingsStore();
const { showMessage, showError } = useToast();
const documentTitle = useDocumentTitle();
const i18n = useI18n();
const rootStore = useRootStore();

// Configuration setting
const allowPersonalProjectWorkflowActivation = ref(
	settingsStore.settings.allowPersonalProjectWorkflowActivation,
);

onMounted(() => {
	documentTitle.set(i18n.baseText('settings.configuration'));
});

async function onTogglePersonalProjectWorkflowActivation() {
	try {
		await makeRestApiRequest(rootStore.restApiContext, 'POST', '/configuration', {
			allowPersonalProjectWorkflowActivation: allowPersonalProjectWorkflowActivation.value,
		});

		// Update the settings store to reflect the change
		settingsStore.settings.allowPersonalProjectWorkflowActivation =
			allowPersonalProjectWorkflowActivation.value;

		showMessage({
			title: i18n.baseText('settings.configuration.saved'),
			type: 'success',
		});
	} catch (error) {
		// Reset the checkbox on error
		allowPersonalProjectWorkflowActivation.value = !allowPersonalProjectWorkflowActivation.value;

		showError(error, i18n.baseText('settings.configuration.saveError'));
	}
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<n8n-heading size="2xlarge">
				{{ i18n.baseText('settings.configuration') }}
			</n8n-heading>
		</div>

		<div :class="$style.description">
			<n8n-text size="medium" color="text-light">
				{{ i18n.baseText('settings.configuration.description') }}
			</n8n-text>
		</div>

		<!-- Workflow Configuration Section -->
		<div :class="$style.configurationSection">
			<n8n-heading size="large" class="mb-s">
				{{ i18n.baseText('settings.configuration.workflows.title') }}
			</n8n-heading>

			<n8n-text size="medium" class="mb-m" color="text-light">
				{{ i18n.baseText('settings.configuration.workflows.description') }}
			</n8n-text>

			<div :class="$style.configurationOption">
				<div :class="$style.configurationToggle">
					<n8n-checkbox
						v-model="allowPersonalProjectWorkflowActivation"
						:label="
							i18n.baseText('settings.configuration.allowPersonalProjectWorkflowActivation.label')
						"
						data-test-id="allow-personal-project-workflow-activation-checkbox"
						@update:model-value="onTogglePersonalProjectWorkflowActivation"
					/>
				</div>
				<n8n-text size="small" color="text-light" class="mt-2xs">
					{{
						i18n.baseText(
							'settings.configuration.allowPersonalProjectWorkflowActivation.description',
						)
					}}
				</n8n-text>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	padding-bottom: 100px;
}

.header {
	display: flex;
	align-items: center;
	white-space: nowrap;
	margin-bottom: var(--spacing-l);

	*:first-child {
		flex-grow: 1;
	}
}

.description {
	margin-bottom: var(--spacing-xl);
}

.configurationSection {
	margin-bottom: var(--spacing-xl);
	padding: var(--spacing-l);
	border: var(--border-base);
	border-radius: var(--border-radius-large);
	background-color: var(--color-background-xlight);
}

.configurationOption {
	margin-bottom: var(--spacing-m);

	&:last-child {
		margin-bottom: 0;
	}
}

.configurationToggle {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
}
</style>
