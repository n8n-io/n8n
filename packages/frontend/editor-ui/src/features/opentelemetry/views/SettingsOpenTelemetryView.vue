<script lang="ts" setup>
import { onMounted, ref, computed } from 'vue';
import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nText,
} from '@n8n/design-system';
import { ElSwitch, ElCheckbox } from 'element-plus';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/app/composables/useToast';
import { useOpenTelemetryStore } from '../opentelemetry.store';
import type { OtelSettings } from '../opentelemetry.store';

const i18n = useI18n();
const { showToast, showError } = useToast();
const store = useOpenTelemetryStore();

// Local editable copy of settings
const form = ref<OtelSettings>({
	enabled: false,
	exporterEndpoint: 'http://localhost:4318',
	exporterTracingPath: '/v1/traces',
	exporterHeaders: [],
	exporterServiceName: 'n8n',
	tracesSampleRate: 1,
	startupConnectivityTimeoutMs: 2000,
	includeNodeSpans: true,
	injectOutbound: true,
	publishedOnly: true,
});

const lastTestSentAtFormatted = computed(() => {
	if (!store.lastTestSentAt) return null;
	return new Date(store.lastTestSentAt).toLocaleTimeString();
});

onMounted(async () => {
	try {
		await store.fetchSettings();
		if (store.settings) {
			form.value = { ...store.settings };
		}
	} catch (error) {
		showError(error, i18n.baseText('settings.opentelemetry.title'));
	}
});

async function save() {
	try {
		await store.saveSettings(form.value);
		showToast({
			type: 'success',
			title: i18n.baseText('settings.opentelemetry.saved'),
			message: '',
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.opentelemetry.title'));
	}
}

async function onSendTestTrace() {
	try {
		await store.sendTestTrace();
	} catch (error) {
		showError(error, i18n.baseText('settings.opentelemetry.testTrace.label'));
	}
}

function addHeader() {
	form.value.exporterHeaders = [...form.value.exporterHeaders, { key: '', value: '' }];
}

function removeHeader(index: number) {
	form.value.exporterHeaders = form.value.exporterHeaders.filter((_, i) => i !== index);
}
</script>

<template>
	<div :class="$style.container">
		<N8nHeading size="2xlarge" tag="h1">
			{{ i18n.baseText('settings.opentelemetry.title') }}
		</N8nHeading>
		<N8nText color="text-base" :class="$style.description">
			{{ i18n.baseText('settings.opentelemetry.description') }}
		</N8nText>

		<div :class="$style.card">
			<!-- Enable toggle -->
			<div :class="$style.row">
				<div :class="$style.rowLabel">
					<N8nText size="medium" bold>
						{{ i18n.baseText('settings.opentelemetry.enable.label') }}
					</N8nText>
					<N8nText size="small" color="text-base">
						{{ i18n.baseText('settings.opentelemetry.enable.description') }}
					</N8nText>
				</div>
				<ElSwitch v-model="form.enabled" />
			</div>
		</div>

		<!-- Collector connection -->
		<div :class="$style.section">
			<N8nHeading size="medium" tag="h2" :class="$style.sectionTitle">
				{{ i18n.baseText('settings.opentelemetry.section.collector') }}
			</N8nHeading>

			<div :class="$style.card">
				<!-- OTLP endpoint -->
				<div :class="$style.row">
					<div :class="$style.rowLabel">
						<N8nText size="medium" bold>
							{{ i18n.baseText('settings.opentelemetry.exporterEndpoint.label') }}
						</N8nText>
						<N8nText size="small" color="text-base">
							{{ i18n.baseText('settings.opentelemetry.exporterEndpoint.description') }}
						</N8nText>
					</div>
					<N8nInput
						v-model="form.exporterEndpoint"
						:class="$style.input"
						placeholder="https://domain.com"
						data-testid="otel-endpoint-input"
					/>
				</div>

				<!-- Service name -->
				<div :class="$style.row">
					<div :class="$style.rowLabel">
						<N8nText size="medium" bold>
							{{ i18n.baseText('settings.opentelemetry.exporterServiceName.label') }}
						</N8nText>
						<N8nText size="small" color="text-base">
							{{ i18n.baseText('settings.opentelemetry.exporterServiceName.description') }}
						</N8nText>
					</div>
					<N8nInput
						v-model="form.exporterServiceName"
						:class="$style.input"
						data-testid="otel-service-name-input"
					/>
				</div>

				<!-- Custom headers -->
				<div :class="$style.headerSection">
					<div :class="$style.rowLabel">
						<N8nText size="medium" bold>
							{{ i18n.baseText('settings.opentelemetry.exporterHeaders.label') }}
						</N8nText>
						<N8nText size="small" color="text-base">
							{{ i18n.baseText('settings.opentelemetry.exporterHeaders.description') }}
						</N8nText>
					</div>
					<div v-if="form.exporterHeaders.length > 0" :class="$style.headerColumns">
						<N8nText size="small" color="text-base">
							{{ i18n.baseText('settings.opentelemetry.exporterHeaders.keyPlaceholder') }}
						</N8nText>
						<N8nText size="small" color="text-base">
							{{ i18n.baseText('settings.opentelemetry.exporterHeaders.valuePlaceholder') }}
						</N8nText>
					</div>
					<div
						v-for="(header, index) in form.exporterHeaders"
						:key="index"
						:class="$style.headerRow"
					>
						<N8nInput
							v-model="header.key"
							:placeholder="i18n.baseText('settings.opentelemetry.exporterHeaders.keyPlaceholder')"
							data-testid="otel-header-key-input"
						/>
						<N8nInput
							v-model="header.value"
							:placeholder="
								i18n.baseText('settings.opentelemetry.exporterHeaders.valuePlaceholder')
							"
							data-testid="otel-header-value-input"
						/>
						<N8nButton type="tertiary" icon="trash" size="small" @click="removeHeader(index)" />
					</div>
					<N8nButton
						type="tertiary"
						size="small"
						icon="plus"
						data-testid="otel-add-header-button"
						@click="addHeader"
					>
						{{ i18n.baseText('settings.opentelemetry.exporterHeaders.addButton') }}
					</N8nButton>
				</div>

				<!-- Trace path -->
				<div :class="$style.row">
					<div :class="$style.rowLabel">
						<N8nText size="medium" bold>
							{{ i18n.baseText('settings.opentelemetry.exporterTracingPath.label') }}
						</N8nText>
						<N8nText size="small" color="text-base">
							{{ i18n.baseText('settings.opentelemetry.exporterTracingPath.description') }}
						</N8nText>
					</div>
					<N8nInput
						v-model="form.exporterTracingPath"
						:class="$style.input"
						data-testid="otel-trace-path-input"
					/>
				</div>

				<!-- Startup connectivity timeout -->
				<div :class="$style.row">
					<div :class="$style.rowLabel">
						<N8nText size="medium" bold>
							{{ i18n.baseText('settings.opentelemetry.startupConnectivityTimeoutMs.label') }}
						</N8nText>
						<N8nText size="small" color="text-base">
							{{ i18n.baseText('settings.opentelemetry.startupConnectivityTimeoutMs.description') }}
						</N8nText>
					</div>
					<div :class="$style.timeoutRow">
						<N8nInput
							v-model="form.startupConnectivityTimeoutMs"
							type="number"
							:class="$style.timeoutInput"
							data-testid="otel-timeout-input"
						/>
						<N8nText size="small" color="text-base">ms</N8nText>
					</div>
				</div>

				<!-- Verify configuration / test trace -->
				<div :class="$style.row">
					<div :class="$style.rowLabel">
						<N8nText size="medium" bold>
							{{ i18n.baseText('settings.opentelemetry.testTrace.label') }}
						</N8nText>
						<N8nText v-if="lastTestSentAtFormatted" size="small" color="text-base">
							{{
								i18n.baseText('settings.opentelemetry.testTrace.sent', {
									interpolate: { time: lastTestSentAtFormatted },
								})
							}}
						</N8nText>
					</div>
					<N8nButton
						type="secondary"
						:loading="store.isSendingTestTrace"
						data-testid="otel-send-test-trace-button"
						@click="onSendTestTrace"
					>
						{{ i18n.baseText('settings.opentelemetry.testTrace.button') }}
					</N8nButton>
				</div>
			</div>
		</div>

		<!-- Tracing -->
		<div :class="$style.section">
			<N8nHeading size="medium" tag="h2" :class="$style.sectionTitle">
				{{ i18n.baseText('settings.opentelemetry.section.tracing') }}
			</N8nHeading>

			<div :class="$style.card">
				<!-- Trace sample rate -->
				<div :class="$style.row">
					<div :class="$style.rowLabel">
						<N8nText size="medium" bold>
							{{ i18n.baseText('settings.opentelemetry.tracesSampleRate.label') }}
						</N8nText>
						<N8nText size="small" color="text-base">
							{{ i18n.baseText('settings.opentelemetry.tracesSampleRate.description') }}
						</N8nText>
					</div>
					<N8nInput
						v-model="form.tracesSampleRate"
						type="number"
						:class="$style.input"
						data-testid="otel-sample-rate-input"
					/>
				</div>

				<!-- Include node spans -->
				<div :class="$style.checkboxRow">
					<div :class="$style.rowLabel">
						<N8nText size="medium" bold>
							{{ i18n.baseText('settings.opentelemetry.includeNodeSpans.label') }}
						</N8nText>
						<N8nText size="small" color="text-base">
							{{ i18n.baseText('settings.opentelemetry.includeNodeSpans.description') }}
						</N8nText>
					</div>
					<ElCheckbox v-model="form.includeNodeSpans" data-testid="otel-include-node-spans" />
				</div>

				<!-- Inject outbound traceparent -->
				<div :class="$style.checkboxRow">
					<div :class="$style.rowLabel">
						<N8nText size="medium" bold>
							{{ i18n.baseText('settings.opentelemetry.injectOutbound.label') }}
						</N8nText>
						<N8nText size="small" color="text-base">
							{{ i18n.baseText('settings.opentelemetry.injectOutbound.description') }}
						</N8nText>
					</div>
					<ElCheckbox v-model="form.injectOutbound" data-testid="otel-inject-outbound" />
				</div>

				<!-- Track published workflows only -->
				<div :class="$style.checkboxRow">
					<div :class="$style.rowLabel">
						<N8nText size="medium" bold>
							{{ i18n.baseText('settings.opentelemetry.publishedOnly.label') }}
						</N8nText>
						<N8nText size="small" color="text-base">
							{{ i18n.baseText('settings.opentelemetry.publishedOnly.description') }}
						</N8nText>
					</div>
					<ElCheckbox v-model="form.publishedOnly" data-testid="otel-published-only" />
				</div>
			</div>
		</div>

		<!-- Save button -->
		<div :class="$style.footer">
			<N8nButton
				type="primary"
				:loading="store.isSaving"
				data-testid="otel-save-button"
				@click="save"
			>
				{{
					store.isSaving
						? i18n.baseText('settings.opentelemetry.saving')
						: i18n.baseText('settings.opentelemetry.save')
				}}
			</N8nButton>
		</div>
	</div>
</template>

<style module>
.container {
	max-width: var(--content-container-width);
	padding: var(--spacing-2xl) var(--spacing-l);
}

.description {
	display: block;
	margin-top: var(--spacing-2xs);
	margin-bottom: var(--spacing-l);
}

.section {
	margin-top: var(--spacing-xl);
}

.sectionTitle {
	margin-bottom: var(--spacing-s);
}

.card {
	background: var(--color-background-xlight);
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
	padding: var(--spacing-m) var(--spacing-l);
}

.row {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing-m);
	padding: var(--spacing-s) 0;
	border-bottom: 1px solid var(--color-foreground-base);
}

.row:last-child {
	border-bottom: none;
}

.checkboxRow {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing-m);
	padding: var(--spacing-s) 0;
	border-bottom: 1px solid var(--color-foreground-base);
}

.checkboxRow:last-child {
	border-bottom: none;
}

.rowLabel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-3xs);
	flex: 1;
}

.input {
	min-width: 240px;
}

.timeoutRow {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
}

.timeoutInput {
	width: 100px;
}

.headerSection {
	padding: var(--spacing-s) 0;
	border-bottom: 1px solid var(--color-foreground-base);
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
}

.headerColumns {
	display: grid;
	grid-template-columns: 1fr 1fr auto;
	gap: var(--spacing-s);
}

.headerRow {
	display: grid;
	grid-template-columns: 1fr 1fr auto;
	gap: var(--spacing-s);
	align-items: center;
}

.footer {
	margin-top: var(--spacing-l);
	display: flex;
	justify-content: flex-start;
}
</style>
