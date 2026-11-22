<script setup lang="ts">
import {
	N8nButton,
	N8nInput,
	N8nInputLabel,
	N8nNotice,
	N8nSpinner,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INodeProperties } from 'n8n-workflow';
import { computed } from 'vue';

import { stepOfIssue } from '../wizardIssues';
import type { WizardIssue, WizardStep } from '../wizard.types';

const props = defineProps<{
	/** The host of the request, or `undefined` while the URL is not complete. */
	host?: string;
	/** The fields that the server generates from the draft. */
	properties: INodeProperties[];
	issues: WizardIssue[];
	loading: boolean;
	failed: boolean;
	showCredentialNote: boolean;
	droppedSecrets: string[];
	showChangeNote: boolean;
}>();

const emit = defineEmits<{ goToStep: [step: WizardStep]; retry: [] }>();

const changeNote = defineModel<string>('changeNote', { default: '' });

const i18n = useI18n();

const stepLabel = (step: WizardStep) => i18n.baseText(`customNodes.wizard.step.${step}`);

const issueRows = computed(() =>
	props.issues.map((issue, index) => ({
		key: `${issue.path}-${index}`,
		step: stepOfIssue(issue.path),
		message: issue.message,
	})),
);

/** The generated fields, also the ones in a collection of optional fields. */
const fields = computed(() =>
	props.properties.flatMap((property) =>
		property.type === 'collection' && Array.isArray(property.options)
			? property.options.flatMap((option) =>
					'displayName' in option && 'type' in option
						? [{ name: option.name, displayName: option.displayName, required: false }]
						: [],
				)
			: [
					{
						name: property.name,
						displayName: property.displayName,
						required: property.required === true,
					},
				],
	),
);

const credentialNote = computed(() =>
	i18n.baseText('customNodes.wizard.review.credentialNote', {
		interpolate: {
			host: props.host ?? i18n.baseText('customNodes.wizard.review.credentialNote.unknownHost'),
		},
	}),
);
</script>

<template>
	<div :class="$style.step" data-test-id="custom-action-wizard-review-step">
		<div :class="$style.section">
			<N8nText bold color="text-dark">{{
				i18n.baseText('customNodes.wizard.review.host')
			}}</N8nText>
			<N8nText v-if="host" data-test-id="custom-action-wizard-review-host">{{ host }}</N8nText>
			<N8nText v-else color="text-light" data-test-id="custom-action-wizard-review-host-unknown">
				{{ i18n.baseText('customNodes.wizard.review.host.unknown') }}
			</N8nText>
		</div>

		<N8nNotice
			v-if="droppedSecrets.length > 0"
			theme="warning"
			:content="
				i18n.baseText('customNodes.wizard.review.secretsNote', {
					interpolate: { names: droppedSecrets.join(', ') },
				})
			"
			data-test-id="custom-action-wizard-secrets-note"
		/>
		<N8nNotice
			v-if="showCredentialNote"
			theme="info"
			:content="credentialNote"
			data-test-id="custom-action-wizard-credential-note"
		/>

		<div v-if="loading" :class="$style.loading" data-test-id="custom-action-wizard-review-loading">
			<N8nSpinner />
			<N8nText color="text-light">{{ i18n.baseText('customNodes.wizard.review.loading') }}</N8nText>
		</div>

		<div
			v-else-if="failed"
			:class="$style.loading"
			data-test-id="custom-action-wizard-review-failed"
		>
			<N8nText color="danger">{{
				i18n.baseText('customNodes.wizard.review.previewError')
			}}</N8nText>
			<N8nButton
				variant="outline"
				size="small"
				:label="i18n.baseText('customNodes.wizard.review.retry')"
				data-test-id="custom-action-wizard-review-retry"
				@click="emit('retry')"
			/>
		</div>

		<div
			v-if="issueRows.length > 0"
			:class="$style.section"
			data-test-id="custom-action-wizard-issues"
		>
			<N8nText bold color="danger">{{ i18n.baseText('customNodes.wizard.review.issues') }}</N8nText>
			<div
				v-for="row in issueRows"
				:key="row.key"
				:class="$style.issue"
				data-test-id="custom-action-wizard-issue"
			>
				<N8nText size="small">{{ stepLabel(row.step) }}: {{ row.message }}</N8nText>
				<N8nButton
					variant="ghost"
					size="small"
					:label="
						i18n.baseText('customNodes.wizard.review.goToStep', {
							interpolate: { step: stepLabel(row.step) },
						})
					"
					data-test-id="custom-action-wizard-issue-go-to"
					@click="emit('goToStep', row.step)"
				/>
			</div>
		</div>

		<div v-else-if="!loading && !failed" :class="$style.section">
			<N8nText bold color="text-dark">{{
				i18n.baseText('customNodes.wizard.review.fields')
			}}</N8nText>
			<N8nText
				v-if="fields.length === 0"
				color="text-light"
				data-test-id="custom-action-wizard-review-no-fields"
			>
				{{ i18n.baseText('customNodes.wizard.review.fields.empty') }}
			</N8nText>
			<ul :class="$style.fields">
				<li
					v-for="field in fields"
					:key="field.name"
					data-test-id="custom-action-wizard-review-field"
				>
					<N8nText>{{ field.displayName }}</N8nText>
					<N8nText v-if="field.required" size="small" color="text-light">
						{{ i18n.baseText('customNodes.wizard.review.required') }}
					</N8nText>
				</li>
			</ul>
		</div>

		<N8nInputLabel
			v-if="showChangeNote"
			:label="i18n.baseText('customNodes.wizard.review.changeNote')"
			color="text-dark"
		>
			<N8nInput
				v-model="changeNote"
				:placeholder="i18n.baseText('customNodes.wizard.review.changeNote.placeholder')"
				data-test-id="custom-action-wizard-change-note"
			/>
		</N8nInputLabel>
	</div>
</template>

<style module lang="scss">
.step,
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.step {
	gap: var(--spacing--md);
}

.loading,
.issue {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.issue {
	justify-content: space-between;
}

.fields {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);

	li {
		display: flex;
		gap: var(--spacing--xs);
		align-items: baseline;
	}
}
</style>
