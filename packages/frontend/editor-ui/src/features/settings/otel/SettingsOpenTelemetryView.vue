<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { onBeforeRouteLeave, type NavigationGuardNext } from 'vue-router';
import {
	N8nButton,
	N8nCheckbox,
	N8nDialog,
	N8nDialogClose,
	N8nDialogFooter,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRowGroup,
	N8nSettingsSaveBar,
	N8nSettingsSection,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useOtelStore, headersStringToPairs, headersPairsToString } from './otel.store';
import { OTEL_FIELD_ENV_VARS, OTEL_TEST_SPAN_NAME } from './otel.constants';
import OtelSettingsRow from './OtelSettingsRow.vue';
import OtelStatusControl from './OtelStatusControl.vue';

const OTEL_DOCS_URL = 'https://docs.n8n.io/hosting/logging-monitoring/opentelemetry/';

const i18n = useI18n();
const telemetry = useTelemetry();
const toast = useToast();
const documentTitle = useDocumentTitle();
const otelStore = useOtelStore();

const headerPairs = ref<Array<{ key: string; value: string }>>([]);

const showUnsavedChangesDialog = ref(false);
const pendingNext = ref<NavigationGuardNext | null>(null);

function syncHeaderPairsFromStore() {
	headerPairs.value = headersStringToPairs(otelStore.settings.exporterHeaders);
}

function syncHeaderPairsToStore() {
	otelStore.settings.exporterHeaders = headersPairsToString(headerPairs.value);
}

function addHeader() {
	headerPairs.value.push({ key: '', value: '' });
	syncHeaderPairsToStore();
}

function removeHeader(index: number) {
	headerPairs.value.splice(index, 1);
	syncHeaderPairsToStore();
}

function onHeaderChange(index: number, field: 'key' | 'value', value: string) {
	headerPairs.value = headerPairs.value.map((pair, i) =>
		i === index ? { ...pair, [field]: value } : pair,
	);
	syncHeaderPairsToStore();
}

function isEnvManaged(field: keyof typeof OTEL_FIELD_ENV_VARS): boolean {
	return otelStore.envManagedFields.includes(field);
}

function envTooltip(field: keyof typeof OTEL_FIELD_ENV_VARS): string {
	const envVariable = i18n.baseText('settings.opentelemetry.envVarTooltip', {
		interpolate: { envVar: OTEL_FIELD_ENV_VARS[field] },
	});

	return isEnvManaged(field)
		? `${i18n.baseText('settings.opentelemetry.envVarManagedTooltip')}. ${envVariable}`
		: envVariable;
}

async function save(): Promise<boolean> {
	try {
		const wasEnabled = otelStore.savedSettings.enabled;
		await otelStore.saveSettings();
		const isNowEnabled = otelStore.settings.enabled;

		if (!wasEnabled && isNowEnabled) {
			telemetry.track('Activated otel via UI', {
				includeNodeSpans: otelStore.settings.includeNodeSpans,
				productionExecutionsOnly: otelStore.settings.productionExecutionsOnly,
				tracesSampleRate: otelStore.settings.tracesSampleRate,
				injectOutbound: otelStore.settings.injectOutbound,
			});
		} else if (wasEnabled && !isNowEnabled) {
			telemetry.track('Disabled otel via UI');
		} else {
			telemetry.track('Updated otel via UI', {
				enabled: isNowEnabled,
				includeNodeSpans: otelStore.settings.includeNodeSpans,
				productionExecutionsOnly: otelStore.settings.productionExecutionsOnly,
				tracesSampleRate: otelStore.settings.tracesSampleRate,
				injectOutbound: otelStore.settings.injectOutbound,
			});
		}

		toast.showMessage({
			title: i18n.baseText('settings.opentelemetry.savedSuccess'),
			type: 'success',
		});

		return true;
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.opentelemetry.savedError'));
		return false;
	}
}

function discard() {
	otelStore.discardChanges();
	syncHeaderPairsFromStore();
}

const statusSaving = ref(false);

/*
 * Enabling/disabling is a live status change, not a form draft: it applies
 * immediately by committing the current on-screen draft with the flag set.
 * Saving only the flag would silently enable with stale, previously-saved
 * config while the screen shows unsaved edits.
 */
async function onToggleEnabled(enabled: boolean) {
	otelStore.settings.enabled = enabled;
	statusSaving.value = true;
	try {
		const saved = await save();
		if (!saved) {
			otelStore.settings.enabled = !enabled;
		}
	} finally {
		statusSaving.value = false;
	}
}

function onLeaveWithoutSaving() {
	showUnsavedChangesDialog.value = false;
	pendingNext.value?.();
	pendingNext.value = null;
}

async function onSaveAndLeave() {
	const saved = await save();
	if (!saved) return;
	showUnsavedChangesDialog.value = false;
	pendingNext.value?.();
	pendingNext.value = null;
}

function onKeepEditing() {
	showUnsavedChangesDialog.value = false;
	pendingNext.value?.(false);
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
	syncSampleRateInput();
	syncConnectivityTimeoutInput();
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

const canTestTrace = computed(
	() => !!otelStore.settings.exporterEndpoint && otelStore.testState !== 'sending',
);

/*
 * The sample rate is a text input formatted by us, not a native number input:
 * native number inputs render their value with the OS-region decimal separator,
 * which JS can neither read nor override, so the "of 1.00" copy next to it
 * could never be guaranteed to match. Formatting both the input display and the
 * copy through the same Intl formatter makes them consistent by construction.
 */
const rateFormatter = new Intl.NumberFormat(undefined, {
	minimumFractionDigits: 2,
	maximumFractionDigits: 4,
});
const sampleRateMax = rateFormatter.format(1);

const sampleRateInput = ref('');
const connectivityTimeoutInput = ref('');

function syncSampleRateInput() {
	sampleRateInput.value = rateFormatter.format(otelStore.settings.tracesSampleRate);
}

function syncConnectivityTimeoutInput() {
	connectivityTimeoutInput.value = String(otelStore.settings.startupConnectivityTimeoutMs);
}

function commitSampleRate() {
	// Accept both decimal separators regardless of locale.
	const parsed = Number(sampleRateInput.value.trim().replace(',', '.'));
	if (Number.isFinite(parsed)) {
		otelStore.settings.tracesSampleRate = Math.min(1, Math.max(0, parsed));
	}
	syncSampleRateInput();
}

function commitConnectivityTimeout() {
	const parsed = Number(connectivityTimeoutInput.value.trim());
	if (Number.isFinite(parsed)) {
		otelStore.settings.startupConnectivityTimeoutMs = Math.max(0, Math.round(parsed));
	}
	syncConnectivityTimeoutInput();
}

// Keep the formatted display in sync when the store changes underneath
// (discard, save response, env-managed refresh).
watch(() => otelStore.settings.tracesSampleRate, syncSampleRateInput);
watch(() => otelStore.settings.startupConnectivityTimeoutMs, syncConnectivityTimeoutInput);

const testTraceSubtitle = computed(() => {
	if (otelStore.testState === 'sent') {
		return i18n.baseText('settings.opentelemetry.testTrace.success', {
			interpolate: { spanName: OTEL_TEST_SPAN_NAME, time: otelStore.testTimestamp },
		});
	}
	if (otelStore.testState === 'error') {
		return i18n.baseText('settings.opentelemetry.testTrace.error', {
			interpolate: { error: otelStore.testError },
		});
	}
	return i18n.baseText('settings.opentelemetry.testTrace.description');
});

async function onSendTestTrace() {
	await otelStore.sendTestTrace();
}

// Connection changes invalidate the previous test result
watch(
	() => [
		otelStore.settings.exporterEndpoint,
		otelStore.settings.exporterTracingPath,
		otelStore.settings.exporterServiceName,
		otelStore.settings.exporterHeaders,
		otelStore.settings.startupConnectivityTimeoutMs,
	],
	() => {
		if (otelStore.testState !== 'idle') {
			otelStore.resetTestState();
		}
	},
);
</script>

<template>
	<!--
		Floating save bar contract: the bar must be a sibling of N8nSettingsLayout (last child
		of this flex-column page wrapper), not a child of its width-capped content column, so it
		can render at its designed width — the content column plus its own padding on each side.
	-->
	<div :class="$style.page">
		<N8nSettingsLayout :class="$style.layout">
			<N8nSettingsPageHeader
				:title="i18n.baseText('settings.opentelemetry.title')"
				:description="i18n.baseText('settings.opentelemetry.description')"
				:docs-url="OTEL_DOCS_URL"
			/>

			<div v-if="otelStore.loading" :class="$style.loading" data-test-id="otel-loading">
				<N8nIcon icon="spinner" spin />
			</div>

			<div v-else :class="$style.settingsContent">
				<N8nSettingsSection>
					<N8nSettingsRowGroup>
						<OtelSettingsRow
							:title="i18n.baseText('settings.opentelemetry.status.label')"
							:description="i18n.baseText('settings.opentelemetry.enable.description')"
							:env-tooltip="envTooltip('enabled')"
						>
							<template #action>
								<OtelStatusControl
									:enabled="otelStore.settings.enabled"
									:disabled="isEnvManaged('enabled')"
									:loading="statusSaving"
									@update:enabled="onToggleEnabled"
								/>
							</template>
						</OtelSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>

				<N8nSettingsSection
					:title="i18n.baseText('settings.opentelemetry.collectorConnection.title')"
				>
					<N8nSettingsRowGroup>
						<OtelSettingsRow
							:title="i18n.baseText('settings.opentelemetry.exporterEndpoint.label')"
							:description="i18n.baseText('settings.opentelemetry.exporterEndpoint.description')"
							:env-tooltip="envTooltip('exporterEndpoint')"
							action-fill
						>
							<template #action>
								<N8nInput
									v-model="otelStore.settings.exporterEndpoint"
									:class="$style.control"
									:placeholder="
										i18n.baseText('settings.opentelemetry.exporterEndpoint.placeholder')
									"
									:disabled="isEnvManaged('exporterEndpoint')"
									data-test-id="otel-exporter-endpoint"
								/>
							</template>
						</OtelSettingsRow>

						<OtelSettingsRow
							:title="i18n.baseText('settings.opentelemetry.exporterServiceName.label')"
							:description="i18n.baseText('settings.opentelemetry.exporterServiceName.description')"
							:env-tooltip="envTooltip('exporterServiceName')"
							action-fill
						>
							<template #action>
								<N8nInput
									v-model="otelStore.settings.exporterServiceName"
									:class="$style.control"
									:placeholder="
										i18n.baseText('settings.opentelemetry.exporterServiceName.placeholder')
									"
									:disabled="isEnvManaged('exporterServiceName')"
									data-test-id="otel-service-name"
								/>
							</template>
						</OtelSettingsRow>

						<OtelSettingsRow
							:title="i18n.baseText('settings.opentelemetry.exporterHeaders.label')"
							:description="i18n.baseText('settings.opentelemetry.exporterHeaders.description')"
							:env-tooltip="envTooltip('exporterHeaders')"
							layout="vertical"
							action-fill
							:action-max-width="false"
						>
							<template #action>
								<div :class="$style.headersBlock">
									<div v-for="(pair, index) in headerPairs" :key="index" :class="$style.headerRow">
										<N8nInputLabel
											:label="
												index === 0
													? i18n.baseText('settings.opentelemetry.exporterHeaders.keyLabel')
													: undefined
											"
											size="small"
										>
											<N8nInput
												:model-value="pair.key"
												:placeholder="
													i18n.baseText('settings.opentelemetry.exporterHeaders.keyPlaceholder')
												"
												:disabled="isEnvManaged('exporterHeaders')"
												data-test-id="otel-header-key"
												@update:model-value="(v: string) => onHeaderChange(index, 'key', v)"
											/>
										</N8nInputLabel>
										<N8nInputLabel
											:label="
												index === 0
													? i18n.baseText('settings.opentelemetry.exporterHeaders.valueLabel')
													: undefined
											"
											size="small"
										>
											<N8nInput
												:model-value="pair.value"
												:placeholder="
													i18n.baseText('settings.opentelemetry.exporterHeaders.valuePlaceholder')
												"
												:disabled="isEnvManaged('exporterHeaders')"
												data-test-id="otel-header-value"
												@update:model-value="(v: string) => onHeaderChange(index, 'value', v)"
											/>
										</N8nInputLabel>
										<div :class="$style.headerRemove">
											<N8nButton
												icon="trash-2"
												variant="ghost"
												size="small"
												native-type="button"
												:disabled="isEnvManaged('exporterHeaders')"
												:aria-label="i18n.baseText('settings.opentelemetry.exporterHeaders.remove')"
												data-test-id="otel-header-remove"
												@click.stop.prevent="removeHeader(index)"
											/>
										</div>
									</div>
									<N8nButton
										icon="plus"
										variant="subtle"
										size="small"
										native-type="button"
										:disabled="isEnvManaged('exporterHeaders')"
										:class="$style.addHeaderButton"
										data-test-id="otel-header-add"
										@click.stop.prevent="addHeader"
									>
										{{ i18n.baseText('settings.opentelemetry.exporterHeaders.addHeader') }}
									</N8nButton>
								</div>
							</template>
						</OtelSettingsRow>

						<OtelSettingsRow
							:title="i18n.baseText('settings.opentelemetry.exporterTracingPath.label')"
							:description="i18n.baseText('settings.opentelemetry.exporterTracingPath.description')"
							:env-tooltip="envTooltip('exporterTracingPath')"
							action-fill
						>
							<template #action>
								<N8nInput
									v-model="otelStore.settings.exporterTracingPath"
									:class="$style.control"
									:placeholder="
										i18n.baseText('settings.opentelemetry.exporterTracingPath.placeholder')
									"
									:disabled="isEnvManaged('exporterTracingPath')"
									data-test-id="otel-tracing-path"
								/>
							</template>
						</OtelSettingsRow>

						<OtelSettingsRow
							:title="i18n.baseText('settings.opentelemetry.startupConnectivityTimeoutMs.label')"
							:description="
								i18n.baseText('settings.opentelemetry.startupConnectivityTimeoutMs.description')
							"
							:env-tooltip="envTooltip('startupConnectivityTimeoutMs')"
						>
							<template #action>
								<div :class="$style.inputWithSlug">
									<N8nInput
										v-model="connectivityTimeoutInput"
										:disabled="isEnvManaged('startupConnectivityTimeoutMs')"
										:aria-label="
											i18n.baseText('settings.opentelemetry.startupConnectivityTimeoutMs.label')
										"
										data-test-id="otel-connectivity-timeout"
										@blur="commitConnectivityTimeout"
										@keydown.enter="commitConnectivityTimeout"
									/>
									<span :class="$style.slug">
										{{ i18n.baseText('settings.opentelemetry.startupConnectivityTimeoutMs.slug') }}
									</span>
								</div>
							</template>
						</OtelSettingsRow>

						<OtelSettingsRow
							:title="i18n.baseText('settings.opentelemetry.testTrace.label')"
							:description="testTraceSubtitle"
							:description-error="otelStore.testState === 'error'"
						>
							<template #action>
								<N8nButton
									v-if="otelStore.testState === 'sent'"
									variant="outline"
									icon="check"
									native-type="button"
									data-test-id="otel-test-trace-button"
									@click.stop.prevent="onSendTestTrace"
								>
									{{ i18n.baseText('settings.opentelemetry.testTrace.sent') }}
								</N8nButton>
								<N8nButton
									v-else
									variant="outline"
									:loading="otelStore.testState === 'sending'"
									:disabled="!canTestTrace"
									native-type="button"
									data-test-id="otel-test-trace-button"
									@click.stop.prevent="onSendTestTrace"
								>
									{{
										otelStore.testState === 'sending'
											? i18n.baseText('settings.opentelemetry.testTrace.sending')
											: i18n.baseText('settings.opentelemetry.testTrace.send')
									}}
								</N8nButton>
							</template>
						</OtelSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>

				<N8nSettingsSection :title="i18n.baseText('settings.opentelemetry.tracing.title')">
					<N8nSettingsRowGroup>
						<OtelSettingsRow
							:title="i18n.baseText('settings.opentelemetry.tracesSampleRate.label')"
							:description="
								i18n.baseText('settings.opentelemetry.tracesSampleRate.description', {
									interpolate: { max: sampleRateMax },
								})
							"
							:env-tooltip="envTooltip('tracesSampleRate')"
						>
							<template #action>
								<div :class="$style.inputWithSlug">
									<N8nInput
										v-model="sampleRateInput"
										:disabled="isEnvManaged('tracesSampleRate')"
										:aria-label="i18n.baseText('settings.opentelemetry.tracesSampleRate.label')"
										data-test-id="otel-sample-rate"
										@blur="commitSampleRate"
										@keydown.enter="commitSampleRate"
									/>
									<span :class="$style.slug">
										{{
											i18n.baseText('settings.opentelemetry.tracesSampleRate.slug', {
												interpolate: { max: sampleRateMax },
											})
										}}
									</span>
								</div>
							</template>
						</OtelSettingsRow>

						<OtelSettingsRow
							:title="i18n.baseText('settings.opentelemetry.includeNodeSpans.label')"
							:description="i18n.baseText('settings.opentelemetry.includeNodeSpans.description')"
							:env-tooltip="envTooltip('includeNodeSpans')"
						>
							<template #action>
								<N8nCheckbox
									:model-value="otelStore.settings.includeNodeSpans"
									:disabled="isEnvManaged('includeNodeSpans')"
									data-test-id="otel-include-node-spans"
									@update:model-value="otelStore.settings.includeNodeSpans = Boolean($event)"
								/>
							</template>
						</OtelSettingsRow>

						<OtelSettingsRow
							:title="i18n.baseText('settings.opentelemetry.injectOutbound.label')"
							:description="i18n.baseText('settings.opentelemetry.injectOutbound.description')"
							:env-tooltip="envTooltip('injectOutbound')"
						>
							<template #action>
								<N8nCheckbox
									:model-value="otelStore.settings.injectOutbound"
									:disabled="isEnvManaged('injectOutbound')"
									data-test-id="otel-inject-outbound"
									@update:model-value="otelStore.settings.injectOutbound = Boolean($event)"
								/>
							</template>
						</OtelSettingsRow>

						<OtelSettingsRow
							:title="i18n.baseText('settings.opentelemetry.productionExecutionsOnly.label')"
							:description="
								i18n.baseText('settings.opentelemetry.productionExecutionsOnly.description')
							"
							:env-tooltip="envTooltip('productionExecutionsOnly')"
						>
							<template #action>
								<N8nCheckbox
									:model-value="otelStore.settings.productionExecutionsOnly"
									:disabled="isEnvManaged('productionExecutionsOnly')"
									data-test-id="otel-production-only"
									@update:model-value="
										otelStore.settings.productionExecutionsOnly = Boolean($event)
									"
								/>
							</template>
						</OtelSettingsRow>
					</N8nSettingsRowGroup>
				</N8nSettingsSection>
			</div>
		</N8nSettingsLayout>

		<N8nSettingsSaveBar
			:visible="otelStore.isDirty"
			:message="i18n.baseText('settings.opentelemetry.unsavedChanges.title')"
			:save-label="i18n.baseText('settings.opentelemetry.save')"
			:discard-label="i18n.baseText('settings.opentelemetry.discard')"
			:saving="otelStore.saving"
			floating
			@save="save"
			@discard="discard"
		/>

		<N8nDialog
			v-model:open="showUnsavedChangesDialog"
			:header="i18n.baseText('settings.opentelemetry.unsavedChanges.title')"
			:description="i18n.baseText('settings.opentelemetry.unsavedChanges.message')"
			size="medium"
		>
			<div data-test-id="otel-unsaved-changes-dialog">
				<N8nDialogFooter>
					<N8nDialogClose as-child>
						<N8nButton
							variant="outline"
							:label="i18n.baseText('settings.opentelemetry.unsavedChanges.cancel')"
							@click="onKeepEditing"
						/>
					</N8nDialogClose>
					<N8nButton
						variant="outline"
						:label="i18n.baseText('settings.opentelemetry.unsavedChanges.leaveWithoutSaving')"
						@click="onLeaveWithoutSaving"
					/>
					<N8nButton
						variant="solid"
						:label="i18n.baseText('settings.opentelemetry.unsavedChanges.saveAndLeave')"
						:loading="otelStore.saving"
						@click="onSaveAndLeave"
					/>
				</N8nDialogFooter>
			</div>
		</N8nDialog>
	</div>
</template>

<style lang="scss" module>
// Flex-column wrapper with a viewport-based min-height: the sticky-footer half of the
// floating save bar contract (the bar carries margin-top: auto).
.page {
	display: flex;
	flex-direction: column;
	width: 100%;
	min-height: calc(100vh - var(--spacing--4xl));
}

.layout {
	padding-top: 0;
	// Extra bottom scroll padding so the last row can clear the floating save bar.
	padding-bottom: var(--spacing--3xl);
}

.settingsContent {
	display: flex;
	flex-direction: column;
	width: 100%;
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xl);
	color: var(--icon-color--subtle);
}

.control {
	width: 100%;
}

.headersBlock {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	width: 100%;
}

.headerRow {
	display: flex;
	align-items: flex-end;
	gap: var(--spacing--2xs);
	width: 100%;

	> div {
		flex: 1;
		min-width: 0;
	}
}

.headerRemove {
	display: flex;
	flex: 0 0 auto !important;
	align-items: center;
	justify-content: center;
	height: var(--height--lg);
}

.addHeaderButton {
	margin-top: var(--spacing--4xs);
}

.inputWithSlug {
	display: flex;
	align-items: stretch;

	// Compact numeric field: hug short values instead of filling the action area.
	// N8nInput exposes per-corner radius custom properties; square the right side
	// so the unit slug visually continues the input.
	> :first-child {
		--input--radius--top-right: 0;
		--input--radius--bottom-right: 0;

		width: var(--spacing--4xl);
		min-width: 0;
	}
}

.slug {
	display: inline-flex;
	align-items: center;
	padding: 0 var(--spacing--2xs);
	border: var(--border-width) solid var(--border-color);
	border-left: none;
	border-top-right-radius: var(--radius);
	border-bottom-right-radius: var(--radius);
	background: var(--background--hover);
	color: var(--text-color--subtle);
	font-size: var(--font-size--xs);
	white-space: nowrap;
}
</style>
