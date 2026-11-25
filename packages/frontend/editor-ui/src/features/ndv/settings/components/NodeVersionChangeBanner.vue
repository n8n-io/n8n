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

const changedDefaultRows = computed(() =>
	props.change.changedDefaults.map(({ name, displayName, oldDefault, newDefault }) => ({
		name,
		label: displayName,
		oldValue: format(oldDefault, [name], oldProperties.value),
		newValue: format(newDefault, [name], props.nodeType.properties),
	})),
);
</script>

<template>
	<N8nCallout
		:theme="hasIssues ? 'danger' : 'success'"
		iconless
		aria-atomic="false"
		data-test-id="node-version-change-banner"
	>
		<div :class="$style.content">
			<div :class="$style.headline">
				<N8nIcon
					:icon="hasIssues ? 'triangle-alert' : 'circle-check'"
					:class="hasIssues ? $style.dangerIcon : $style.successIcon"
				/>
				<span>
					{{
						i18n.baseText(
							hasIssues
								? 'nodeSettings.versionChange.setHighlighted'
								: 'nodeSettings.versionChange.allSet',
							{ interpolate: { version: String(node.typeVersion) } },
						)
					}}
				</span>
			</div>

			<details v-if="setAsideRows.length > 0" data-test-id="node-version-change-set-aside">
				<summary :class="$style.summary">
					{{
						i18n.baseText('nodeSettings.versionChange.setAside.summary', {
							adjustToNumber: setAsideRows.length,
							interpolate: { count: setAsideRows.length },
						})
					}}
				</summary>
				<div>{{ i18n.baseText('nodeSettings.versionChange.setAside.title') }}</div>
				<ul :class="$style.rows" role="list">
					<li v-for="row in setAsideRows" :key="row.name" :class="$style.row">
						<span>{{ row.label }}</span>
						<span :class="$style.chip">{{ row.value }}</span>
					</li>
				</ul>
			</details>

			<details v-if="changedDefaultRows.length > 0" data-test-id="node-version-change-defaults">
				<summary :class="$style.summary">
					{{
						i18n.baseText('nodeSettings.versionChange.changedDefaults.summary', {
							adjustToNumber: changedDefaultRows.length,
							interpolate: { count: changedDefaultRows.length },
						})
					}}
				</summary>
				<div>{{ i18n.baseText('nodeSettings.versionChange.changedDefaults.title') }}</div>
				<ul :class="$style.rows" role="list">
					<li v-for="row in changedDefaultRows" :key="row.name" :class="$style.row">
						<span>{{ row.label }}</span>
						<span :class="$style.chip">{{ row.oldValue }}</span>
						<span>→</span>
						<span :class="$style.chip">{{ row.newValue }}</span>
					</li>
				</ul>
			</details>

			<div>{{ i18n.baseText('nodeSettings.versionChange.behavior') }}</div>
		</div>
	</N8nCallout>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/_focus.scss' as focus;

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.headline {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.summary {
	cursor: pointer;

	@include focus.focus-visible-ring;
}

.dangerIcon {
	color: var(--callout--icon-color--danger);
}

.successIcon {
	color: var(--callout--icon-color--success);
}

.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin-top: var(--spacing--4xs);
	list-style: none;
}

.row {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: var(--spacing--4xs);
}

.chip {
	padding: 0 var(--spacing--4xs);
	border: var(--border);
	border-radius: var(--radius);
	overflow-wrap: anywhere;
}
</style>
