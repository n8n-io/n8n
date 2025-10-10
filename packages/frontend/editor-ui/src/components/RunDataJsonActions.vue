<script lang="ts" setup>
import jp from 'jsonpath';
import type { INodeUi } from '@/Interface';
import type { IDataObject } from 'n8n-workflow';
import { clearJsonKey, convertPath } from '@/utils/typesUtils';
import { executionDataToJson } from '@/utils/nodeTypesUtils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useNodeHelpers } from '@/composables/useNodeHelpers';
import { useToast } from '@/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { nonExistingJsonPath, PopOutWindowKey } from '@/constants';
import { useClipboard } from '@/composables/useClipboard';
import { usePinnedData } from '@/composables/usePinnedData';
import { inject, computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useTelemetry } from '@/composables/useTelemetry';
import { ElDropdown, ElDropdownItem, ElDropdownMenu } from 'element-plus';
import { N8nIconButton } from '@n8n/design-system';
type JsonPathData = {
	path: string;
	startPath: string;
};

const props = withDefaults(
	defineProps<{
		node: INodeUi;
		paneType: string;
		pushRef?: string;
		distanceFromActive: number;
		selectedJsonPath: string;
		jsonData: IDataObject[];
		outputIndex: number | undefined;
		runIndex: number | undefined;
	}>(),
	{
		selectedJsonPath: nonExistingJsonPath,
	},
);

const popOutWindow = inject(PopOutWindowKey, ref<Window | undefined>());
const isInPopOutWindow = computed(() => popOutWindow?.value !== undefined);

const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();

const clipboard = useClipboard();

const i18n = useI18n();
const nodeHelpers = useNodeHelpers();
const { activeNode } = ndvStore;
const pinnedData = usePinnedData(activeNode);
const { showToast } = useToast();
const telemetry = useTelemetry();

const route = useRoute();

const isReadOnlyRoute = computed(() => {
	return route?.meta?.readOnlyCanvas === true;
});

const noSelection = computed(() => {
	return props.selectedJsonPath === nonExistingJsonPath;
});
const normalisedJsonPath = computed((): string => {
	return noSelection.value ? '[""]' : props.selectedJsonPath;
});

function getJsonValue(): string {
	let selectedValue;
	if (noSelection.value) {
		const inExecutionsFrame =
			window !== window.parent && window.parent.location.pathname.includes('/executions');

		if (pinnedData.hasData.value && !inExecutionsFrame) {
			selectedValue = clearJsonKey(pinnedData.data.value as object);
		} else {
			selectedValue = executionDataToJson(
				nodeHelpers.getNodeInputData(props.node, props.runIndex, props.outputIndex),
			);
		}
	} else {
		const jsonPath = normalisedJsonPath.value.startsWith('$')
			? normalisedJsonPath.value
			: `$${normalisedJsonPath.value}`;
		selectedValue = jp.query(props.jsonData, jsonPath)[0];
	}

	let value = '';
	if (typeof selectedValue === 'object') {
		value = JSON.stringify(selectedValue, null, 2);
	} else {
		value = selectedValue.toString();
	}

	return value;
}

function getJsonItemPath(): JsonPathData {
	const newPath = convertPath(normalisedJsonPath.value);
	let startPath = '';
	let path = '';

	const pathParts = newPath.split(']');
	const index = pathParts[0].slice(1);
	path = pathParts.slice(1).join(']');
	startPath = `$item(${index}).$node["${props.node.name}"].json`;

	return { path, startPath };
}

function getJsonParameterPath(): JsonPathData {
	const newPath = convertPath(normalisedJsonPath.value);
	const path = newPath.split(']').slice(1).join(']');
	let startPath = `$node["${props.node.name}"].json`;

	if (props.distanceFromActive === 1) {
		startPath = '$json';
	}

	return { path, startPath };
}

function handleCopyClick(commandData: { command: string }) {
	let value: string;
	if (commandData.command === 'value') {
		value = getJsonValue();

		showToast({
			title: i18n.baseText('runData.copyValue.toast'),
			message: '',
			type: 'success',
			duration: 2000,
		});
	} else {
		let startPath = '';
		let path = '';
		if (commandData.command === 'itemPath') {
			const jsonItemPath = getJsonItemPath();
			startPath = jsonItemPath.startPath;
			path = jsonItemPath.path;

			showToast({
				title: i18n.baseText('runData.copyItemPath.toast'),
				message: '',
				type: 'success',
				duration: 2000,
			});
		} else if (commandData.command === 'parameterPath') {
			const jsonParameterPath = getJsonParameterPath();
			startPath = jsonParameterPath.startPath;
			path = jsonParameterPath.path;

			showToast({
				title: i18n.baseText('runData.copyParameterPath.toast'),
				message: '',
				type: 'success',
				duration: 2000,
			});
		}
		if (!path.startsWith('[') && !path.startsWith('.') && path) {
			path += '.';
		}
		value = `{{ ${startPath + path} }}`;
	}

	const copyType = {
		value: 'selection',
		itemPath: 'item_path',
		parameterPath: 'parameter_path',
	}[commandData.command];

	telemetry.track('User copied ndv data', {
		node_type: activeNode?.type,
		push_ref: props.pushRef,
		run_index: props.runIndex,
		view: 'json',
		copy_type: copyType,
		workflow_id: workflowsStore.workflowId,
		pane: props.paneType,
		in_execution_log: isReadOnlyRoute.value,
	});

	void clipboard.copy(value);
}
</script>

<template>
	<div :class="$style.actionsGroup" data-test-id="ndv-json-actions">
		<N8nIconButton
			v-if="noSelection"
			:title="i18n.baseText('runData.copyToClipboard')"
			icon="files"
			type="tertiary"
			:circle="false"
			@click="handleCopyClick({ command: 'value' })"
		/>
		<ElDropdown
			v-else
			trigger="click"
			:teleported="
				!isInPopOutWindow // disabling teleport ensures the menu is rendered in pop-out window
			"
			@command="handleCopyClick"
		>
			<span class="el-dropdown-link">
				<N8nIconButton
					:title="i18n.baseText('runData.copyToClipboard')"
					icon="files"
					type="tertiary"
					:circle="false"
				/>
			</span>
			<template #dropdown>
				<ElDropdownMenu>
					<ElDropdownItem :command="{ command: 'value' }">
						{{ i18n.baseText('runData.copyValue') }}
					</ElDropdownItem>
					<ElDropdownItem :command="{ command: 'itemPath' }" divided>
						{{ i18n.baseText('runData.copyItemPath') }}
					</ElDropdownItem>
					<ElDropdownItem :command="{ command: 'parameterPath' }">
						{{ i18n.baseText('runData.copyParameterPath') }}
					</ElDropdownItem>
				</ElDropdownMenu>
			</template>
		</ElDropdown>
	</div>
</template>

<style lang="scss" module>
.actionsGroup {
	position: absolute;
	z-index: 10;
	top: 0;
	right: 0;
	padding-right: var(--spacing--sm);
	opacity: 0;
	transition: opacity 0.3s ease;
}
</style>
