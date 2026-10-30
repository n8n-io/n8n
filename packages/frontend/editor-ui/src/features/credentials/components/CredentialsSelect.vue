<script setup lang="ts">
import type { CredentialTypeAvailability } from '@n8n/api-types';
import type { ICredentialType, INodeProperties } from 'n8n-workflow';
import { computed, ref, useTemplateRef } from 'vue';
import ScopesNotice from './ScopesNotice.vue';
import NodeCredentials from './NodeCredentials.vue';
import CredentialTypeRestrictedMarker from './CredentialTypeRestrictedMarker.vue';
import { useCredentialsStore } from '../credentials.store';
import type { INodeUi, INodeUpdatePropertiesInformation } from '@/Interface';
import { useI18n } from '@n8n/i18n';
import {
	ContactAdminModal,
	getCredentialTypeRestriction,
	RestrictedNodePopover,
	SCOPE_LABEL_KEY,
	type ContactAudience,
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
const isContactAdminOpen = ref(false);
// The dialog keeps showing this copy while it fades out, so it stays set after the close.
const contactAdmin = ref<{ subject: string; audience: ContactAudience }>({
	subject: '',
	audience: 'instance',
});
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

function requestContactAdmin(subject: string, audience: ContactAudience) {
	// The dialog opens on top of the page, so the list must not stay open behind it.
	innerSelectRef.value?.blur();
	contactAdmin.value = { subject, audience };
	isContactAdminOpen.value = true;
}

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
			:node-type-name="contactAdmin.subject"
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
