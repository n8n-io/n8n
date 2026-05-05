<script setup lang="ts">
import type { AgentScheduleConfig } from '@n8n/api-types';
import { N8nButton, N8nCard, N8nIcon, N8nInput, N8nSwitch2, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref } from 'vue';

import {
	activateScheduleIntegration,
	deactivateScheduleIntegration,
	getScheduleIntegration,
	updateScheduleIntegration,
} from '../composables/useAgentApi';

const props = withDefaults(
	defineProps<{
		projectId: string;
		agentId: string;
		isPublished: boolean;
		flat?: boolean;
	}>(),
	{ flat: false },
);

const emit = defineEmits<{
	'status-change': [configured: boolean];
	'trigger-added': [];
	saved: [];
}>();

const locale = useI18n();
const rootStore = useRootStore();

const active = ref(false);
const lastSavedActive = ref(false);
const cronExpression = ref('');
const wakeUpPrompt = ref('');
const loading = ref(false);
const saving = ref(false);
const cronErrorMessage = ref('');
const generalErrorMessage = ref('');
const lastSavedCronExpression = ref('');
const lastSavedWakeUpPrompt = ref('');

const isDirty = computed(
	() =>
		active.value !== lastSavedActive.value ||
		cronExpression.value !== lastSavedCronExpression.value ||
		wakeUpPrompt.value !== lastSavedWakeUpPrompt.value,
);
const isConfigured = computed(() => lastSavedCronExpression.value.trim() !== '');
const canSave = computed(
	() =>
		isDirty.value &&
		!loading.value &&
		!saving.value &&
		cronErrorMessage.value === '' &&
		(!active.value || (props.isPublished && cronExpression.value.trim() !== '')),
);

type ScheduleErrorKey =
	| 'agents.schedule.loadError'
	| 'agents.schedule.saveError'
	| 'agents.schedule.activateError'
	| 'agents.schedule.deactivateError';

function applyConfig(config: AgentScheduleConfig) {
	active.value = config.active;
	lastSavedActive.value = config.active;
	cronExpression.value = config.cronExpression;
	lastSavedCronExpression.value = config.cronExpression;
	wakeUpPrompt.value = config.wakeUpPrompt;
	lastSavedWakeUpPrompt.value = config.wakeUpPrompt;
	emit('status-change', config.cronExpression.trim() !== '');
}

function toErrorMessage(error: unknown, fallbackKey: ScheduleErrorKey): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	return locale.baseText(fallbackKey);
}

function isCronValidationError(message: string): boolean {
	return message === 'Invalid cron expression';
}

function setSaveError(error: unknown, fallbackKey: ScheduleErrorKey) {
	const message = toErrorMessage(error, fallbackKey);

	if (isCronValidationError(message)) {
		cronErrorMessage.value = message;
		return;
	}

	generalErrorMessage.value = message;
}

function clearErrors() {
	cronErrorMessage.value = '';
	generalErrorMessage.value = '';
}

async function loadConfig() {
	loading.value = true;
	clearErrors();

	try {
		const config = await getScheduleIntegration(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		applyConfig(config);
	} catch (error) {
		generalErrorMessage.value = toErrorMessage(error, 'agents.schedule.loadError');
	} finally {
		loading.value = false;
	}
}

async function saveCronConfig(overrides?: {
	cronExpression?: string;
	wakeUpPrompt?: string;
}): Promise<AgentScheduleConfig | null> {
	try {
		return await updateScheduleIntegration(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			{
				cronExpression: overrides?.cronExpression ?? cronExpression.value,
				wakeUpPrompt: overrides?.wakeUpPrompt ?? wakeUpPrompt.value,
			},
		);
	} catch (error) {
		setSaveError(error, 'agents.schedule.saveError');
		return null;
	}
}

async function onDisconnect() {
	if (!isConfigured.value || loading.value || saving.value) return;
	saving.value = true;
	clearErrors();

	try {
		await deactivateScheduleIntegration(rootStore.restApiContext, props.projectId, props.agentId);
		const config = await saveCronConfig({
			cronExpression: '',
			wakeUpPrompt: lastSavedWakeUpPrompt.value,
		});
		if (!config) return;
		applyConfig({ ...config, active: false, cronExpression: '' });
		emit('saved');
	} catch (error) {
		setSaveError(error, 'agents.schedule.deactivateError');
	} finally {
		saving.value = false;
	}
}

async function onSave() {
	if (!canSave.value) return;
	const wasConfigured = lastSavedCronExpression.value.trim() !== '';
	saving.value = true;
	clearErrors();

	try {
		let config: AgentScheduleConfig | null;
		if (active.value) {
			config = await saveCronConfig();
			if (!config) return;
			if (!config.active) {
				config = await activateScheduleIntegration(
					rootStore.restApiContext,
					props.projectId,
					props.agentId,
				);
			}
		} else {
			if (lastSavedActive.value) {
				config = await deactivateScheduleIntegration(
					rootStore.restApiContext,
					props.projectId,
					props.agentId,
				);
			}
			config = await saveCronConfig();
			if (!config) return;
		}

		applyConfig(config);
		if (!wasConfigured && config.cronExpression.trim() !== '') {
			emit('trigger-added');
		}
		emit('saved');
	} catch (error) {
		setSaveError(
			error,
			active.value ? 'agents.schedule.activateError' : 'agents.schedule.deactivateError',
		);
	} finally {
		saving.value = false;
	}
}

function onCancel() {
	active.value = lastSavedActive.value;
	cronExpression.value = lastSavedCronExpression.value;
	wakeUpPrompt.value = lastSavedWakeUpPrompt.value;
	clearErrors();
}

function onCronExpressionInput(value: string) {
	cronExpression.value = value;
	clearErrors();
}

function onWakeUpPromptInput(value: string) {
	wakeUpPrompt.value = value;
	clearErrors();
}

function onActiveInput(value: boolean) {
	active.value = value;
	clearErrors();
}

onMounted(() => {
	void loadConfig();
});
</script>

<template>
	<component :is="flat ? 'div' : N8nCard" :class="flat ? $style.flatBody : $style.card">
		<template v-if="!flat" #header>
			<div :class="$style.cardHeader">
				<div :class="$style.statusRow">
					<span
						:class="[$style.statusDot, active ? $style.statusConnected : $style.statusDisconnected]"
					/>
					<N8nText bold>{{ locale.baseText('agents.schedule.title') }}</N8nText>
					<N8nText :class="$style.statusLabel" size="small">
						{{
							active
								? locale.baseText('agents.schedule.status.active')
								: locale.baseText('agents.schedule.status.inactive')
						}}
					</N8nText>
				</div>
			</div>
		</template>

		<div :class="$style.cardBody">
			<N8nText :class="$style.description" size="small">
				{{ locale.baseText('agents.schedule.description') }}
			</N8nText>

			<div :class="$style.toggleRow">
				<N8nText size="small" bold>
					{{ locale.baseText('agents.schedule.status.active') }}
				</N8nText>
				<N8nSwitch2
					:model-value="active"
					:disabled="loading || saving"
					data-testid="schedule-active-toggle"
					@update:model-value="(value) => onActiveInput(Boolean(value))"
				/>
			</div>

			<div :class="$style.field">
				<N8nText size="small" bold>{{ locale.baseText('agents.schedule.cron') }}</N8nText>
				<N8nInput
					:model-value="cronExpression"
					:disabled="loading || saving"
					:placeholder="locale.baseText('agents.schedule.cron.placeholder')"
					data-testid="schedule-cron-input"
					@update:model-value="onCronExpressionInput"
				/>
				<N8nText
					v-if="cronErrorMessage"
					:class="$style.errorText"
					size="small"
					data-testid="schedule-cron-error"
				>
					{{ cronErrorMessage }}
				</N8nText>
			</div>

			<div :class="$style.field">
				<N8nText size="small" bold>
					{{ locale.baseText('agents.schedule.wakeUpPrompt') }}
				</N8nText>
				<N8nInput
					:model-value="wakeUpPrompt"
					type="textarea"
					:rows="3"
					:disabled="loading || saving"
					:placeholder="locale.baseText('agents.schedule.wakeUpPrompt.placeholder')"
					data-testid="schedule-wake-up-prompt-input"
					@update:model-value="onWakeUpPromptInput"
				/>
				<N8nText :class="$style.helpText" size="small">
					{{ locale.baseText('agents.schedule.wakeUpPrompt.help') }}
				</N8nText>
			</div>

			<N8nText v-if="active && !isPublished" :class="$style.helpText" size="small">
				{{ locale.baseText('agents.schedule.publishRequired') }}
			</N8nText>

			<N8nText v-if="generalErrorMessage" :class="$style.errorText" size="small">
				{{ generalErrorMessage }}
			</N8nText>

			<div :class="$style.actions">
				<N8nButton
					v-if="isConfigured"
					variant="destructive"
					:disabled="loading || saving"
					data-testid="schedule-disconnect-button"
					@click="onDisconnect"
				>
					<template #prefix><N8nIcon icon="unlink" size="xsmall" /></template>
					{{ locale.baseText('agents.builder.addTrigger.disconnect') }}
				</N8nButton>
				<div :class="$style.saveActions">
					<N8nButton variant="subtle" data-testid="schedule-cancel-button" @click="onCancel">
						{{ locale.baseText('generic.cancel') }}
					</N8nButton>
					<N8nButton
						variant="solid"
						:disabled="!canSave"
						:loading="saving"
						data-testid="schedule-save-button"
						@click="onSave"
					>
						{{ locale.baseText('generic.save') }}
					</N8nButton>
				</div>
			</div>
		</div>
	</component>
</template>

<style module>
.card {
	width: 100%;
	margin-bottom: var(--spacing--sm);
}

.flatBody {
	width: 100%;
}

.cardHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.statusRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.statusDot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
}

.statusConnected {
	background-color: var(--color--success);
}

.statusDisconnected {
	background-color: var(--color--foreground--shade-1);
}

.statusLabel {
	color: var(--color--text--tint-2);
}

.cardBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.description,
.helpText {
	color: var(--color--text--tint-1);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.toggleRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.actions {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
}

.saveActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	margin-left: auto;
}

.errorText {
	color: var(--color--danger);
}
</style>
