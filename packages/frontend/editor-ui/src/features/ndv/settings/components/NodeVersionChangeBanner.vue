<script setup lang="ts">
import { computed } from 'vue';
import {
	NodeHelpers,
	type INodeProperties,
	type INodeTypeDescription,
	type NodeParameterValueType,
} from 'n8n-workflow';
import { N8nCallout, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { MASK } from '@/app/utils/maskSecret';
import { getInactiveCredentials } from '@/app/utils/nodeTypesUtils';
import type { NodeVersionChange } from '@/features/ndv/shared/ndv.types';
import {
	collectPasswordNames,
	formatVersionChangeValue,
} from '@/features/ndv/settings/nodeVersionPicker.utils';

const props = defineProps<{
	node: INodeUi;
	nodeType: INodeTypeDescription;
	change: NodeVersionChange;
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

// The stored issues are empty for a disabled node, but its fields are still highlighted.
const hasIssues = computed(
	() =>
		NodeHelpers.getNodeParametersIssues(
			props.nodeType.properties,
			{ ...props.node, disabled: false },
			props.nodeType,
		) !== null,
);

// The entry stays on the node, so the line clears when the node uses the type again.
const unusedCredentials = computed(() => {
	const inactive = getInactiveCredentials(props.node, props.nodeType);

	return props.change.droppedCredentials
		.filter((type) => inactive.includes(type))
		.map((type) => ({ type, name: props.node.credentials?.[type]?.name ?? type }));
});

const isDanger = computed(() => hasIssues.value || unusedCredentials.value.length > 0);

const headlineKey = computed(() => {
	if (hasIssues.value) return 'nodeSettings.versionChange.setHighlighted';
	if (unusedCredentials.value.length > 0) return 'nodeSettings.versionChange.setAuthentication';
	return 'nodeSettings.versionChange.allSet';
});

const oldType = computed(() =>
	nodeTypesStore.getNodeType(props.node.type, props.change.fromVersion),
);
const oldProperties = computed(() => oldType.value?.properties ?? []);

function format(
	value: NodeParameterValueType,
	path: Array<string | number>,
	properties: INodeProperties[],
	passwordNames = new Set<string>(),
) {
	if (path.length === 1 && typeof value === 'boolean') {
		return i18n.baseText(
			value ? 'nodeSettings.versionChange.on' : 'nodeSettings.versionChange.off',
		);
	}

	return formatVersionChangeValue(value, path, properties, passwordNames);
}

const setAsideRows = computed(() => {
	const passwordNames = collectPasswordNames(oldProperties.value);

	return props.change.setAside.map(({ name, path, displayName, value }) => ({
		name,
		// Two nested values can share a label, so a nested row shows its full name.
		label: path.length === 1 ? displayName : name,
		// Without the old description, the password parameters are unknown.
		value: oldType.value ? format(value, path, oldProperties.value, passwordNames) : MASK,
	}));
});

const changedDefaultRows = computed(() => {
	// A parameter that is a password in either version is masked on both sides.
	const passwordNames = collectPasswordNames([
		...oldProperties.value,
		...props.nodeType.properties,
	]);

	return props.change.changedDefaults.map(({ name, displayName, oldDefault, newDefault }) => ({
		name,
		label: displayName,
		oldValue: format(oldDefault, [name], oldProperties.value, passwordNames),
		newValue: format(newDefault, [name], props.nodeType.properties, passwordNames),
	}));
});
</script>

<template>
	<N8nCallout
		:theme="isDanger ? 'danger' : 'success'"
		iconless
		aria-atomic="false"
		data-test-id="node-version-change-banner"
	>
		<div :class="$style.content">
			<N8nIcon
				:icon="isDanger ? 'triangle-alert' : 'circle-check'"
				:class="[$style.icon, isDanger ? $style.dangerIcon : $style.successIcon]"
			/>
			<div :class="$style.body">
				<div>
					{{ i18n.baseText(headlineKey, { interpolate: { version: String(node.typeVersion) } }) }}
				</div>

				<details
					v-if="setAsideRows.length > 0"
					:class="$style.bucket"
					data-test-id="node-version-change-set-aside"
				>
					<summary :class="$style.summary">
						{{
							i18n.baseText('nodeSettings.versionChange.setAside.summary', {
								adjustToNumber: setAsideRows.length,
								interpolate: { count: setAsideRows.length },
							})
						}}
						<N8nIcon icon="chevron-down" size="small" :class="$style.chevron" />
					</summary>
					<ul :class="$style.rows" role="list">
						<li v-for="row in setAsideRows" :key="row.name" :class="$style.row">
							<span>{{ row.label }}</span>
							<span :class="$style.chip">{{ row.value }}</span>
						</li>
					</ul>
				</details>

				<details
					v-if="changedDefaultRows.length > 0"
					:class="$style.bucket"
					data-test-id="node-version-change-defaults"
				>
					<summary :class="$style.summary">
						{{
							i18n.baseText('nodeSettings.versionChange.changedDefaults.summary', {
								adjustToNumber: changedDefaultRows.length,
								interpolate: { count: changedDefaultRows.length },
							})
						}}
						<N8nIcon icon="chevron-down" size="small" :class="$style.chevron" />
					</summary>
					<ul :class="$style.rows" role="list">
						<li v-for="row in changedDefaultRows" :key="row.name" :class="$style.row">
							<span>{{ row.label }}</span>
							<span :class="$style.chip">{{ row.oldValue }}</span>
							<span>→</span>
							<span :class="$style.chip">{{ row.newValue }}</span>
						</li>
					</ul>
				</details>

				<details
					v-if="change.removedConnections.length > 0"
					:class="$style.bucket"
					data-test-id="node-version-change-connections"
				>
					<summary :class="$style.summary">
						{{
							i18n.baseText('nodeSettings.versionChange.removedConnections.summary', {
								adjustToNumber: change.removedConnections.length,
								interpolate: { count: change.removedConnections.length },
							})
						}}
						<N8nIcon icon="chevron-down" size="small" :class="$style.chevron" />
					</summary>
					<ul :class="$style.rows" role="list">
						<li v-for="(pair, index) in change.removedConnections" :key="index" :class="$style.row">
							<span>{{ pair[0].node }}</span>
							<span>→</span>
							<span>{{ pair[1].node }}</span>
						</li>
					</ul>
				</details>

				<div
					v-for="credential in unusedCredentials"
					:key="credential.type"
					data-test-id="node-version-change-unused-credential"
				>
					{{
						i18n.baseText('nodeSettings.versionChange.unusedCredential', {
							interpolate: { name: credential.name },
						})
					}}
				</div>

				<div :class="$style.hint">{{ i18n.baseText('nodeSettings.versionChange.behavior') }}</div>
			</div>
		</div>
	</N8nCallout>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.content {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
}

.icon {
	flex: none;
	margin-top: var(--spacing--5xs);
}

.dangerIcon {
	color: var(--callout--icon-color--danger);
}

.successIcon {
	color: var(--callout--icon-color--success);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	min-width: 0;
	line-height: var(--line-height--md);
}

.summary {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	width: fit-content;
	cursor: pointer;
	text-decoration: underline;
	list-style: none;

	&::-webkit-details-marker {
		display: none;
	}

	@include focus.focus-visible-ring;
}

.chevron {
	.bucket[open] & {
		transform: rotate(180deg);
	}
}

.hint {
	opacity: 0.8;
}

.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin-top: var(--spacing--3xs);
	list-style: none;
}

.row {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
}

.chip {
	padding: 0 var(--spacing--3xs);
	border: var(--border);
	border-radius: var(--radius);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	overflow-wrap: anywhere;
}
</style>
