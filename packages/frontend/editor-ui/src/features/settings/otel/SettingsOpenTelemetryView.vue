<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { onBeforeRouteLeave, type NavigationGuardNext } from 'vue-router';
import { ElDialog } from 'element-plus';
import {
	N8nButton,
	N8nCheckbox,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nInputNumber,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useOtelStore, headersStringToPairs, headersPairsToString } from './otel.store';
import { OTEL_FIELD_ENV_VARS, OTEL_TEST_SPAN_NAME } from './otel.constants';

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
	return i18n.baseText('settings.opentelemetry.envVarTooltip', {
		interpolate: { envVar: OTEL_FIELD_ENV_VARS[field] },
	});
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
	<div class="pb-2xl">
		<div :class="$style.heading">
			<N8nHeading size="2xlarge">
				{{ i18n.baseText('settings.opentelemetry.title') }}
			</N8nHeading>
		</div>
		<p :class="$style.description">
			{{ i18n.baseText('settings.opentelemetry.description') }}
			<a
				:class="$style.docsLink"
				href="https://docs.n8n.io/hosting/logging-monitoring/opentelemetry/"
				target="_blank"
			>
				{{ i18n.baseText('settings.opentelemetry.docsLink')
				}}<N8nIcon icon="arrow-up-right" size="xsmall" />
			</a>
		</p>

		<div v-if="otelStore.loading" :class="$style.loading" data-test-id="otel-loading">
			<N8nIcon icon="spinner" spin />
		</div>

		<template v-if="!otelStore.loading">
			<!-- Enable toggle -->
			<div :class="$style.card">
				<div :class="$style.settingsItem">
					<div :class="$style.settingsItemLabel">
						<div :class="$style.labelRow">
							<label>{{ i18n.baseText('settings.opentelemetry.enable.label') }}</label>
							<N8nTooltip
								placement="top"
								content-class="otel-tooltip"
								:content="envTooltip('enabled')"
							>
								<N8nIcon icon="circle-help" size="small" />
							</N8nTooltip>
						</div>
						<small>{{ i18n.baseText('settings.opentelemetry.enable.description') }}</small>
					</div>
					<div :class="$style.settingsItemControl">
						<component
							:is="isEnvManaged('enabled') ? N8nTooltip : 'span'"
							v-bind="
								isEnvManaged('enabled')
									? { content: i18n.baseText('settings.opentelemetry.envVarManagedTooltip') }
									: {}
							"
						>
							<N8nSelect
								:model-value="otelStore.settings.enabled ? 'enabled' : 'disabled'"
								size="medium"
								data-test-id="otel-enabled-toggle"
								:disabled="isEnvManaged('enabled')"
								@update:model-value="otelStore.settings.enabled = $event === 'enabled'"
							>
								<template #prefix>
									<span v-if="otelStore.settings.enabled" :class="$style.greenDot" />
								</template>
								<N8nOption
									value="enabled"
									:label="i18n.baseText('settings.opentelemetry.enable.option.enabled')"
								/>
								<N8nOption
									value="disabled"
									:label="i18n.baseText('settings.opentelemetry.enable.option.disabled')"
								/>
							</N8nSelect>
						</component>
					</div>
				</div>
			</div>

			<!-- Collector connection section -->
			<N8nHeading tag="h2" size="medium" :class="$style.sectionHeading">
				{{ i18n.baseText('settings.opentelemetry.collectorConnection.title') }}
			</N8nHeading>
			<div :class="$style.card">
				<div :class="$style.settingsItem">
					<div :class="$style.settingsItemLabel">
						<div :class="$style.labelRow">
							<label>{{ i18n.baseText('settings.opentelemetry.exporterEndpoint.label') }}</label>
							<N8nTooltip
								placement="top"
								content-class="otel-tooltip"
								:content="envTooltip('exporterEndpoint')"
							>
								<N8nIcon icon="circle-help" size="small" />
							</N8nTooltip>
						</div>
						<small>{{
							i18n.baseText('settings.opentelemetry.exporterEndpoint.description')
						}}</small>
					</div>
					<div :class="$style.settingsItemControl">
						<component
							:is="isEnvManaged('exporterEndpoint') ? N8nTooltip : 'span'"
							v-bind="
								isEnvManaged('exporterEndpoint')
									? { content: i18n.baseText('settings.opentelemetry.envVarManagedTooltip') }
									: {}
							"
						>
							<N8nInput
								v-model="otelStore.settings.exporterEndpoint"
								:placeholder="i18n.baseText('settings.opentelemetry.exporterEndpoint.placeholder')"
								:disabled="isEnvManaged('exporterEndpoint')"
								data-test-id="otel-exporter-endpoint"
							/>
						</component>
					</div>
				</div>

				<div :class="$style.settingsItem">
					<div :class="$style.settingsItemLabel">
						<div :class="$style.labelRow">
							<label>{{ i18n.baseText('settings.opentelemetry.exporterServiceName.label') }}</label>
							<N8nTooltip
								placement="top"
								content-class="otel-tooltip"
								:content="envTooltip('exporterServiceName')"
							>
								<N8nIcon icon="circle-help" size="small" />
							</N8nTooltip>
						</div>
						<small>{{
							i18n.baseText('settings.opentelemetry.exporterServiceName.description')
						}}</small>
					</div>
					<div :class="$style.settingsItemControl">
						<component
							:is="isEnvManaged('exporterServiceName') ? N8nTooltip : 'span'"
							v-bind="
								isEnvManaged('exporterServiceName')
									? { content: i18n.baseText('settings.opentelemetry.envVarManagedTooltip') }
									: {}
							"
						>
							<N8nInput
								v-model="otelStore.settings.exporterServiceName"
								:placeholder="
									i18n.baseText('settings.opentelemetry.exporterServiceName.placeholder')
								"
								:disabled="isEnvManaged('exporterServiceName')"
								data-test-id="otel-service-name"
							/>
						</component>
					</div>
				</div>

				<!-- Custom headers — full-width block (key/value pairs) -->
				<div :class="[$style.settingsItem, $style.settingsItemVertical]">
					<div :class="$style.settingsItemLabel">
						<div :class="$style.labelRow">
							<label>{{ i18n.baseText('settings.opentelemetry.exporterHeaders.label') }}</label>
							<N8nTooltip
								placement="top"
								content-class="otel-tooltip"
								:content="envTooltip('exporterHeaders')"
							>
								<N8nIcon icon="circle-help" size="small" />
							</N8nTooltip>
						</div>
						<small>{{ i18n.baseText('settings.opentelemetry.exporterHeaders.description') }}</small>
					</div>
					<component
						:is="isEnvManaged('exporterHeaders') ? N8nTooltip : 'span'"
						v-bind="
							isEnvManaged('exporterHeaders')
								? { content: i18n.baseText('settings.opentelemetry.envVarManagedTooltip') }
								: {}
						"
					>
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
								class="mt-2xs"
								data-test-id="otel-header-add"
								@click.stop.prevent="addHeader"
							>
								{{ i18n.baseText('settings.opentelemetry.exporterHeaders.addHeader') }}
							</N8nButton>
						</div>
					</component>
				</div>

				<div :class="$style.settingsItem">
					<div :class="$style.settingsItemLabel">
						<div :class="$style.labelRow">
							<label>{{ i18n.baseText('settings.opentelemetry.exporterTracingPath.label') }}</label>
							<N8nTooltip
								placement="top"
								content-class="otel-tooltip"
								:content="envTooltip('exporterTracingPath')"
							>
								<N8nIcon icon="circle-help" size="small" />
							</N8nTooltip>
						</div>
						<small>{{
							i18n.baseText('settings.opentelemetry.exporterTracingPath.description')
						}}</small>
					</div>
					<div :class="$style.settingsItemControl">
						<component
							:is="isEnvManaged('exporterTracingPath') ? N8nTooltip : 'span'"
							v-bind="
								isEnvManaged('exporterTracingPath')
									? { content: i18n.baseText('settings.opentelemetry.envVarManagedTooltip') }
									: {}
							"
						>
							<N8nInput
								v-model="otelStore.settings.exporterTracingPath"
								:placeholder="
									i18n.baseText('settings.opentelemetry.exporterTracingPath.placeholder')
								"
								:disabled="isEnvManaged('exporterTracingPath')"
								data-test-id="otel-tracing-path"
							/>
						</component>
					</div>
				</div>

				<div :class="$style.settingsItem">
					<div :class="$style.settingsItemLabel">
						<div :class="$style.labelRow">
							<label>{{
								i18n.baseText('settings.opentelemetry.startupConnectivityTimeoutMs.label')
							}}</label>
							<N8nTooltip
								placement="top"
								content-class="otel-tooltip"
								:content="envTooltip('startupConnectivityTimeoutMs')"
							>
								<N8nIcon icon="circle-help" size="small" />
							</N8nTooltip>
						</div>
						<small>{{
							i18n.baseText('settings.opentelemetry.startupConnectivityTimeoutMs.description')
						}}</small>
					</div>
					<div :class="$style.settingsItemControl">
						<component
							:is="isEnvManaged('startupConnectivityTimeoutMs') ? N8nTooltip : 'span'"
							v-bind="
								isEnvManaged('startupConnectivityTimeoutMs')
									? { content: i18n.baseText('settings.opentelemetry.envVarManagedTooltip') }
									: {}
							"
						>
							<div :class="$style.inputWithSlug">
								<N8nInputNumber
									:model-value="otelStore.settings.startupConnectivityTimeoutMs"
									:min="0"
									:step="100"
									:controls="false"
									:disabled="isEnvManaged('startupConnectivityTimeoutMs')"
									data-test-id="otel-connectivity-timeout"
									@update:model-value="
										otelStore.settings.startupConnectivityTimeoutMs = Number($event)
									"
								/>
								<span :class="$style.slug">{{
									i18n.baseText('settings.opentelemetry.startupConnectivityTimeoutMs.slug')
								}}</span>
							</div>
						</component>
					</div>
				</div>

				<!-- Verify configuration / send test trace -->
				<div :class="$style.settingsItem">
					<div :class="$style.settingsItemLabel">
						<div :class="$style.labelRow">
							<label>{{ i18n.baseText('settings.opentelemetry.testTrace.label') }}</label>
						</div>
						<small :class="{ [$style.testError]: otelStore.testState === 'error' }">{{
							testTraceSubtitle
						}}</small>
					</div>
					<div :class="$style.settingsItemControl">
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
					</div>
				</div>
			</div>

			<!-- Tracing section -->
			<N8nHeading tag="h2" size="medium" :class="$style.sectionHeading">
				{{ i18n.baseText('settings.opentelemetry.tracing.title') }}
			</N8nHeading>
			<div :class="$style.card">
				<div :class="$style.settingsItem">
					<div :class="$style.settingsItemLabel">
						<div :class="$style.labelRow">
							<label>{{ i18n.baseText('settings.opentelemetry.tracesSampleRate.label') }}</label>
							<N8nTooltip
								placement="top"
								content-class="otel-tooltip"
								:content="envTooltip('tracesSampleRate')"
							>
								<N8nIcon icon="circle-help" size="small" />
							</N8nTooltip>
						</div>
						<small>{{
							i18n.baseText('settings.opentelemetry.tracesSampleRate.description')
						}}</small>
					</div>
					<div :class="$style.settingsItemControl">
						<component
							:is="isEnvManaged('tracesSampleRate') ? N8nTooltip : 'span'"
							v-bind="
								isEnvManaged('tracesSampleRate')
									? { content: i18n.baseText('settings.opentelemetry.envVarManagedTooltip') }
									: {}
							"
						>
							<div :class="$style.inputWithSlug">
								<N8nInputNumber
									:model-value="otelStore.settings.tracesSampleRate"
									:min="0"
									:max="1"
									:step="0.01"
									:precision="2"
									:controls="false"
									:disabled="isEnvManaged('tracesSampleRate')"
									data-test-id="otel-sample-rate"
									@update:model-value="otelStore.settings.tracesSampleRate = Number($event)"
								/>
								<span :class="$style.slug">{{
									i18n.baseText('settings.opentelemetry.tracesSampleRate.slug')
								}}</span>
							</div>
						</component>
					</div>
				</div>

				<div :class="$style.settingsItem">
					<div :class="$style.settingsItemLabel">
						<div :class="$style.labelRow">
							<label>{{ i18n.baseText('settings.opentelemetry.includeNodeSpans.label') }}</label>
							<N8nTooltip
								placement="top"
								content-class="otel-tooltip"
								:content="envTooltip('includeNodeSpans')"
							>
								<N8nIcon icon="circle-help" size="small" />
							</N8nTooltip>
						</div>
						<small>{{
							i18n.baseText('settings.opentelemetry.includeNodeSpans.description')
						}}</small>
					</div>
					<div :class="$style.settingsItemControl">
						<component
							:is="isEnvManaged('includeNodeSpans') ? N8nTooltip : 'span'"
							v-bind="
								isEnvManaged('includeNodeSpans')
									? { content: i18n.baseText('settings.opentelemetry.envVarManagedTooltip') }
									: {}
							"
						>
							<N8nCheckbox
								:model-value="otelStore.settings.includeNodeSpans"
								:disabled="isEnvManaged('includeNodeSpans')"
								data-test-id="otel-include-node-spans"
								@update:model-value="otelStore.settings.includeNodeSpans = Boolean($event)"
							/>
						</component>
					</div>
				</div>

				<div :class="$style.settingsItem">
					<div :class="$style.settingsItemLabel">
						<div :class="$style.labelRow">
							<label>{{ i18n.baseText('settings.opentelemetry.injectOutbound.label') }}</label>
							<N8nTooltip
								placement="top"
								content-class="otel-tooltip"
								:content="envTooltip('injectOutbound')"
							>
								<N8nIcon icon="circle-help" size="small" />
							</N8nTooltip>
						</div>
						<small>{{ i18n.baseText('settings.opentelemetry.injectOutbound.description') }}</small>
					</div>
					<div :class="$style.settingsItemControl">
						<component
							:is="isEnvManaged('injectOutbound') ? N8nTooltip : 'span'"
							v-bind="
								isEnvManaged('injectOutbound')
									? { content: i18n.baseText('settings.opentelemetry.envVarManagedTooltip') }
									: {}
							"
						>
							<N8nCheckbox
								:model-value="otelStore.settings.injectOutbound"
								:disabled="isEnvManaged('injectOutbound')"
								data-test-id="otel-inject-outbound"
								@update:model-value="otelStore.settings.injectOutbound = Boolean($event)"
							/>
						</component>
					</div>
				</div>

				<div :class="$style.settingsItem">
					<div :class="$style.settingsItemLabel">
						<div :class="$style.labelRow">
							<label>{{
								i18n.baseText('settings.opentelemetry.productionExecutionsOnly.label')
							}}</label>
							<N8nTooltip
								placement="top"
								content-class="otel-tooltip"
								:content="envTooltip('productionExecutionsOnly')"
							>
								<N8nIcon icon="circle-help" size="small" />
							</N8nTooltip>
						</div>
						<small>{{
							i18n.baseText('settings.opentelemetry.productionExecutionsOnly.description')
						}}</small>
					</div>
					<div :class="$style.settingsItemControl">
						<component
							:is="isEnvManaged('productionExecutionsOnly') ? N8nTooltip : 'span'"
							v-bind="
								isEnvManaged('productionExecutionsOnly')
									? { content: i18n.baseText('settings.opentelemetry.envVarManagedTooltip') }
									: {}
							"
						>
							<N8nCheckbox
								:model-value="otelStore.settings.productionExecutionsOnly"
								:disabled="isEnvManaged('productionExecutionsOnly')"
								data-test-id="otel-production-only"
								@update:model-value="otelStore.settings.productionExecutionsOnly = Boolean($event)"
							/>
						</component>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div :class="$style.footer">
				<N8nButton
					:label="i18n.baseText('settings.opentelemetry.save')"
					:loading="otelStore.saving"
					:disabled="!otelStore.isDirty"
					size="large"
					data-test-id="otel-save-button"
					@click="save"
				/>
				<N8nButton
					variant="outline"
					:label="i18n.baseText('settings.opentelemetry.discard')"
					:disabled="!otelStore.isDirty || otelStore.saving"
					size="large"
					data-test-id="otel-discard-button"
					@click="discard"
				/>
			</div>
		</template>

		<ElDialog
			v-model="showUnsavedChangesDialog"
			:title="i18n.baseText('settings.opentelemetry.unsavedChanges.title')"
			width="500"
			data-test-id="otel-unsaved-changes-dialog"
		>
			<N8nText>{{ i18n.baseText('settings.opentelemetry.unsavedChanges.message') }}</N8nText>
			<template #footer>
				<div :class="$style.dialogFooter">
					<N8nButton variant="ghost" @click="onKeepEditing">
						{{ i18n.baseText('settings.opentelemetry.unsavedChanges.cancel') }}
					</N8nButton>
					<N8nButton variant="outline" @click="onLeaveWithoutSaving">
						{{ i18n.baseText('settings.opentelemetry.unsavedChanges.leaveWithoutSaving') }}
					</N8nButton>
					<N8nButton type="primary" @click="onSaveAndLeave">
						{{ i18n.baseText('settings.opentelemetry.unsavedChanges.saveAndLeave') }}
					</N8nButton>
				</div>
			</template>
		</ElDialog>
	</div>
</template>

<style lang="scss" module>
.heading {
	margin-bottom: var(--spacing--2xs);
}

.description {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--xl);
	margin: 0 0 var(--spacing--lg);
}

.docsLink {
	text-decoration: underline;
	color: inherit;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);

	&:hover {
		color: var(--color--primary);
	}
}

.loading {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xl);
	color: var(--color--text--tint-1);
}

.sectionHeading {
	display: block;
	margin: var(--spacing--lg) 0 var(--spacing--2xs);
}

.card {
	background: var(--color--foreground--tint-2);
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	padding: var(--spacing--4xs) var(--spacing--sm);
	margin-bottom: var(--spacing--sm);
}

.settingsItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	min-height: 64px;
	padding: var(--spacing--xs) 0;
	border-bottom: var(--border-width) var(--border-style) var(--color--foreground--tint-1);

	&:last-child {
		border-bottom: none;
	}
}

.settingsItemVertical {
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--2xs);
}

.settingsItemLabel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;

	label {
		font-size: var(--font-size--sm);
		font-weight: var(--font-weight--medium);
		color: var(--color--text--shade-1);
	}

	small {
		font-size: var(--font-size--xs);
		font-weight: var(--font-weight--regular);
		line-height: var(--line-height--lg);
		color: var(--color--text--tint-1);
	}

	svg {
		display: inline-flex;
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	&:hover svg {
		opacity: 1;
	}
}

.labelRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--color--text--tint-1);
}

.slug {
	display: inline-flex;
	align-items: center;
	padding: 0 var(--spacing--2xs);
	border: var(--border);
	border-left: none;
	border-top-right-radius: var(--radius);
	border-bottom-right-radius: var(--radius);
	background: var(--color--foreground--tint-1);
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-1);
	white-space: nowrap;
}

.settingsItemControl {
	width: 280px;
	flex-shrink: 0;
	display: flex;
	justify-content: flex-end;

	.inputWithSlug {
		display: inline-flex;
		align-items: stretch;
		width: auto;

		& input {
			border-top-right-radius: 0;
			border-bottom-right-radius: 0;
		}
	}
}

.headersBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.headerRow:first-child {
	margin-top: var(--spacing--xs);
}

.headerRow {
	display: flex;
	gap: var(--spacing--2xs);
	align-items: flex-end;

	> div {
		flex: 1;
		min-width: 0;
	}
}

.headerRemove {
	flex: 0 0 auto !important;
	display: flex;
	align-items: center;
	justify-content: center;
	height: var(--height--lg);
}

.settingsItemLabel small.testError {
	color: var(--color--danger);
}

.greenDot {
	display: inline-block;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background-color: var(--color--success);
	margin-left: 4px;
}

.footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--lg);
}

.dialogFooter {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

:global(.otel-tooltip) {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	line-height: 18px;
	word-break: break-word;
	overflow-wrap: anywhere;
}
</style>
