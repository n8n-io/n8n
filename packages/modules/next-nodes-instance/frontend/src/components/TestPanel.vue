<script setup lang="ts">
import type { NextNodeDraftTestResult } from '@n8n/api-types';
import {
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import { schemaTypeOf, type InputSettings, type JsonSchema } from '../next-nodes-instance.config';

const props = defineProps<{
	inputs: ReadonlyArray<readonly [name: string, settings: InputSettings]>;
	result?: NextNodeDraftTestResult;
	/** The schema of one output item of the run. */
	schema?: JsonSchema;
	/** The top-level output fields that the action keeps. */
	keep: ReadonlySet<string>;
	running: boolean;
	/** The request changed after the run. */
	outdated: boolean;
	disabled: boolean;
	/** The credential types of the action. None: the run sends no credential. */
	credentialTypes: ReadonlyArray<{ name: string; displayName: string }>;
	/** The app name, for a new credential. */
	appName: string;
	credentialId: string | null;
}>();

const emit = defineEmits<{
	run: [values: Record<string, string>];
	'update:keep': [keep: Set<string>];
	'update:credentialId': [credentialId: string | null];
}>();

const i18n = useI18n();

// The picker and its "Create new credential" modal live in the shell.
const credentialPicker = computed(() => componentRegistry.get('credential-picker'));
const pickedType = ref<string>();
// A node with more than one type, e.g. an API token or OAuth2, lets the tester pick the type.
const credentialType = computed(
	() =>
		props.credentialTypes.find(({ name }) => name === pickedType.value)?.name ??
		props.credentialTypes[0]?.name,
);
const pickType = (value: unknown) => {
	pickedType.value = typeof value === 'string' ? value : undefined;
	emit('update:credentialId', null);
};
const needsCredential = computed(() => Boolean(credentialType.value) && !props.credentialId);

const values = ref<Record<string, string>>({});

const fields = computed(() => Object.entries(props.schema?.properties ?? {}));

const output = computed(() => JSON.stringify(props.result?.items ?? [], null, 2));

function toggle(name: string, kept: boolean) {
	const next = new Set(props.keep);
	if (kept) next.add(name);
	else next.delete(name);
	emit('update:keep', next);
}
</script>

<template>
	<aside :class="$style.panel" data-test-id="http-action-test-panel">
		<div :class="$style.header">
			<N8nHeading tag="h2" size="medium">{{ i18n.baseText('settings.nodes.test') }}</N8nHeading>
			<N8nText size="small" color="text-base">
				{{ i18n.baseText('settings.nodes.test.description') }}
			</N8nText>
		</div>

		<N8nInputLabel
			v-for="[name, settings] in inputs"
			:key="name"
			:label="name"
			:required="settings.required"
			:input-name="`http-action-test-field-${name}`"
		>
			<N8nInput
				:id="`http-action-test-field-${name}`"
				v-model="values[name]"
				size="small"
				:placeholder="i18n.baseText(`settings.nodes.form.input.type.${settings.type}`)"
				:data-test-id="`http-action-test-input-${name}`"
			/>
		</N8nInputLabel>

		<N8nInputLabel
			v-if="credentialTypes.length > 1"
			:label="i18n.baseText('settings.nodes.test.credentialType')"
			input-name="http-action-test-credential-type"
		>
			<N8nSelect
				id="http-action-test-credential-type"
				:model-value="credentialType"
				size="small"
				data-test-id="http-action-test-credential-type"
				@update:model-value="pickType"
			>
				<N8nOption
					v-for="type in credentialTypes"
					:key="type.name"
					:value="type.name"
					:label="type.displayName"
				/>
			</N8nSelect>
		</N8nInputLabel>

		<N8nInputLabel
			v-if="credentialType && credentialPicker"
			:label="i18n.baseText('settings.nodes.test.credential')"
			required
		>
			<component
				:is="credentialPicker"
				:app-name="appName"
				:credential-type="credentialType"
				:selected-credential-id="credentialId"
				data-test-id="http-action-test-credential"
				@credential-selected="emit('update:credentialId', $event)"
				@credential-deselected="emit('update:credentialId', null)"
			/>
		</N8nInputLabel>

		<div>
			<N8nButton
				:loading="running"
				:disabled="disabled || needsCredential"
				data-test-id="http-action-run-test"
				@click="emit('run', { ...values })"
			>
				<template #icon><N8nIcon icon="play" /></template>
				{{ i18n.baseText('settings.nodes.test.run') }}
			</N8nButton>
		</div>

		<N8nCallout v-if="result && outdated" theme="warning">
			{{ i18n.baseText('settings.nodes.test.outdated') }}
		</N8nCallout>

		<N8nText v-if="!result" size="small" color="text-light">
			{{ i18n.baseText('settings.nodes.test.empty') }}
		</N8nText>

		<N8nCallout
			v-else-if="result.status === 'error'"
			theme="danger"
			data-test-id="http-action-test-error"
		>
			<strong>{{ i18n.baseText('settings.nodes.test.failed') }}</strong>
			{{ result.error }}
		</N8nCallout>

		<template v-else>
			<div :class="$style.section">
				<N8nText size="small" bold>{{ i18n.baseText('settings.nodes.test.output') }}</N8nText>
				<pre :class="$style.output" data-test-id="http-action-test-output">{{ output }}</pre>
			</div>
			<div v-if="fields.length" :class="$style.section">
				<N8nText size="small" bold>{{ i18n.baseText('settings.nodes.test.schema') }}</N8nText>
				<N8nText size="small" color="text-base">
					{{ i18n.baseText('settings.nodes.test.schema.description') }}
				</N8nText>
				<N8nCheckbox
					v-for="[name, field] in fields"
					:key="name"
					:model-value="keep.has(name)"
					:label="`${name}: ${schemaTypeOf(field)}`"
					@update:model-value="toggle(name, $event)"
				/>
			</div>
		</template>
	</aside>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
}

.header,
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.output {
	max-height: 320px; // No height token this large; keeps long responses scrollable.
	margin: 0;
	padding: var(--spacing--xs);
	overflow: auto;
	border-radius: var(--radius--3xs);
	background-color: var(--color--background--light-2);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
}
</style>
