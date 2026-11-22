<script setup lang="ts">
import {
	N8nInput,
	N8nInputLabel,
	N8nNotice,
	N8nSelect2,
	N8nText,
	type SelectItem,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { EditableRequest, WizardIssue } from '../wizard.types';
import EntryList from './EntryList.vue';
import IssueList from './IssueList.vue';

const props = defineProps<{
	/** A parent node has no base URL, so its URL must be absolute. */
	absoluteUrl: boolean;
	baseUrl?: string;
	issues: WizardIssue[];
}>();

const request = defineModel<EditableRequest>('request', { required: true });

const i18n = useI18n();

const METHODS: Array<EditableRequest['method']> = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const BODY_TYPES: Array<EditableRequest['bodyType']> = ['none', 'json', 'form'];

const methodItems = METHODS.map((method): SelectItem => ({ value: method, label: method }));
const bodyTypeItems = computed(() =>
	BODY_TYPES.map(
		(bodyType): SelectItem => ({
			value: bodyType,
			label: i18n.baseText(`customNodes.wizard.request.bodyType.${bodyType}`),
		}),
	),
);

const urlHint = computed(() =>
	props.absoluteUrl
		? i18n.baseText('customNodes.wizard.request.url.hint.parent')
		: i18n.baseText('customNodes.wizard.request.url.hint.node'),
);

const issuesAt = (path: string) => props.issues.filter((issue) => issue.path === path);
const issuesUnder = (prefix: string) =>
	props.issues.filter((issue) => issue.path === prefix || issue.path.startsWith(`${prefix}.`));

function patch(change: Partial<EditableRequest>) {
	request.value = { ...request.value, ...change };
}

function onMethod(value: unknown) {
	const method = METHODS.find((candidate) => candidate === value);
	if (method) patch({ method });
}

function onBodyType(value: unknown) {
	const bodyType = BODY_TYPES.find((candidate) => candidate === value);
	if (bodyType) patch({ bodyType });
}
</script>

<template>
	<div :class="$style.step" data-test-id="custom-action-wizard-request-step">
		<div :class="$style.urlRow">
			<N8nInputLabel :label="i18n.baseText('customNodes.wizard.request.method')" color="text-dark">
				<N8nSelect2
					:model-value="request.method"
					:items="methodItems"
					data-test-id="custom-action-wizard-method"
					@update:model-value="onMethod"
				/>
			</N8nInputLabel>
			<N8nInputLabel
				:label="i18n.baseText('customNodes.wizard.request.url')"
				color="text-dark"
				required
			>
				<N8nInput
					:model-value="request.url"
					:placeholder="
						absoluteUrl
							? i18n.baseText('customNodes.wizard.request.url.placeholder.parent')
							: i18n.baseText('customNodes.wizard.request.url.placeholder.node')
					"
					data-test-id="custom-action-wizard-url"
					@update:model-value="patch({ url: $event })"
				/>
			</N8nInputLabel>
		</div>
		<N8nText size="small" color="text-light" data-test-id="custom-action-wizard-url-hint">
			{{ urlHint }}
		</N8nText>
		<N8nText v-if="!absoluteUrl && baseUrl" size="small" color="text-light">
			{{ baseUrl }}
		</N8nText>
		<IssueList :issues="issuesAt('request.url')" />

		<N8nNotice theme="info" :content="i18n.baseText('customNodes.wizard.request.fixedHint')" />

		<EntryList
			:model-value="request.headers"
			:label="i18n.baseText('customNodes.wizard.request.headers')"
			test-id="custom-action-wizard-headers"
			@update:model-value="patch({ headers: $event })"
		/>
		<IssueList :issues="issuesUnder('request.headers')" />

		<EntryList
			:model-value="request.query"
			:label="i18n.baseText('customNodes.wizard.request.query')"
			test-id="custom-action-wizard-query"
			@update:model-value="patch({ query: $event })"
		/>
		<IssueList :issues="issuesUnder('request.query')" />

		<N8nInputLabel :label="i18n.baseText('customNodes.wizard.request.bodyType')" color="text-dark">
			<N8nSelect2
				:model-value="request.bodyType"
				:items="bodyTypeItems"
				data-test-id="custom-action-wizard-body-type"
				@update:model-value="onBodyType"
			/>
		</N8nInputLabel>
		<N8nInputLabel
			v-if="request.bodyType !== 'none'"
			:label="i18n.baseText('customNodes.wizard.request.body')"
			color="text-dark"
		>
			<N8nInput
				:model-value="request.bodyText"
				type="textarea"
				:rows="5"
				placeholder="{}"
				data-test-id="custom-action-wizard-body"
				@update:model-value="patch({ bodyText: $event })"
			/>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('customNodes.wizard.request.body.hint') }}
			</N8nText>
		</N8nInputLabel>
		<IssueList :issues="issuesUnder('request.body')" />
	</div>
</template>

<style module lang="scss">
.step {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.urlRow {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 4fr);
	gap: var(--spacing--2xs);
}
</style>
