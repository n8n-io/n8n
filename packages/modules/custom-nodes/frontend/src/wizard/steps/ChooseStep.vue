<script setup lang="ts">
import type { CustomNodeAuth } from '@n8n/api-types';
import {
	N8nCombobox2,
	N8nInput,
	N8nInputLabel,
	N8nRadioGroup,
	N8nRadioGroupItem,
	N8nSelect2,
	N8nText,
	type ComboboxOptionBase,
	type SelectItem,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import type { NewNodeFields, WizardIssue, WizardTarget } from '../wizard.types';
import IssueList from './IssueList.vue';

const props = defineProps<{
	mode: 'create' | 'edit';
	/** Custom nodes (`node:<id>`) and parent nodes (`parent:<type>`). */
	targetItems: ComboboxOptionBase[];
	/** The node of the action in the edit mode. */
	editTargetLabel?: string;
	/** The display name of the predefined credential type, when it is known. */
	credentialLabel?: string;
	issues: WizardIssue[];
}>();

const target = defineModel<WizardTarget | null>('target', { required: true });
const node = defineModel<NewNodeFields>('node', { required: true });
const name = defineModel<string>('name', { required: true });
const description = defineModel<string>('description', { required: true });

const i18n = useI18n();

const choice = ref<'new' | 'existing'>(target.value?.kind === 'newNode' ? 'new' : 'existing');

const issuesAt = (path: string) => props.issues.filter((issue) => issue.path === path);

const GENERIC_TYPES = [
	'httpHeaderAuth',
	'httpBasicAuth',
	'httpBearerAuth',
	'httpQueryAuth',
] as const;

const authItems = computed((): SelectItem[] => [
	{ value: 'none', label: i18n.baseText('customNodes.wizard.auth.none') },
	...GENERIC_TYPES.map((type) => ({
		value: type,
		label: i18n.baseText(`customNodes.wizard.auth.${type}`),
	})),
	{ value: 'predefined', label: i18n.baseText('customNodes.wizard.auth.predefined') },
]);

const authValue = computed(() => {
	const auth = node.value.auth;
	return auth.kind === 'generic' ? auth.type : auth.kind;
});

const targetValue = computed(() => {
	const current = target.value;
	if (current?.kind === 'node') return `node:${current.customNodeId}`;
	if (current?.kind === 'parent') return `parent:${current.parentNodeType}`;
	return undefined;
});

function onChoice(value: string | undefined) {
	choice.value = value === 'new' ? 'new' : 'existing';
	target.value = choice.value === 'new' ? { kind: 'newNode' } : null;
}

function onTarget(value: unknown) {
	const text = String(value ?? '');
	if (text.startsWith('node:')) target.value = { kind: 'node', customNodeId: text.slice(5) };
	else if (text.startsWith('parent:')) {
		target.value = { kind: 'parent', parentNodeType: text.slice(7) };
	}
}

function patchNode(change: Partial<NewNodeFields>) {
	node.value = { ...node.value, ...change };
}

function onAuth(value: unknown) {
	const text = String(value ?? '');
	const generic = GENERIC_TYPES.find((type) => type === text);
	let auth: CustomNodeAuth = { kind: 'none' };
	if (generic) auth = { kind: 'generic', type: generic };
	else if (text === 'predefined') auth = { kind: 'predefined', credentialType: '' };
	patchNode({ auth });
}

function onCredentialType(credentialType: string) {
	patchNode({ auth: { kind: 'predefined', credentialType } });
}
</script>

<template>
	<div :class="$style.step" data-test-id="custom-action-wizard-choose-step">
		<N8nText
			v-if="mode === 'edit'"
			color="text-dark"
			data-test-id="custom-action-wizard-edit-target"
		>
			{{
				i18n.baseText('customNodes.wizard.choose.editTarget', {
					interpolate: { node: editTargetLabel ?? '' },
				})
			}}
		</N8nText>

		<template v-else>
			<N8nRadioGroup :model-value="choice" @update:model-value="onChoice">
				<N8nRadioGroupItem
					value="new"
					:label="i18n.baseText('customNodes.wizard.choose.newNode')"
					:description="i18n.baseText('customNodes.wizard.choose.newNode.description')"
					data-test-id="custom-action-wizard-choice-new"
				/>
				<N8nRadioGroupItem
					value="existing"
					:label="i18n.baseText('customNodes.wizard.choose.existingNode')"
					:description="i18n.baseText('customNodes.wizard.choose.existingNode.description')"
					data-test-id="custom-action-wizard-choice-existing"
				/>
			</N8nRadioGroup>

			<N8nInputLabel
				v-if="choice === 'existing'"
				:label="i18n.baseText('customNodes.wizard.choose.node')"
				color="text-dark"
			>
				<!-- The list can have more than a hundred nodes, so the user can search it. -->
				<N8nCombobox2
					:model-value="targetValue"
					:items="targetItems"
					:placeholder="i18n.baseText('customNodes.wizard.choose.node.placeholder')"
					:aria-label="i18n.baseText('customNodes.wizard.choose.node')"
					icon="search"
					open-on-click
					data-test-id="custom-action-wizard-target-select"
					@update:model-value="onTarget"
				/>
				<IssueList :issues="issuesAt('target')" />
			</N8nInputLabel>

			<template v-else>
				<N8nInputLabel
					:label="i18n.baseText('customNodes.wizard.node.displayName')"
					color="text-dark"
					required
				>
					<N8nInput
						:model-value="node.displayName"
						data-test-id="custom-action-wizard-node-name"
						@update:model-value="patchNode({ displayName: $event })"
					/>
					<IssueList :issues="issuesAt('node.displayName')" />
				</N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('customNodes.wizard.node.description')"
					color="text-dark"
				>
					<N8nInput
						:model-value="node.description"
						data-test-id="custom-action-wizard-node-description"
						@update:model-value="patchNode({ description: $event })"
					/>
				</N8nInputLabel>
				<N8nInputLabel
					:label="i18n.baseText('customNodes.wizard.node.baseUrl')"
					color="text-dark"
					required
				>
					<N8nInput
						:model-value="node.baseUrl"
						:placeholder="i18n.baseText('customNodes.wizard.node.baseUrl.placeholder')"
						data-test-id="custom-action-wizard-node-base-url"
						@update:model-value="patchNode({ baseUrl: $event })"
					/>
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('customNodes.wizard.node.baseUrl.hint') }}
					</N8nText>
					<IssueList :issues="issuesAt('node.baseUrl')" />
				</N8nInputLabel>
				<N8nInputLabel :label="i18n.baseText('customNodes.wizard.node.auth')" color="text-dark">
					<N8nSelect2
						:model-value="authValue"
						:items="authItems"
						data-test-id="custom-action-wizard-node-auth"
						@update:model-value="onAuth"
					/>
				</N8nInputLabel>
				<N8nInputLabel
					v-if="node.auth.kind === 'predefined'"
					:label="i18n.baseText('customNodes.wizard.node.credentialType')"
					color="text-dark"
					required
				>
					<N8nInput
						:model-value="node.auth.credentialType"
						:placeholder="i18n.baseText('customNodes.wizard.node.credentialType.placeholder')"
						data-test-id="custom-action-wizard-node-credential-type"
						@update:model-value="onCredentialType"
					/>
					<N8nText v-if="credentialLabel" size="small" color="text-light">
						{{ credentialLabel }}
					</N8nText>
					<IssueList :issues="issuesAt('node.auth')" />
				</N8nInputLabel>
			</template>
		</template>

		<N8nInputLabel
			:label="i18n.baseText('customNodes.wizard.action.name')"
			color="text-dark"
			required
		>
			<N8nInput
				v-model="name"
				:placeholder="i18n.baseText('customNodes.wizard.action.name.placeholder')"
				data-test-id="custom-action-wizard-action-name"
			/>
			<IssueList :issues="issuesAt('name')" />
		</N8nInputLabel>
		<N8nInputLabel
			:label="i18n.baseText('customNodes.wizard.action.description')"
			color="text-dark"
		>
			<N8nInput
				v-model="description"
				type="textarea"
				:rows="2"
				data-test-id="custom-action-wizard-action-description"
			/>
			<IssueList :issues="issuesAt('description')" />
		</N8nInputLabel>
	</div>
</template>

<style module lang="scss">
.step {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
