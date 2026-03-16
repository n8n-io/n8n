<script lang="ts" setup>
import { ref, useCssModule } from 'vue';
import { useAsyncState } from '@vueuse/core';
import { ElSwitch } from 'element-plus';
import { N8nButton, N8nHeading, N8nInput, N8nInputLabel, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import type { Plugin } from '@n8n/rest-api-client/api/plugins-settings';
import * as pluginsSettingsApi from '@n8n/rest-api-client/api/plugins-settings';
import { useMergeDevIntegrations } from '@/features/shared/nodeCreator/composables/useMergeDevIntegrations';

const $style = useCssModule();
const rootStore = useRootStore();
const i18n = useI18n();
const { showToast, showError } = useToast();
const { clearCache: clearMergeDevCache } = useMergeDevIntegrations();

const plugins = ref<Plugin[]>([]);
const fieldDrafts = ref<Record<string, Record<string, string>>>({});
const fieldErrors = ref<Record<string, Record<string, string>>>({});
const savingPlugins = ref(new Set<string>());

const { isLoading } = useAsyncState(async () => {
	const settings = await pluginsSettingsApi.getPluginsSettings(rootStore.restApiContext);
	plugins.value = settings.plugins;
	for (const plugin of settings.plugins) {
		fieldDrafts.value[plugin.id] = Object.fromEntries(plugin.fields.map((f) => [f.key, f.value]));
		fieldErrors.value[plugin.id] = {};
	}
	return settings;
}, undefined);

function hasAllFields(pluginId: string): boolean {
	return (
		plugins.value
			.find((p) => p.id === pluginId)
			?.fields.every((f) => fieldDrafts.value[pluginId]?.[f.key]?.trim()) ?? false
	);
}

async function onPluginEnabledChange(plugin: Plugin, value: string | number | boolean) {
	const enabled = typeof value === 'boolean' ? value : Boolean(value);

	if (!enabled) {
		try {
			const updated = await pluginsSettingsApi.updatePluginSettings(rootStore.restApiContext, {
				id: plugin.id,
				enabled: false,
			});
			plugins.value = updated.plugins;
			clearMergeDevCache();
			showToast({
				type: 'success',
				message: '',
				title: i18n.baseText('settings.plugins.success.disabled', {
					interpolate: { name: plugin.displayName },
				}),
			});
		} catch (error) {
			plugins.value = plugins.value.map((p) => (p.id === plugin.id ? { ...p, enabled: true } : p));
			showError(error, plugin.displayName);
		}
	} else if (hasAllFields(plugin.id)) {
		try {
			const updated = await pluginsSettingsApi.updatePluginSettings(rootStore.restApiContext, {
				id: plugin.id,
				enabled: true,
			});
			plugins.value = updated.plugins;
			clearMergeDevCache();
		} catch (error) {
			plugins.value = plugins.value.map((p) => (p.id === plugin.id ? { ...p, enabled: false } : p));
			showError(error, plugin.displayName);
		}
	} else {
		plugins.value = plugins.value.map((p) => (p.id === plugin.id ? { ...p, enabled: true } : p));
	}
}

async function savePlugin(plugin: Plugin) {
	const drafts = fieldDrafts.value[plugin.id] ?? {};
	const errors: Record<string, string> = {};

	for (const field of plugin.fields) {
		if (!drafts[field.key]?.trim()) {
			errors[field.key] = i18n.baseText('settings.plugins.field.required', {
				interpolate: { label: field.label },
			});
		}
	}

	fieldErrors.value[plugin.id] = errors;
	if (Object.keys(errors).length > 0) return;

	savingPlugins.value = new Set([...savingPlugins.value, plugin.id]);
	try {
		const updated = await pluginsSettingsApi.updatePluginSettings(rootStore.restApiContext, {
			id: plugin.id,
			enabled: true,
			fields: drafts,
		});
		plugins.value = updated.plugins;
		clearMergeDevCache();
		showToast({
			type: 'success',
			message: '',
			title: i18n.baseText('settings.plugins.success.saved', {
				interpolate: { name: plugin.displayName },
			}),
		});
	} catch (error) {
		showError(error, plugin.displayName);
	} finally {
		savingPlugins.value = new Set([...savingPlugins.value].filter((id) => id !== plugin.id));
	}
}
</script>

<template>
	<div class="pb-3xl">
		<div class="mb-xl" :class="$style.headerTitle">
			<N8nHeading tag="h1" size="2xlarge">
				{{ i18n.baseText('settings.plugins') }}
			</N8nHeading>
			<N8nText color="text-base" size="medium">
				{{ i18n.baseText('settings.plugins.description') }}
			</N8nText>
		</div>

		<div v-for="plugin in plugins" :key="plugin.id" :class="$style.settingsSection">
			<div :class="$style.settingsContainer">
				<div :class="$style.settingsContainerInfo">
					<N8nText :bold="true">{{ plugin.displayName }}</N8nText>
					<N8nText size="small" color="text-light">{{ plugin.description }}</N8nText>
				</div>
				<div :class="$style.settingsContainerAction">
					<ElSwitch
						:model-value="plugin.enabled"
						:loading="isLoading"
						size="large"
						:data-test-id="`enable-${plugin.id}-toggle`"
						@update:model-value="(val) => onPluginEnabledChange(plugin, val)"
					/>
				</div>
			</div>

			<div v-if="plugin.enabled" :class="$style.fieldsSection">
				<N8nInputLabel
					v-for="field in plugin.fields"
					:key="field.key"
					:label="field.label"
					color="text-dark"
				>
					<N8nInput
						v-model="fieldDrafts[plugin.id][field.key]"
						type="password"
						size="large"
						:placeholder="field.placeholder"
						:data-test-id="`${plugin.id}-${field.key}-input`"
						@input="fieldErrors[plugin.id][field.key] = ''"
					/>
					<N8nText
						v-if="fieldErrors[plugin.id]?.[field.key]"
						size="small"
						color="danger"
						class="mt-4xs"
					>
						{{ fieldErrors[plugin.id][field.key] }}
					</N8nText>
				</N8nInputLabel>

				<div :class="$style.saveRow">
					<N8nButton
						type="primary"
						size="large"
						:loading="savingPlugins.has(plugin.id)"
						:data-test-id="`${plugin.id}-save-btn`"
						@click="savePlugin(plugin)"
					>
						{{ i18n.baseText('generic.save') }}
					</N8nButton>
				</div>
			</div>
		</div>
	</div>
</template>

<style module>
.headerTitle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.settingsSection {
	border-radius: var(--radius);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	margin-bottom: var(--spacing--lg);
}

.settingsContainer {
	display: flex;
	align-items: center;
	padding-left: var(--spacing--sm);
	justify-content: space-between;
	flex-shrink: 0;
}

.settingsContainerInfo {
	display: flex;
	padding: var(--spacing--2xs) 0;
	flex-direction: column;
	justify-content: center;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.settingsContainerAction {
	display: flex;
	padding: var(--spacing--md) var(--spacing--sm);
	justify-content: flex-end;
	align-items: center;
	flex-shrink: 0;
}

.fieldsSection {
	border-top: var(--border-width) var(--border-style) var(--color--foreground);
	padding: var(--spacing--sm);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.saveRow {
	display: flex;
	justify-content: flex-end;
}
</style>
