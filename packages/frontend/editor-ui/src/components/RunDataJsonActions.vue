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
import { useI18n } from '@/composables/useI18n';
import { nonExistingJsonPath } from '@/constants';
import { useClipboard } from '@/composables/useClipboard';
import { usePinnedData } from '@/composables/usePinnedData';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useTelemetry } from '@/composables/useTelemetry';

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
const ndvStore = useNDVStore();
const workflowsStore = useWorkflowsStore();

const i18n = useI18n();
const nodeHelpers = useNodeHelpers();
const clipboard = useClipboard();
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
	let selectedValue = jp.query(props.jsonData, `$${normalisedJsonPath.value}`)[0];
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
		<n8n-icon-button
			v-if="noSelection"
			:title="i18n.baseText('runData.copyToClipboard')"
			icon="copy"
			type="tertiary"
			:circle="false"
			@click="handleCopyClick({ command: 'value' })"
		/>
		<el-dropdown v-else trigger="click" @command="handleCopyClick">
			<span class="el-dropdown-link">
				<n8n-icon-button
					:title="i18n.baseText('runData.copyToClipboard')"
					icon="copy"
					type="tertiary"
					:circle="false"
				/>
			</span>
			<template #dropdown>
				<el-dropdown-menu>
					<el-dropdown-item :command="{ command: 'value' }">
						{{ i18n.baseText('runData.copyValue') }}
					</el-dropdown-item>
					<el-dropdown-item :command="{ command: 'itemPath' }" divided>
						{{ i18n.baseText('runData.copyItemPath') }}
					</el-dropdown-item>
					<el-dropdown-item :command="{ command: 'parameterPath' }">
						{{ i18n.baseText('runData.copyParameterPath') }}
					</el-dropdown-item>
				</el-dropdown-menu>
			</template>
		</el-dropdown>
	</div>
</template>

<style lang="scss" module>
.actionsGroup {
	position: sticky;
	height: 0;
	overflow: visible;
	z-index: 10;
	top: 0;
	padding-right: var(--spacing-s);
	opacity: 0;
	transition: opacity 0.3s ease;
	text-align: right;
}
</style>
