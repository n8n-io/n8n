<template>
	<div :class="$style.actionsGroup">
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

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { mapStores, storeToRefs } from 'pinia';
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
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { usePinnedData } from '@/composables/usePinnedData';

type JsonPathData = {
	path: string;
	startPath: string;
};

export default defineComponent({
	name: 'RunDataJsonActions',
	props: {
		node: {
			type: Object as PropType<INodeUi>,
			required: true,
		},
		paneType: {
			type: String,
		},
		pushRef: {
			type: String,
		},
		currentOutputIndex: {
			type: Number,
		},
		runIndex: {
			type: Number,
		},
		displayMode: {
			type: String,
		},
		distanceFromActive: {
			type: Number,
		},
		selectedJsonPath: {
			type: String,
			default: nonExistingJsonPath,
		},
		jsonData: {
			type: Array as PropType<IDataObject[]>,
			required: true,
		},
	},
	setup() {
		const ndvStore = useNDVStore();
		const i18n = useI18n();
		const nodeHelpers = useNodeHelpers();
		const clipboard = useClipboard();
		const { activeNode } = storeToRefs(ndvStore);
		const pinnedData = usePinnedData(activeNode);

		return {
			i18n,
			nodeHelpers,
			clipboard,
			pinnedData,
			...useToast(),
		};
	},
	computed: {
		...mapStores(useNodeTypesStore, useNDVStore, useWorkflowsStore, useSourceControlStore),
		isReadOnlyRoute() {
			return this.$route?.meta?.readOnlyCanvas === true;
		},
		activeNode(): INodeUi | null {
			return this.ndvStore.activeNode;
		},
		noSelection() {
			return this.selectedJsonPath === nonExistingJsonPath;
		},
		normalisedJsonPath(): string {
			return this.noSelection ? '[""]' : this.selectedJsonPath;
		},
	},
	methods: {
		getJsonValue(): string {
			let selectedValue = jp.query(this.jsonData, `$${this.normalisedJsonPath}`)[0];
			if (this.noSelection) {
				const inExecutionsFrame =
					window !== window.parent && window.parent.location.pathname.includes('/executions');

				if (this.pinnedData.hasData.value && !inExecutionsFrame) {
					selectedValue = clearJsonKey(this.pinnedData.data.value as object);
				} else {
					selectedValue = executionDataToJson(
						this.nodeHelpers.getNodeInputData(this.node, this.runIndex, this.currentOutputIndex),
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
		},
		getJsonItemPath(): JsonPathData {
			const newPath = convertPath(this.normalisedJsonPath);
			let startPath = '';
			let path = '';

			const pathParts = newPath.split(']');
			const index = pathParts[0].slice(1);
			path = pathParts.slice(1).join(']');
			startPath = `$item(${index}).$node["${this.node.name}"].json`;

			return { path, startPath };
		},
		getJsonParameterPath(): JsonPathData {
			const newPath = convertPath(this.normalisedJsonPath);
			const path = newPath.split(']').slice(1).join(']');
			let startPath = `$node["${this.node.name}"].json`;

			if (this.distanceFromActive === 1) {
				startPath = '$json';
			}

			return { path, startPath };
		},
		handleCopyClick(commandData: { command: string }) {
			let value: string;
			if (commandData.command === 'value') {
				value = this.getJsonValue();

				this.showToast({
					title: this.i18n.baseText('runData.copyValue.toast'),
					message: '',
					type: 'success',
					duration: 2000,
				});
			} else {
				let startPath = '';
				let path = '';
				if (commandData.command === 'itemPath') {
					const jsonItemPath = this.getJsonItemPath();
					startPath = jsonItemPath.startPath;
					path = jsonItemPath.path;

					this.showToast({
						title: this.i18n.baseText('runData.copyItemPath.toast'),
						message: '',
						type: 'success',
						duration: 2000,
					});
				} else if (commandData.command === 'parameterPath') {
					const jsonParameterPath = this.getJsonParameterPath();
					startPath = jsonParameterPath.startPath;
					path = jsonParameterPath.path;

					this.showToast({
						title: this.i18n.baseText('runData.copyParameterPath.toast'),
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

			this.$telemetry.track('User copied ndv data', {
				node_type: this.activeNode?.type,
				push_ref: this.pushRef,
				run_index: this.runIndex,
				view: 'json',
				copy_type: copyType,
				workflow_id: this.workflowsStore.workflowId,
				pane: this.paneType,
				in_execution_log: this.isReadOnlyRoute,
			});

			void this.clipboard.copy(value);
		},
	},
});
</script>

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
