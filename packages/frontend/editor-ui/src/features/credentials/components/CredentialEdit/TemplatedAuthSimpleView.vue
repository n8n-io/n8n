<script lang="ts" setup>
import type { IUpdateInformation } from '@/Interface';
import ParameterInputExpanded from '@/features/ndv/parameters/components/ParameterInputExpanded.vue';
import {
	cleanPlaceholderValue,
	extractTemplateMarkers,
	parsePlaceholderDefs,
	parsePlaceholderValues,
	parseTemplatedAuthField,
} from '@/features/credentials/templatedAuth.utils';
import type { InstanceAiCredentialSetupHint } from '@n8n/api-types';
import { N8nLink } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type {
	ICredentialDataDecryptedObject,
	INodeProperties,
	NodeParameterValueType,
} from 'n8n-workflow';
import { computed, ref } from 'vue';

/**
 * Simple view for a Templated Custom Auth credential: one real parameter
 * input per template `{{marker}}` (same component as native credential
 * fields, so masking, expressions and the expression editor behave
 * identically), labeled from the stored placeholder defs when available. An
 * untouched input keeps the stored (redacted) value — the `***` sentinels
 * merge back to the real secrets server-side on save; typing replaces it.
 */
const props = defineProps<{
	credentialData: ICredentialDataDecryptedObject;
}>();

const emit = defineEmits<{
	update: [value: IUpdateInformation];
}>();

const i18n = useI18n();

const template = computed(() =>
	parseTemplatedAuthField<InstanceAiCredentialSetupHint['template']>(
		props.credentialData.template,
		{},
	),
);

const markers = computed(() => extractTemplateMarkers(template.value));

const defsByName = computed(() => {
	const defs = parsePlaceholderDefs(props.credentialData.placeholderDefs);
	return new Map(defs.map((def) => [def.name, def]));
});

const savedValues = computed(() => parsePlaceholderValues(props.credentialData.placeholderValues));

// Inputs start from the stored values (redacted `***` sentinels render masked,
// expressions render in the expression editor — same as native credential
// fields); typing over one stages a replacement, while an untouched `***`
// merges back to the stored secret server-side on save.
const editedValues = ref<Record<string, string>>({ ...savedValues.value });

/** One native credential parameter per template marker; defs give the UI. */
const placeholderProperties = computed<INodeProperties[]>(() =>
	markers.value.map((name) => {
		const def = defsByName.value.get(name);
		return {
			displayName: def?.title ?? name,
			name,
			type: 'string',
			default: '',
			required: true,
			...(def?.info ? { description: def.info } : {}),
			...(def?.type === 'plain' ? {} : { typeOptions: { password: true } }),
		};
	}),
);

const parameterValues = computed<Record<string, NodeParameterValueType>>(() => ({
	...editedValues.value,
}));

const docsUrl = computed(() => {
	const url = props.credentialData.docsUrl;
	return typeof url === 'string' && /^https?:\/\//.test(url) ? url : undefined;
});

const docsHost = computed(() => {
	if (!docsUrl.value) return undefined;
	try {
		return new URL(docsUrl.value).host;
	} catch {
		return undefined;
	}
});

function onParameterUpdate(update: IUpdateInformation) {
	editedValues.value[update.name] = String(update.value ?? '');
	const composed: Record<string, string> = {};
	for (const marker of markers.value) {
		const edited = editedValues.value[marker] ?? savedValues.value[marker] ?? '';
		composed[marker] = cleanPlaceholderValue(template.value, marker, edited);
	}
	emit('update', { name: 'placeholderValues', value: JSON.stringify(composed, null, 2) });
}
</script>

<template>
	<div :class="$style.view" data-test-id="templated-auth-simple-view" @keydown.stop>
		<!-- form-per-input matches CredentialInputs: breaks up inputs and prevents Chrome autofill -->
		<form
			v-for="parameter in placeholderProperties"
			:key="parameter.name"
			autocomplete="off"
			data-test-id="templated-auth-value-input"
			@submit.prevent
		>
			<ParameterInputExpanded
				:parameter="parameter"
				:value="parameterValues[parameter.name]"
				:node-values="parameterValues"
				:label="{ size: 'medium' }"
				documentation-url=""
				event-source="credentials"
				@update="onParameterUpdate"
			/>
		</form>
		<N8nLink
			v-if="docsUrl"
			:to="docsUrl"
			new-window
			size="small"
			data-test-id="templated-auth-docs-link"
		>
			{{
				i18n.baseText('instanceAi.credential.hint.docsLink', {
					interpolate: { host: docsHost ?? docsUrl },
				})
			}}
		</N8nLink>
	</div>
</template>

<style lang="scss" module>
.view {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
