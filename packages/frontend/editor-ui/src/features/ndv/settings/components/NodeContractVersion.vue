<script setup lang="ts">
import type { NextNodeActionVersion } from '@n8n/api-types';
import { N8nInput, N8nInputLabel, N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { INode, INodeContractPin, INodeContractRange } from 'n8n-workflow';
import semver from 'semver';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
	node: INode;
	readOnly?: boolean;
}>();

const emit = defineEmits<{
	change: [contract: INodeContractPin | INodeContractRange];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const pin = computed(() =>
	props.node.contract && 'digest' in props.node.contract ? props.node.contract : undefined,
);
// A pin without a range reads as `^<version>`, as the save reads it.
const savedRange = computed(
	() => props.node.contract?.range ?? (pin.value ? `^${pin.value.version}` : ''),
);
const draft = ref(savedRange.value);
watch(savedRange, (range) => {
	draft.value = range;
});

// A migrated legacy node finds its action by resource and operation.
const stringParameter = (name: string) => {
	const value = props.node.parameters[name];
	return typeof value === 'string' ? value : undefined;
};

const versions = ref<NextNodeActionVersion[]>([]);
watch(
	[
		() => props.node.type,
		() => props.node.typeVersion,
		() => stringParameter('resource'),
		() => stringParameter('operation'),
	],
	async ([type, typeVersion, resource, operation]) => {
		// Without the list, the field still shows the lock and checks the range.
		versions.value = await makeRestApiRequest<NextNodeActionVersion[]>(
			rootStore.restApiContext,
			'GET',
			'/next-nodes/instance/node-versions',
			{ type, typeVersion, resource, operation },
		).catch(() => []);
	},
	{ immediate: true },
);

const error = computed(() => {
	const range = draft.value.trim();
	const major = props.node.typeVersion;
	if (semver.validRange(range) === null) {
		return i18n.baseText('nodeSettings.contractVersion.error.invalid', {
			interpolate: { example: `^${major}.0.0` },
		});
	}
	if (!semver.subset(range, `${major}.x`)) {
		return i18n.baseText('nodeSettings.contractVersion.error.outOfMajor', {
			interpolate: { major: String(major) },
		});
	}
	const available = versions.value.filter(({ withdrawn }) => withdrawn === undefined);
	if (
		versions.value.length > 0 &&
		!available.some(({ version }) => semver.satisfies(version, range))
	) {
		return i18n.baseText('nodeSettings.contractVersion.error.noMatch');
	}
	return undefined;
});

const options = computed(() =>
	versions.value.flatMap(({ version, withdrawn }) =>
		withdrawn === undefined
			? [version, `^${version}`, `~${version}`].map((range) => ({
					value: range,
					label: range,
					disabled: false,
				}))
			: [
					{
						value: version,
						label: i18n.baseText(`nodeSettings.contractVersion.${withdrawn}`, {
							interpolate: { version },
						}),
						disabled: true,
					},
				],
	),
);

function commit() {
	const range = draft.value.trim();
	if (error.value !== undefined || range === savedRange.value) return;
	emit('change', pin.value ? { ...pin.value, range } : { range });
}

function pick(range: string) {
	draft.value = range;
	commit();
}
</script>

<template>
	<div :class="$style.field" data-test-id="node-contract-version">
		<N8nInputLabel
			:label="i18n.baseText('nodeSettings.contractVersion.label')"
			:tooltip-text="i18n.baseText('nodeSettings.contractVersion.tooltip')"
			:underline="true"
			size="small"
			color="text-dark"
		/>
		<N8nText size="small" color="text-base" data-test-id="node-contract-version-lock">
			{{
				pin
					? i18n.baseText('nodeSettings.contractVersion.locked', {
							interpolate: { version: pin.version },
						})
					: i18n.baseText('nodeSettings.contractVersion.unlocked')
			}}
		</N8nText>
		<div :class="$style.inputs">
			<N8nInput
				v-model="draft"
				size="small"
				:disabled="readOnly"
				data-test-id="node-contract-version-range"
				@blur="commit"
				@keydown.enter="commit"
			/>
			<N8nSelect
				:model-value="null"
				size="small"
				:placeholder="i18n.baseText('nodeSettings.contractVersion.pick')"
				:disabled="readOnly || options.length === 0"
				data-test-id="node-contract-version-select"
				@update:model-value="pick"
			>
				<N8nOption
					v-for="option in options"
					:key="option.value"
					:value="option.value"
					:label="option.label"
					:disabled="option.disabled"
				/>
			</N8nSelect>
		</div>
		<N8nText v-if="error" size="small" color="danger" data-test-id="node-contract-version-error">
			{{ error }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--xs);
}

.inputs {
	display: flex;
	gap: var(--spacing--2xs);
}
</style>
