<script setup lang="ts">
import type { ICredentialType, INodeProperties } from 'n8n-workflow';
import { computed, ref } from 'vue';
import ScopesNotice from './ScopesNotice.vue';
import NodeCredentials from './NodeCredentials.vue';
import { useCredentialsStore } from '../credentials.store';
import type { INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import { useI18n } from '@n8n/i18n';

import { N8nSelect2, type SelectValue } from '@n8n/design-system';
type Props = {
	activeCredentialType: string;
	parameter: INodeProperties;
	node?: INodeUi;
	inputSize?: 'small' | 'large' | 'mini' | 'medium' | 'xlarge';
	displayValue: string;
	isReadOnly: boolean;
	displayTitle: string;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	'update:modelValue': [value: string];
	setFocus: [];
	onBlur: [];
	credentialSelected: [update: INodeUpdatePropertiesInformation];
}>();

const credentialsStore = useCredentialsStore();

const i18n = useI18n();

const selectRef = ref<{
	triggerRef?: HTMLElement | { $el?: unknown } | null;
} | null>(null);

const allCredentialTypes = computed(() => credentialsStore.allCredentialTypes);
const scopes = computed(() => {
	if (!props.activeCredentialType) return [];

	return credentialsStore.getScopesByCredentialType(props.activeCredentialType);
});

const supportedCredentialTypes = computed(() => {
	return allCredentialTypes.value.filter((c: ICredentialType) => isSupported(c.name));
});

const credentialSelectItems = computed(() =>
	supportedCredentialTypes.value.flatMap((credType) => {
		if (!credType.name || !credType.displayName) return [];
		return [{ value: credType.name, label: credType.displayName }];
	}),
);

const credentialSelectValue = computed(() => {
	const match = supportedCredentialTypes.value.find(
		(credType) =>
			credType.name === props.displayValue || credType.displayName === props.displayValue,
	);
	return match?.name;
});

function onCredentialTypeSelect(value: SelectValue | undefined) {
	if (typeof value !== 'string') return;
	emit('update:modelValue', value);
}

function focus() {
	const trigger = selectRef.value?.triggerRef;
	const element = trigger instanceof HTMLElement ? trigger : trigger?.$el;
	if (element instanceof HTMLElement) {
		element.focus();
	}
}

/**
 * Check if a credential type belongs to one of the supported sets defined
 * in the `credentialTypes` key in a `credentialsSelect` parameter
 */
function isSupported(name: string): boolean {
	const supported = getSupportedSets(props.parameter.credentialTypes ?? []);

	const checkedCredType = credentialsStore.getCredentialTypeByName(name);
	if (!checkedCredType) return false;
	if (checkedCredType.hidden) return false;

	// Exclude credentials that opt into node-restriction when the current
	// node is not in their supportedNodes list. Mirrors the server-side
	// `isCredentialUsableByNode` policy so the UI does not offer a choice
	// that the API/runtime would reject.
	if (
		checkedCredType.restrictToSupportedNodes &&
		!checkedCredType.supportedNodes?.includes(props.node?.type ?? '')
	) {
		return false;
	}

	for (const property of supported.has) {
		if (checkedCredType[property as keyof ICredentialType] !== undefined) {
			// generic-auth credentials (e.g. httpHeaderAuth) may also define
			// `authenticate`; they belong in the generic auth dropdown, not the
			// predefined credential type list
			if (property === 'authenticate' && checkedCredType.genericAuth === true) continue;

			return true;
		}
	}

	if (
		checkedCredType.extends?.some((parentType: string) => supported.extends.includes(parentType))
	) {
		return true;
	}

	if (checkedCredType.extends && supported.extends.length) {
		// recurse upward until base credential type
		// e.g. microsoftDynamicsOAuth2Api -> microsoftOAuth2Api -> oAuth2Api
		return checkedCredType.extends.reduce(
			(acc: boolean, parentType: string) => acc || isSupported(parentType),
			false,
		);
	}

	return false;
}

function getSupportedSets(credentialTypes: string[]) {
	return credentialTypes.reduce<{ extends: string[]; has: string[] }>(
		(acc, cur) => {
			const _extends = cur.split('extends:');

			if (_extends.length === 2) {
				acc.extends.push(_extends[1]);
				return acc;
			}

			const _has = cur.split('has:');

			if (_has.length === 2) {
				acc.has.push(_has[1]);
				return acc;
			}

			return acc;
		},
		{ extends: [], has: [] },
	);
}

defineExpose({ focus });
</script>

<template>
	<div>
		<div :class="$style['parameter-value-container']">
			<N8nSelect2
				ref="selectRef"
				:size="inputSize"
				:model-value="credentialSelectValue"
				:items="credentialSelectItems"
				:placeholder="i18n.baseText('parameterInput.select')"
				:title="displayTitle"
				:disabled="isReadOnly"
				data-test-id="credential-select"
				@update:model-value="onCredentialTypeSelect"
				@focus="emit('setFocus')"
				@blur="emit('onBlur')"
				@keydown.stop
			/>
			<slot name="issues-and-options" />
		</div>

		<ScopesNotice
			v-if="scopes.length > 0"
			:active-credential-type="activeCredentialType"
			:scopes="scopes"
		/>
		<div>
			<NodeCredentials
				v-if="node"
				:node="node"
				:readonly="isReadOnly"
				:override-cred-type="node?.parameters[parameter.name]"
				@credential-selected="(updateInformation) => emit('credentialSelected', updateInformation)"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.parameter-value-container {
	display: flex;
	align-items: center;
}
</style>
