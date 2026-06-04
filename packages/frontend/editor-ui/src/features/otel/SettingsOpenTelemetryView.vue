<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { onBeforeRouteLeave, type NavigationGuardNext } from 'vue-router';
import { ElDialog, ElSwitch } from 'element-plus';
import { N8nHeading, N8nIcon, N8nButton, N8nText, N8nInput, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useOtelStore, headersStringToPairs, headersPairsToString } from './otel.store';
import { OTEL_FIELD_ENV_VARS } from './otel.constants';

const i18n = useI18n();
const telemetry = useTelemetry();
const toast = useToast();
const documentTitle = useDocumentTitle();
const otelStore = useOtelStore();

const headerPairs = ref<Array<{ key: string; value: string }>>([]);

const showUnsavedChangesDialog = ref(false);
const pendingNext = ref<NavigationGuardNext | null>(null);

function syncHeaderPairsFromStore() {
	headerPairs.value = headersStringToPairs(otelStore.settings?.exporterHeaders ?? '');
}

function syncHeaderPairsToStore() {
	if (otelStore.settings) {
		otelStore.settings.exporterHeaders = headersPairsToString(headerPairs.value);
	}
}

function addHeader() {
	headerPairs.value.push({ key: '', value: '' });
	syncHeaderPairsToStore();
}

function removeHeader(index: number) {
	headerPairs.value.splice(index, 1);
	syncHeaderPairsToStore();
}

function onHeaderChange() {
	syncHeaderPairsToStore();
}

function envTooltip(field: keyof typeof OTEL_FIELD_ENV_VARS): string {
	return i18n.baseText('settings.opentelemetry.envVarTooltip', {
		interpolate: { envVar: OTEL_FIELD_ENV_VARS[field] },
	});
}

async function save() {
	try {
		const { wasEnabled, nowEnabled } = await otelStore.saveSettings();
		if (!wasEnabled && nowEnabled) {
			telemetry.track('Activated otel via UI');
		} else if (wasEnabled && !nowEnabled) {
			telemetry.track('Disabled otel via UI');
		}
		toast.showMessage({
			title: i18n.baseText('settings.opentelemetry.savedSuccess'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.opentelemetry.savedError'));
	}
}

function discard() {
	otelStore.discardChanges();
	syncHeaderPairsFromStore();
}

function onLeaveWithoutSaving() {
	showUnsavedChangesDialog.value = false;
	pendingNext.value?.();
	pendingNext.value = null;
}

function onCancelLeave() {
	showUnsavedChangesDialog.value = false;
	pendingNext.value = null;
}

onBeforeRouteLeave((_to, _from, next) => {
	if (!otelStore.isDirty) {
		next();
		return;
	}
	pendingNext.value = next;
	showUnsavedChangesDialog.value = true;
});

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.opentelemetry.title'));
	await otelStore.fetchSettings();
	syncHeaderPairsFromStore();
});

watch(
	() => otelStore.settings?.exporterHeaders,
	(newVal) => {
		const currentString = headersPairsToString(headerPairs.value);
		if (newVal !== currentString) {
			headerPairs.value = headersStringToPairs(newVal ?? '');
		}
	},
);
</script>

<template>
	<div :class="$style.container">
		<header :class="$style.header">
			<N8nHeading size="xlarge" tag="h1">
				{{ i18n.baseText('settings.opentelemetry.title') }}
			</N8nHeading>
			<N8nText size="medium" color="text-light">
				{{ i18n.baseText('settings.opentelemetry.description') }}
			</N8nText>
		</header>

		<div v-if="otelStore.loading" :class="$style.loading">
			<N8nIcon icon="spinner" spin />
		</div>

		<template v-if="otelStore.settings && !otelStore.loading">
			<!-- Enable toggle -->
			<div :class="$style.card">
				<div :class="[$style.settingsRow, $style.settingsRowBorder]">
					<div :class="$style.settingsRowLeft">
						<span :class="$style.settingsRowLabel">
							{{ i18n.baseText('settings.opentelemetry.enable.label') }}
						</span>
						<span :class="$style.settingsRowDescription">
							{{ i18n.baseText('settings.opentelemetry.enable.description') }}
						</span>
					</div>
					<N8nTooltip :content="envTooltip('enabled')">
						<ElSwitch
							:model-value="otelStore.settings.enabled"
							:loading="otelStore.saving"
							data-testid="otel-enabled-toggle"
							@update:model-value="otelStore.settings!.enabled = Boolean($event)"
						/>
					</N8nTooltip>
				</div>
			</div>

			<!-- Collector connection section -->
			<div :class="$style.card">
				<div :class="$style.sectionBlock">
					<N8nHeading tag="h2" size="small">
						{{ i18n.baseText('settings.opentelemetry.collectorConnection.title') }}
					</N8nHeading>
				</div>

				<div :class="[$style.settingsRow, $style.settingsRowBorder, $style.settingsRowVertical]">
					<div :class="$style.fieldLabelRow">
						<span :class="$style.settingsRowLabel">
							{{ i18n.baseText('settings.opentelemetry.exporterEndpoint.label') }}
						</span>
						<N8nTooltip :content="envTooltip('exporterEndpoint')">
							<N8nIcon icon="info" size="xsmall" color="text-light" />
						</N8nTooltip>
					</div>
					<span :class="$style.settingsRowDescription">
						{{ i18n.baseText('settings.opentelemetry.exporterEndpoint.description') }}
					</span>
					<N8nInput
						v-model="otelStore.settings.exporterEndpoint"
						:placeholder="i18n.baseText('settings.opentelemetry.exporterEndpoint.placeholder')"
						data-testid="otel-exporter-endpoint"
					/>
				</div>

				<div :class="[$style.settingsRow, $style.settingsRowBorder, $style.settingsRowVertical]">
					<div :class="$style.fieldLabelRow">
						<span :class="$style.settingsRowLabel">
							{{ i18n.baseText('settings.opentelemetry.exporterServiceName.label') }}
						</span>
						<N8nTooltip :content="envTooltip('exporterServiceName')">
							<N8nIcon icon="info" size="xsmall" color="text-light" />
						</N8nTooltip>
					</div>
					<span :class="$style.settingsRowDescription">
						{{ i18n.baseText('settings.opentelemetry.exporterServiceName.description') }}
					</span>
					<N8nInput
						v-model="otelStore.settings.exporterServiceName"
						:placeholder="i18n.baseText('settings.opentelemetry.exporterServiceName.placeholder')"
						data-testid="otel-service-name"
					/>
				</div>

				<div :class="[$style.settingsRow, $style.settingsRowBorder, $style.settingsRowVertical]">
					<div :class="$style.fieldLabelRow">
						<span :class="$style.settingsRowLabel">
							{{ i18n.baseText('settings.opentelemetry.exporterHeaders.label') }}
						</span>
						<N8nTooltip :content="envTooltip('exporterHeaders')">
							<N8nIcon icon="info" size="xsmall" color="text-light" />
						</N8nTooltip>
					</div>
					<span :class="$style.settingsRowDescription">
						{{ i18n.baseText('settings.opentelemetry.exporterHeaders.description') }}
					</span>
					<div v-for="(pair, index) in headerPairs" :key="index" :class="$style.headerRow">
						<N8nInput
							v-model="pair.key"
							:placeholder="i18n.baseText('settings.opentelemetry.exporterHeaders.keyPlaceholder')"
							:class="$style.headerKey"
							data-testid="otel-header-key"
							@input="onHeaderChange"
						/>
						<N8nInput
							v-model="pair.value"
							:placeholder="
								i18n.baseText('settings.opentelemetry.exporterHeaders.valuePlaceholder')
							"
							:class="$style.headerValue"
							data-testid="otel-header-value"
							@input="onHeaderChange"
						/>
						<N8nButton
							icon="trash-2"
							type="tertiary"
							size="small"
							data-testid="otel-header-remove"
							@click="removeHeader(index)"
						/>
					</div>
					<N8nButton
						type="tertiary"
						size="small"
						icon="plus"
						:label="i18n.baseText('settings.opentelemetry.exporterHeaders.addHeader')"
						data-testid="otel-header-add"
						@click="addHeader"
					/>
				</div>

				<div :class="[$style.settingsRow, $style.settingsRowBorder, $style.settingsRowVertical]">
					<div :class="$style.fieldLabelRow">
						<span :class="$style.settingsRowLabel">
							{{ i18n.baseText('settings.opentelemetry.exporterTracingPath.label') }}
						</span>
						<N8nTooltip :content="envTooltip('exporterTracingPath')">
							<N8nIcon icon="info" size="xsmall" color="text-light" />
						</N8nTooltip>
					</div>
					<span :class="$style.settingsRowDescription">
						{{ i18n.baseText('settings.opentelemetry.exporterTracingPath.description') }}
					</span>
					<N8nInput
						v-model="otelStore.settings.exporterTracingPath"
						:placeholder="i18n.baseText('settings.opentelemetry.exporterTracingPath.placeholder')"
						data-testid="otel-tracing-path"
					/>
				</div>

				<div :class="[$style.settingsRow, $style.settingsRowVertical]">
					<div :class="$style.fieldLabelRow">
						<span :class="$style.settingsRowLabel">
							{{ i18n.baseText('settings.opentelemetry.startupConnectivityTimeoutMs.label') }}
						</span>
						<N8nTooltip :content="envTooltip('startupConnectivityTimeoutMs')">
							<N8nIcon icon="info" size="xsmall" color="text-light" />
						</N8nTooltip>
					</div>
					<span :class="$style.settingsRowDescription">
						{{ i18n.baseText('settings.opentelemetry.startupConnectivityTimeoutMs.description') }}
					</span>
					<N8nInput
						:model-value="String(otelStore.settings.startupConnectivityTimeoutMs)"
						type="number"
						:placeholder="
							i18n.baseText('settings.opentelemetry.startupConnectivityTimeoutMs.placeholder')
						"
						data-testid="otel-connectivity-timeout"
						@update:model-value="otelStore.settings!.startupConnectivityTimeoutMs = Number($event)"
					/>
				</div>
			</div>

			<!-- Tracing section -->
			<div :class="$style.card">
				<div :class="$style.sectionBlock">
					<N8nHeading tag="h2" size="small">
						{{ i18n.baseText('settings.opentelemetry.tracing.title') }}
					</N8nHeading>
				</div>

				<div :class="[$style.settingsRow, $style.settingsRowBorder, $style.settingsRowVertical]">
					<div :class="$style.fieldLabelRow">
						<span :class="$style.settingsRowLabel">
							{{ i18n.baseText('settings.opentelemetry.tracesSampleRate.label') }}
						</span>
						<N8nTooltip :content="envTooltip('tracesSampleRate')">
							<N8nIcon icon="info" size="xsmall" color="text-light" />
						</N8nTooltip>
					</div>
					<span :class="$style.settingsRowDescription">
						{{ i18n.baseText('settings.opentelemetry.tracesSampleRate.description') }}
					</span>
					<N8nInput
						:model-value="String(otelStore.settings.tracesSampleRate)"
						type="number"
						:min="0"
						:max="1"
						:step="0.1"
						:placeholder="i18n.baseText('settings.opentelemetry.tracesSampleRate.placeholder')"
						data-testid="otel-sample-rate"
						@update:model-value="otelStore.settings!.tracesSampleRate = Number($event)"
					/>
				</div>

				<div :class="[$style.settingsRow, $style.settingsRowBorder]">
					<div :class="$style.settingsRowLeft">
						<span :class="$style.settingsRowLabel">
							{{ i18n.baseText('settings.opentelemetry.includeNodeSpans.label') }}
						</span>
						<span :class="$style.settingsRowDescription">
							{{ i18n.baseText('settings.opentelemetry.includeNodeSpans.description') }}
						</span>
					</div>
					<N8nTooltip :content="envTooltip('includeNodeSpans')">
						<ElSwitch
							:model-value="otelStore.settings.includeNodeSpans"
							data-testid="otel-include-node-spans"
							@update:model-value="otelStore.settings!.includeNodeSpans = Boolean($event)"
						/>
					</N8nTooltip>
				</div>

				<div :class="[$style.settingsRow, $style.settingsRowBorder]">
					<div :class="$style.settingsRowLeft">
						<span :class="$style.settingsRowLabel">
							{{ i18n.baseText('settings.opentelemetry.injectOutbound.label') }}
						</span>
						<span :class="$style.settingsRowDescription">
							{{ i18n.baseText('settings.opentelemetry.injectOutbound.description') }}
						</span>
					</div>
					<N8nTooltip :content="envTooltip('injectOutbound')">
						<ElSwitch
							:model-value="otelStore.settings.injectOutbound"
							data-testid="otel-inject-outbound"
							@update:model-value="otelStore.settings!.injectOutbound = Boolean($event)"
						/>
					</N8nTooltip>
				</div>

				<div :class="$style.settingsRow">
					<div :class="$style.settingsRowLeft">
						<span :class="$style.settingsRowLabel">
							{{ i18n.baseText('settings.opentelemetry.productionExecutionsOnly.label') }}
						</span>
						<span :class="$style.settingsRowDescription">
							{{ i18n.baseText('settings.opentelemetry.productionExecutionsOnly.description') }}
						</span>
					</div>
					<N8nTooltip :content="envTooltip('productionExecutionsOnly')">
						<ElSwitch
							:model-value="otelStore.settings.productionExecutionsOnly"
							data-testid="otel-production-only"
							@update:model-value="otelStore.settings!.productionExecutionsOnly = Boolean($event)"
						/>
					</N8nTooltip>
				</div>
			</div>

			<!-- Footer -->
			<div :class="$style.footer">
				<N8nButton
					:label="i18n.baseText('settings.opentelemetry.save')"
					:loading="otelStore.saving"
					:disabled="!otelStore.isDirty"
					data-testid="otel-save-button"
					@click="save"
				/>
				<N8nButton
					v-if="otelStore.isDirty"
					type="secondary"
					:label="i18n.baseText('settings.opentelemetry.discard')"
					data-testid="otel-discard-button"
					@click="discard"
				/>
				<N8nText
					v-if="!otelStore.isDirty && otelStore.savedSettings"
					color="text-light"
					size="small"
				>
					{{ i18n.baseText('settings.opentelemetry.allChangesSaved') }}
				</N8nText>
			</div>
		</template>

		<!-- Unsaved changes dialog -->
		<ElDialog
			v-model="showUnsavedChangesDialog"
			:title="i18n.baseText('settings.opentelemetry.unsavedChanges.title')"
			width="460px"
			data-testid="otel-unsaved-changes-dialog"
			@close="onCancelLeave"
		>
			<N8nText>{{ i18n.baseText('settings.opentelemetry.unsavedChanges.message') }}</N8nText>
			<template #footer>
				<N8nButton
					type="secondary"
					:label="i18n.baseText('settings.opentelemetry.unsavedChanges.cancel')"
					@click="onCancelLeave"
				/>
				<N8nButton
					type="secondary"
					:label="i18n.baseText('settings.opentelemetry.unsavedChanges.leaveWithoutSaving')"
					@click="onLeaveWithoutSaving"
				/>
			</template>
		</ElDialog>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	max-width: 720px;
	margin: 0 auto;
	padding-bottom: var(--spacing--2xl);
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--xs);
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xl);
	color: var(--color--text--tint-1);
}

.card {
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}

.sectionBlock {
	padding: var(--spacing--sm);
	background: var(--color--background--light-3);
}

.settingsRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--sm);
	min-height: 64px;
	background: var(--color--background--light-3);
	gap: var(--spacing--sm);
}

.settingsRowVertical {
	flex-direction: column;
	align-items: flex-start;
	min-height: unset;
}

.settingsRowBorder {
	position: relative;

	&::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: var(--spacing--sm);
		right: var(--spacing--sm);
		height: 1px;
		background: var(--color--foreground);
	}
}

.settingsRowLeft {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
}

.settingsRowLabel {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: 20px;
	color: var(--color--text--shade-1);
}

.settingsRowDescription {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.fieldLabelRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.headerRow {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: center;
	width: 100%;
}

.headerKey {
	flex: 1;
}

.headerValue {
	flex: 2;
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
