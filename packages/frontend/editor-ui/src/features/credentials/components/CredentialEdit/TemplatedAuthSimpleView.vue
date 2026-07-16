<script lang="ts" setup>
import type { IUpdateInformation } from '@/Interface';
import {
	cleanPlaceholderValue,
	extractTemplateMarkers,
	isExpressionValue,
	parsePlaceholderDefs,
	parsePlaceholderValues,
	parseTemplatedAuthField,
} from '@/features/credentials/templatedAuth.utils';
import type { InstanceAiCredentialSetupHint } from '@n8n/api-types';
import { N8nInput, N8nInputLabel, N8nLink } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { computed, ref } from 'vue';

/**
 * Simple view for a Templated Custom Auth credential: one input per template
 * `{{marker}}`, labeled from the stored placeholder defs when available. An
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

// Inputs start from the stored values (redacted `***` sentinels render as
// masked characters, same as other credential fields); typing over one stages
// a replacement, while an untouched `***` merges back to the stored secret
// server-side on save.
const editedValues = ref<Record<string, string>>({ ...savedValues.value });

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

function labelFor(name: string): string {
	return defsByName.value.get(name)?.title ?? name;
}

function infoFor(name: string): string | undefined {
	return defsByName.value.get(name)?.info;
}

function inputTypeFor(name: string): 'text' | 'password' {
	// Expressions (e.g. external-secrets references) are never masked, matching
	// native credential fields; real values follow the def's masking.
	if (isExpressionValue(editedValues.value[name] ?? '')) return 'text';
	return defsByName.value.get(name)?.type === 'plain' ? 'text' : 'password';
}

function onInput(name: string, value: string) {
	editedValues.value[name] = value;
	const composed: Record<string, string> = {};
	for (const marker of markers.value) {
		const edited = editedValues.value[marker] ?? savedValues.value[marker] ?? '';
		composed[marker] = cleanPlaceholderValue(template.value, marker, edited);
	}
	emit('update', { name: 'placeholderValues', value: JSON.stringify(composed, null, 2) });
}
</script>

<template>
	<div :class="$style.view" data-test-id="templated-auth-simple-view">
		<N8nInputLabel
			v-for="name in markers"
			:key="name"
			:label="labelFor(name)"
			:tooltip-text="infoFor(name)"
			:required="true"
			size="medium"
		>
			<N8nInput
				:type="inputTypeFor(name)"
				:model-value="editedValues[name] ?? ''"
				:placeholder="labelFor(name)"
				data-test-id="templated-auth-value-input"
				@update:model-value="onInput(name, String($event))"
			/>
		</N8nInputLabel>
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
