<script setup lang="ts">
import type { CredentialTypeAvailability } from '@n8n/api-types';
import type { ICredentialType, INodeProperties } from 'n8n-workflow';
import { computed, ref, useTemplateRef } from 'vue';
import ScopesNotice from './ScopesNotice.vue';
import NodeCredentials from './NodeCredentials.vue';
import CredentialTypeRestrictedMarker from './CredentialTypeRestrictedMarker.vue';
import { useCredentialsStore } from '../credentials.store';
import { isCredentialTypeSupported } from '../credentials.utils';
import { useContactAdminDialog } from '../composables/useContactAdminDialog';
import type { INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import {
	ContactAdminModal,
	getCredentialTypeRestriction,
	RestrictedNodePopover,
	SCOPE_LABEL_KEY,
} from '@n8n/frontend-module-type-availability-policies';

import { N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
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

const innerSelectRef = ref<InstanceType<typeof N8nSelect>>();
const fieldMarkerRef = useTemplateRef<HTMLElement>('fieldMarkerRef');
const {
	isOpen: isContactAdminOpen,
	state: contactAdmin,
	request: requestContactAdmin,
} = useContactAdminDialog(() => innerSelectRef.value?.blur());
// The select mounts every option while closed, so the row popovers mount on the first open only.
// They stay mounted: the select closes on the release in a popover, before its click arrives.
const hasListOpened = ref(false);

const allCredentialTypes = computed(() => credentialsStore.allCredentialTypes);
const scopes = computed(() => {
	if (!props.activeCredentialType) return [];

	return credentialsStore.getScopesByCredentialType(props.activeCredentialType);
});

const supportedCredentialTypes = computed(() => {
	return allCredentialTypes.value.filter((c: ICredentialType) => isSupported(c.name));
});

type CredentialTypeOption = {
	type: ICredentialType;
	restriction: CredentialTypeAvailability | null;
};

/** Usable types first. The list is already sorted by name, so each group keeps that order. */
const credentialTypeOptions = computed(() => {
	const options: CredentialTypeOption[] = supportedCredentialTypes.value.map((type) => ({
		type,
		restriction: getCredentialTypeRestriction(type.name),
	}));

	return [
		...options.filter((option) => !option.restriction),
		...options.filter((option) => option.restriction),
	];
});

const selectedRestriction = computed(() => {
	const value = props.node?.parameters[props.parameter.name];
	if (typeof value !== 'string' || !value) return null;

	const restriction = getCredentialTypeRestriction(value);
	if (!restriction) return null;

	return {
		name: credentialsStore.getCredentialTypeByName(value)?.displayName ?? value,
		restriction,
	};
});

function scopeLabel(restriction: CredentialTypeAvailability): string {
	return i18n.baseText(
		restriction.scope
			? SCOPE_LABEL_KEY[restriction.scope]
			: 'typeAvailabilityPolicies.restrictedNodes.scope.generic',
	);
}

function onSelect(value: string) {
	// Enter still selects a highlighted row that became restricted after the list opened.
	if (getCredentialTypeRestriction(value)) return;
	emit('update:modelValue', value);
}

function focus() {
	if (innerSelectRef.value) {
		innerSelectRef.value.focus();
	}
}

function isSupported(name: string): boolean {
	const credentialType = credentialsStore.getCredentialTypeByName(name);
	if (!credentialType) return false;

	return isCredentialTypeSupported(
		credentialType,
		props.parameter.credentialTypes ?? [],
		props.node?.type ?? '',
		(parentName) => credentialsStore.getCredentialTypeByName(parentName) ?? undefined,
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
				@update:model-value="onSelect"
				@keydown.stop
				@focus="emit('setFocus')"
				@blur="emit('onBlur')"
				@visible-change="(visible: boolean) => visible && (hasListOpened = true)"
			>
				<!-- A press on a disabled row would move the focus out of the search input, so typing would stop filtering. -->
				<N8nOption
					v-for="{ type: credType, restriction } in credentialTypeOptions"
					:key="credType.name"
					:value="credType.name"
					:label="credType.displayName"
					:disabled="restriction !== null"
					data-test-id="credential-select-option"
					:data-credential-name="credType.name"
					@mousedown="(event: MouseEvent) => restriction && event.preventDefault()"
				>
					<div v-if="restriction" :class="$style.restrictedOption">
						<span :class="$style.restrictedName">{{ credType.displayName }}</span>
						<span :class="$style.restrictedScope">
							<N8nText size="small" color="text-light">{{ scopeLabel(restriction) }}</N8nText>
							<CredentialTypeRestrictedMarker
								v-if="hasListOpened"
								:name="credType.displayName"
								:restriction="restriction"
								@contact-admin="(audience) => requestContactAdmin(credType.displayName, audience)"
							/>
						</span>
					</div>
					<div v-else class="list-option">
						<div class="option-headline">
							{{ credType.displayName }}
						</div>
					</div>
				</N8nOption>
			</N8nSelect>
			<span
				v-if="selectedRestriction"
				ref="fieldMarkerRef"
				:class="$style.fieldMarker"
				data-test-id="credential-select-restricted"
			>
				<RestrictedNodePopover
					kind="credential"
					side="right"
					:node-type-name="selectedRestriction.name"
					:restriction="selectedRestriction.restriction"
					:anchor="fieldMarkerRef"
					@contact-admin="
						(audience) => requestContactAdmin(selectedRestriction?.name ?? '', audience)
					"
				/>
			</span>
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
		<ContactAdminModal
			kind="credential"
			:type-name="contactAdmin.subject"
			:audience="contactAdmin.audience"
			v-model:open="isContactAdminOpen"
		/>
	</div>
</template>

<style module lang="scss">
.parameter-value-container {
	display: flex;
	align-items: center;
}

.restrictedOption {
	display: flex;
	align-items: center;
	width: 100%;
	min-width: 0;
}

.restrictedName {
	flex: 1;
	// A zero width keeps a long name from widening the list. The popover title shows the full name.
	width: 0;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	font-weight: var(--font-weight--medium);
	// The global disabled option color is too faint to read next to the scope label.
	color: var(--text-color--disabled);
}

.restrictedScope {
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
	gap: var(--spacing--4xs);
	padding-left: var(--spacing--sm);
	white-space: nowrap;
}

.fieldMarker {
	display: inline-flex;
	padding-left: var(--spacing--4xs);
}
</style>
