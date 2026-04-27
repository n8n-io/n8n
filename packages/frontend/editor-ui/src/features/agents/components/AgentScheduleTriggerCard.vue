<script setup lang="ts">
import { DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT } from '@n8n/api-types';
import { N8nButton, N8nCard, N8nInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useDebounceFn } from '@vueuse/core';
import { computed, onMounted, ref, watch } from 'vue';

import {
	activateScheduleIntegration,
	deactivateScheduleIntegration,
	getScheduleIntegration,
	updateScheduleIntegration,
} from '../composables/useAgentApi';

const props = defineProps<{
	projectId: string;
	agentId: string;
	isPublished: boolean;
}>();

const emit = defineEmits<{
	'status-change': [active: boolean];
	'trigger-added': [];
}>();

const locale = useI18n();
const rootStore = useRootStore();

const active = ref(false);
const cronExpression = ref('');
const wakeUpPrompt = ref(DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT);
const loading = ref(false);
const saving = ref(false);
const hydrating = ref(true);
const cronErrorMessage = ref('');
const generalErrorMessage = ref('');
const lastSavedCronExpression = ref('');
const lastSavedWakeUpPrompt = ref(DEFAULT_AGENT_SCHEDULE_WAKE_UP_PROMPT);

const timezone = computed(() => rootStore.timezone || 'UTC');
const activateDisabled = computed(
	() =>
		!props.isPublished ||
		cronExpression.value.trim() === '' ||
		loading.value ||
		saving.value ||
		cronErrorMessage.value !== '' ||
		generalErrorMessage.value !== '',
);

type ScheduleErrorKey =
	| 'agents.schedule.loadError'
	| 'agents.schedule.saveError'
	| 'agents.schedule.activateError'
	| 'agents.schedule.deactivateError';

function applyConfig(config: { active: boolean; cronExpression: string; wakeUpPrompt: string }) {
	active.value = config.active;
	cronExpression.value = config.cronExpression;
	wakeUpPrompt.value = config.wakeUpPrompt;
	lastSavedCronExpression.value = config.cronExpression;
	lastSavedWakeUpPrompt.value = config.wakeUpPrompt;
	emit('status-change', config.active);
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

async function loadConfig() {
	loading.value = true;
	cronErrorMessage.value = '';
	generalErrorMessage.value = '';

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
		hydrating.value = false;
	}
}

async function saveConfig(force = false): Promise<boolean> {
	if (
		!force &&
		cronExpression.value === lastSavedCronExpression.value &&
		wakeUpPrompt.value === lastSavedWakeUpPrompt.value
	) {
		return true;
	}

	saving.value = true;
	cronErrorMessage.value = '';
	generalErrorMessage.value = '';

	try {
		const config = await updateScheduleIntegration(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			{
				cronExpression: cronExpression.value,
				wakeUpPrompt: wakeUpPrompt.value,
			},
		);
		applyConfig(config);
		return true;
	} catch (error) {
		setSaveError(error, 'agents.schedule.saveError');
		return false;
	} finally {
		saving.value = false;
	}
}

const debouncedSave = useDebounceFn(() => {
	void saveConfig();
}, 500);

watch(cronExpression, () => {
	if (hydrating.value) {
		return;
	}

	cronErrorMessage.value = '';
	generalErrorMessage.value = '';

	void debouncedSave();
});

watch(wakeUpPrompt, () => {
	if (hydrating.value) {
		return;
	}

	generalErrorMessage.value = '';

	void debouncedSave();
});

async function onActivate() {
	loading.value = true;
	cronErrorMessage.value = '';
	generalErrorMessage.value = '';

	try {
		const saved = await saveConfig(true);
		if (!saved) {
			return;
		}

		const config = await activateScheduleIntegration(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		const wasActive = active.value;
		applyConfig(config);

		if (!wasActive && config.active) {
			emit('trigger-added');
		}
	} catch (error) {
		setSaveError(error, 'agents.schedule.activateError');
	} finally {
		loading.value = false;
	}
}

async function onDeactivate() {
	loading.value = true;
	cronErrorMessage.value = '';
	generalErrorMessage.value = '';

	try {
		const config = await deactivateScheduleIntegration(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		applyConfig(config);
	} catch (error) {
		generalErrorMessage.value = toErrorMessage(error, 'agents.schedule.deactivateError');
	} finally {
		loading.value = false;
	}
}

onMounted(() => {
	void loadConfig();
});
</script>

<template>
	<N8nCard :class="$style.card">
		<template #header>
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

			<div :class="$style.field">
				<N8nText size="small" bold>{{ locale.baseText('agents.schedule.cron') }}</N8nText>
				<N8nInput
					v-model="cronExpression"
					:disabled="loading"
					:placeholder="locale.baseText('agents.schedule.cron.placeholder')"
					data-testid="schedule-cron-input"
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
				<N8nText size="small" bold>{{ locale.baseText('agents.schedule.wakeUpPrompt') }}</N8nText>
				<N8nInput
					v-model="wakeUpPrompt"
					type="textarea"
					:rows="4"
					:disabled="loading"
					:placeholder="locale.baseText('agents.schedule.wakeUpPrompt.placeholder')"
					data-testid="schedule-wake-up-prompt"
				/>
			</div>

			<N8nText :class="$style.helpText" size="small">
				{{
					locale.baseText('agents.schedule.timezoneHelp', {
						interpolate: { timezone },
					})
				}}
			</N8nText>

			<N8nText v-if="!isPublished" :class="$style.helpText" size="small">
				{{ locale.baseText('agents.schedule.publishRequired') }}
			</N8nText>

			<N8nText v-if="generalErrorMessage" :class="$style.errorText" size="small">
				{{ generalErrorMessage }}
			</N8nText>

			<div :class="$style.actions">
				<N8nButton
					v-if="!active"
					:disabled="activateDisabled"
					:loading="loading || saving"
					data-testid="schedule-activate-button"
					@click="onActivate"
				>
					{{ locale.baseText('agents.schedule.activate') }}
				</N8nButton>
				<N8nButton
					v-else
					variant="destructive"
					:loading="loading || saving"
					data-testid="schedule-deactivate-button"
					@click="onDeactivate"
				>
					{{ locale.baseText('agents.schedule.deactivate') }}
				</N8nButton>
			</div>
		</div>
	</N8nCard>
</template>

<style module>
.card {
	width: 100%;
	margin-bottom: var(--spacing--sm);
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

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.errorText {
	color: var(--color--danger);
}
</style>
