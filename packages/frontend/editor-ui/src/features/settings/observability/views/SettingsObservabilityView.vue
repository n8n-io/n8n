<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { OTEL_SETTINGS_VIEW, useOtelStore } from '@n8n/frontend-module-otel';
import { useI18n } from '@n8n/i18n';
import {
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowConfigure,
	N8nSettingsRowGroup,
	N8nSettingsSection,
} from '@n8n/design-system';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { OBSERVABILITY_DOCS_URL, VIEWS } from '@/app/constants';
import { useLogStreamingStore } from '@/features/integrations/logStreaming.ee/logStreaming.store';

import { useObservabilityPages } from '../useObservabilityPages';

const i18n = useI18n();
const router = useRouter();
const documentTitle = useDocumentTitle();
const settingsStore = useSettingsStore();
const logStreamingStore = useLogStreamingStore();
const otelStore = useOtelStore();
const { canOpenLogStreaming, canOpenOpenTelemetry } = useObservabilityPages();

// Undefined until loaded, so the configure affordance keeps its default label meanwhile.
const destinationCount = ref<number>();
const isTracingEnabled = ref<boolean>();

// No count while unlicensed: the page shows the paywall, and the request would be refused.
const logStreamingStatus = computed(() =>
	destinationCount.value
		? i18n.baseText('settings.observability.logStreaming.destinations', {
				adjustToNumber: destinationCount.value,
				interpolate: { count: String(destinationCount.value) },
			})
		: undefined,
);

const openTelemetryStatus = computed(() => {
	if (isTracingEnabled.value === undefined) return undefined;
	return i18n.baseText(
		isTracingEnabled.value
			? 'settings.observability.status.enabled'
			: 'settings.observability.status.disabled',
	);
});

async function openLogStreaming() {
	await router.push({ name: VIEWS.LOG_STREAMING_SETTINGS });
}

async function openOpenTelemetry() {
	await router.push({ name: OTEL_SETTINGS_VIEW });
}

// Each status is a hint, not the page itself: a failed request leaves the row on Configure.
async function loadLogStreamingStatus() {
	if (!canOpenLogStreaming.value || !settingsStore.isModuleActive('log-streaming')) return;
	try {
		const destinations = await logStreamingStore.fetchDestinations();
		destinationCount.value = destinations.length;
	} catch {
		destinationCount.value = undefined;
	}
}

async function loadOpenTelemetryStatus() {
	if (!canOpenOpenTelemetry.value) return;
	try {
		await otelStore.fetchSettings();
		isTracingEnabled.value = otelStore.settings.enabled;
	} catch {
		isTracingEnabled.value = undefined;
	}
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.observability'));
	await Promise.all([loadLogStreamingStatus(), loadOpenTelemetryStatus()]);
});
</script>

<template>
	<N8nSettingsLayout :class="$style.layout" data-test-id="settings-observability-view">
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.observability')"
			:description="i18n.baseText('settings.observability.description')"
			:docs-url="OBSERVABILITY_DOCS_URL"
		/>

		<N8nSettingsSection
			:title="i18n.baseText('settings.observability.exports.title')"
			data-test-id="settings-observability-exports"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					v-if="canOpenLogStreaming"
					clickable
					:title="i18n.baseText('settings.log-streaming')"
					:description="i18n.baseText('settings.observability.logStreaming.description')"
					data-test-id="settings-observability-log-streaming-row"
					@click="openLogStreaming"
				>
					<template #action>
						<N8nSettingsRowConfigure :value="logStreamingStatus" />
					</template>
				</N8nSettingsRow>

				<N8nSettingsRow
					v-if="canOpenOpenTelemetry"
					clickable
					:title="i18n.baseText('settings.opentelemetry')"
					:description="i18n.baseText('settings.observability.opentelemetry.description')"
					data-test-id="settings-observability-opentelemetry-row"
					@click="openOpenTelemetry"
				>
					<template #action>
						<N8nSettingsRowConfigure :value="openTelemetryStatus" />
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
/* Collapse the layout's own top inset; the settings shell already pads the page top. */
.layout {
	padding-top: 0;
}
</style>
