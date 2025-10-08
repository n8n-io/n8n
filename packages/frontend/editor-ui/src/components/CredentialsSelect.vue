<script setup lang="ts">
import type { ICredentialType, INodeProperties } from 'n8n-workflow';
import { computed, ref } from 'vue';
import ScopesNotice from '@/components/ScopesNotice.vue';
import NodeCredentials from '@/components/NodeCredentials.vue';
import { useCredentialsStore } from '@/stores/credentials.store';
import type { INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import { useI18n } from '@n8n/i18n';

import { N8nOption, N8nSelect } from '@n8n/design-system';
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

const innerSelectRef = ref<HTMLSelectElement>();

const allCredentialTypes = computed(() => credentialsStore.allCredentialTypes);
const scopes = computed(() => {
	if (!props.activeCredentialType) return [];

	return credentialsStore.getScopesByCredentialType(props.activeCredentialType);
});

const supportedCredentialTypes = computed(() => {
	return allCredentialTypes.value.filter((c: ICredentialType) => isSupported(c.name));
});

function focus() {
	if (innerSelectRef.value) {
		innerSelectRef.value.focus();
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

	for (const property of supported.has) {
		if (checkedCredType[property as keyof ICredentialType] !== undefined) {
			// edge case: `httpHeaderAuth` has `authenticate` auth but belongs to generic auth
			if (name === 'httpHeaderAuth' && property === 'authenticate') continue;

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
			<N8nSelect
				ref="innerSelectRef"
				:size="inputSize"
				filterable
				:model-value="displayValue"
				:placeholder="i18n.baseText('parameterInput.select')"
				:title="displayTitle"
				:disabled="isReadOnly"
				data-test-id="credential-select"
				@update:model-value="(value: string) => emit('update:modelValue', value)"
				@keydown.stop
				@focus="emit('setFocus')"
				@blur="emit('onBlur')"
			>
				<N8nOption
					v-for="credType in supportedCredentialTypes"
					:key="credType.name"
					:value="credType.name"
					:label="credType.displayName"
					data-test-id="credential-select-option"
				>
					<div class="list-option">
						<div class="option-headline">
							{{ credType.displayName }}
						</div>
					</div>
				</N8nOption>
			</N8nSelect>
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
