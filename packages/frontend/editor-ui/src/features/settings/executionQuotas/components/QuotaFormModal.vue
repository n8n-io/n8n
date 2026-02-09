<script lang="ts" setup>
import { ref } from 'vue';
import { i18n as locale } from '@n8n/i18n';
import type { CreateExecutionQuotaPayload } from '@n8n/rest-api-client';

import { N8nButton, N8nHeading, N8nInput, N8nSelect, N8nOption } from '@n8n/design-system';

const emit = defineEmits<{
	submit: [payload: CreateExecutionQuotaPayload];
	close: [];
}>();

const projectId = ref('');
const workflowId = ref('');
const period = ref<string>('daily');
const limit = ref(1000);
const enforcementMode = ref<string>('block');
const quotaWorkflowId = ref('');

const periods = [
	{ value: 'hourly', label: locale.baseText('settings.executionQuotas.period.hourly') },
	{ value: 'daily', label: locale.baseText('settings.executionQuotas.period.daily') },
	{ value: 'weekly', label: locale.baseText('settings.executionQuotas.period.weekly') },
	{ value: 'monthly', label: locale.baseText('settings.executionQuotas.period.monthly') },
];

const enforcementModes = [
	{ value: 'block', label: locale.baseText('settings.executionQuotas.enforcement.block') },
	{ value: 'warn', label: locale.baseText('settings.executionQuotas.enforcement.warn') },
	{ value: 'workflow', label: locale.baseText('settings.executionQuotas.enforcement.workflow') },
];

function handleSubmit() {
	const payload: CreateExecutionQuotaPayload = {
		period: period.value,
		limit: limit.value,
		enforcementMode: enforcementMode.value,
	};

	if (projectId.value) {
		payload.projectId = projectId.value;
	}
	if (workflowId.value) {
		payload.workflowId = workflowId.value;
	}
	if (enforcementMode.value === 'workflow' && quotaWorkflowId.value) {
		payload.quotaWorkflowId = quotaWorkflowId.value;
	}

	emit('submit', payload);
}
</script>

<template>
	<div :class="$style.overlay" @click.self="emit('close')">
		<div :class="$style.modal">
			<N8nHeading tag="h3" size="large" :class="$style.modalTitle">
				{{ locale.baseText('settings.executionQuotas.form.title') }}
			</N8nHeading>

			<div :class="$style.formGroup">
				<label :class="$style.label">
					{{ locale.baseText('settings.executionQuotas.form.projectId') }}
				</label>
				<N8nInput
					v-model="projectId"
					:placeholder="locale.baseText('settings.executionQuotas.form.projectId.placeholder')"
				/>
			</div>

			<div :class="$style.formGroup">
				<label :class="$style.label">
					{{ locale.baseText('settings.executionQuotas.form.workflowId') }}
				</label>
				<N8nInput
					v-model="workflowId"
					:placeholder="locale.baseText('settings.executionQuotas.form.workflowId.placeholder')"
				/>
			</div>

			<div :class="$style.formGroup">
				<label :class="$style.label">
					{{ locale.baseText('settings.executionQuotas.form.period') }}
				</label>
				<N8nSelect v-model="period">
					<N8nOption v-for="p in periods" :key="p.value" :value="p.value" :label="p.label" />
				</N8nSelect>
			</div>

			<div :class="$style.formGroup">
				<label :class="$style.label">
					{{ locale.baseText('settings.executionQuotas.form.limit') }}
				</label>
				<N8nInput v-model="limit" type="number" :min="1" />
			</div>

			<div :class="$style.formGroup">
				<label :class="$style.label">
					{{ locale.baseText('settings.executionQuotas.form.enforcementMode') }}
				</label>
				<N8nSelect v-model="enforcementMode">
					<N8nOption
						v-for="m in enforcementModes"
						:key="m.value"
						:value="m.value"
						:label="m.label"
					/>
				</N8nSelect>
			</div>

			<div v-if="enforcementMode === 'workflow'" :class="$style.formGroup">
				<label :class="$style.label">
					{{ locale.baseText('settings.executionQuotas.form.quotaWorkflowId') }}
				</label>
				<N8nInput
					v-model="quotaWorkflowId"
					:placeholder="
						locale.baseText('settings.executionQuotas.form.quotaWorkflowId.placeholder')
					"
				/>
			</div>

			<div :class="$style.actions">
				<N8nButton
					:label="locale.baseText('settings.executionQuotas.form.cancel')"
					type="tertiary"
					@click="emit('close')"
				/>
				<N8nButton
					:label="locale.baseText('settings.executionQuotas.form.save')"
					@click="handleSubmit"
				/>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
}

.modal {
	background: var(--color--background);
	border-radius: var(--radius--lg);
	padding: var(--spacing--xl);
	width: 480px;
	max-height: 80vh;
	overflow-y: auto;
}

.modalTitle {
	margin-bottom: var(--spacing--lg);
}

.formGroup {
	margin-bottom: var(--spacing--sm);
}

.label {
	display: block;
	margin-bottom: var(--spacing--4xs);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--lg);
}
</style>
