<template>
	<div :class="$style.actionsGroup">
		<n8n-icon-button
			v-if="noSelection"
			:title="$locale.baseText('runData.copyToClipboard')"
			icon="copy"
			type="tertiary"
			:circle="false"
			@click="handleCopyClick({ command: 'value' })"
		/>
		<el-dropdown v-else trigger="click" @command="handleCopyClick">
			<span class="el-dropdown-link">
				<n8n-icon-button
					:title="$locale.baseText('runData.copyToClipboard')"
					icon="copy"
					type="tertiary"
					:circle="false"
				/>
			</span>
			<template #dropdown>
				<el-dropdown-menu>
					<el-dropdown-item :command="{ command: 'value' }">
						{{ $locale.baseText('runData.copyValue') }}
					</el-dropdown-item>
					<el-dropdown-item :command="{ command: 'itemPath' }" divided>
						{{ $locale.baseText('runData.copyItemPath') }}
					</el-dropdown-item>
					<el-dropdown-item :command="{ command: 'parameterPath' }">
						{{ $locale.baseText('runData.copyParameterPath') }}
					</el-dropdown-item>
				</el-dropdown-menu>
			</template>
		</el-dropdown>
	</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { mapStores } from 'pinia';
import jp from 'jsonpath';
import type { INodeUi } from '@/Interface';
import type { IDataObject } from 'n8n-workflow';
import { copyPaste } from '@/mixins/copyPaste';
import { pinData } from '@/mixins/pinData';
import { nodeHelpers } from '@/mixins/nodeHelpers';
import { genericHelpers } from '@/mixins/genericHelpers';
import { clearJsonKey, convertPath, executionDataToJson } from '@/utils';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useToast } from '@/composables';

type JsonPathData = {
	path: string;
	startPath: string;
};

// A path that does not exist so that nothing is selected by default
export const nonExistingJsonPath = '_!^&*';

export default defineComponent({
	name: 'run-data-json-actions',
	mixins: [genericHelpers, nodeHelpers, pinData, copyPaste],

	props: {
		node: {
			type: Object as PropType<INodeUi>,
		},
		paneType: {
			type: String,
		},
		sessionId: {
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
		return {
			...useToast(),
		};
	},
	computed: {
		...mapStores(useNDVStore, useWorkflowsStore),
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
				if (this.hasPinData) {
					selectedValue = clearJsonKey(this.pinData as object);
				} else {
					selectedValue = executionDataToJson(
						this.getNodeInputData(this.node, this.runIndex, this.currentOutputIndex),
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
			startPath = `$item(${index}).$node["${this.node!.name}"].json`;

			return { path, startPath };
		},
		getJsonParameterPath(): JsonPathData {
			const newPath = convertPath(this.normalisedJsonPath);
			const path = newPath.split(']').slice(1).join(']');
			let startPath = `$node["${this.node!.name}"].json`;

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
					title: this.$locale.baseText('runData.copyValue.toast'),
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
						title: this.$locale.baseText('runData.copyItemPath.toast'),
						message: '',
						type: 'success',
						duration: 2000,
					});
				} else if (commandData.command === 'parameterPath') {
					const jsonParameterPath = this.getJsonParameterPath();
					startPath = jsonParameterPath.startPath;
					path = jsonParameterPath.path;

					this.showToast({
						title: this.$locale.baseText('runData.copyParameterPath.toast'),
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
				node_type: this.activeNode.type,
				session_id: this.sessionId,
				run_index: this.runIndex,
				view: 'json',
				copy_type: copyType,
				workflow_id: this.workflowsStore.workflowId,
				pane: this.paneType,
				in_execution_log: this.isReadOnly,
			});

			this.copyToClipboard(value);
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
