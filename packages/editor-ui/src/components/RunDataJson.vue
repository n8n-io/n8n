<template>
	<div :class="$style.jsonDisplay">
		<div v-show="!editMode.enabled" :class="$style['actions-group']">
			<el-dropdown
				trigger="click"
				@command="handleCopyClick"
				@visible-change="copyDropdownOpen = $event"
			>
					<span class="el-dropdown-link">
						<n8n-icon-button
							:title="$locale.baseText('runData.copyToClipboard')"
							icon="copy"
							type="tertiary"
							:circle="false"
						/>
					</span>
				<el-dropdown-menu slot="dropdown">
					<el-dropdown-item :command="{command: 'value'}">
						{{ $locale.baseText('runData.copyValue') }}
					</el-dropdown-item>
					<el-dropdown-item :command="{command: 'itemPath'}" divided>
						{{ $locale.baseText('runData.copyItemPath') }}
					</el-dropdown-item>
					<el-dropdown-item :command="{command: 'parameterPath'}">
						{{ $locale.baseText('runData.copyParameterPath') }}
					</el-dropdown-item>
				</el-dropdown-menu>
			</el-dropdown>
		</div>

		<vue-json-pretty
			:data="jsonData"
			:deep="10"
			:showLength="true"
			:selected-value.sync="selectedJsonPath"
			rootPath=""
			selectableType="single"
			class="json-data"
		>
			<template #nodeKey="{ node }">
				<span>{{node.key}}</span>
			</template>
			<template #nodeValue="{ node }">
				<span>{{node.content}}</span>
			</template>
		</vue-json-pretty>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';
import jp from "jsonpath";
import VueJsonPretty from 'vue-json-pretty';
import { LOCAL_STORAGE_MAPPING_FLAG } from '@/constants';
import { IDataObject, INodeExecutionData } from "n8n-workflow";
import Draggable from '@/components/Draggable.vue';
import { externalHooks } from '@/components/mixins/externalHooks';
import { clearJsonKey, convertPath, executionDataToJson } from "@/components/helpers";
import { INodeUi } from "@/Interface";
import { pinData } from "@/components/mixins/pinData";
import { copyPaste } from "@/components/mixins/copyPaste";
import { nodeHelpers } from "@/components/mixins/nodeHelpers";
import { genericHelpers } from "@/components/mixins/genericHelpers";

// A path that does not exist so that nothing is selected by default
const nonExistingJsonPath = '_!^&*';

export default mixins(
	externalHooks,
	nodeHelpers,
	genericHelpers,
	pinData,
	copyPaste,
).extend({
	name: 'run-data-json',
	components: {
		VueJsonPretty,
		Draggable,
	},
	props: {
		editMode: {
			type: Object as () => { enabled?: boolean; value?: string; },
		},
		currentOutputIndex: {
			type: Number,
		},
		sessionId: {
			type: String,
		},
		node: {
			type: Object as () => INodeUi,
		},
		inputData: {
			type: Array,
		},
		mappingEnabled: {
			type: Boolean,
		},
		distanceFromActive: {
			type: Number,
		},
		showMappingHint: {
			type: Boolean,
		},
		runIndex: {
			type: Number,
		},
		totalRuns: {
			type: Number,
		},
	},
	data() {
		return {
			selectedJsonPath: nonExistingJsonPath,
			mappingHintVisible: false,
			copyDropdownOpen: false,
			dragStarted: false,
			displayMode: 'json',
		};
	},
	mounted() {
		if (this.showMappingHint) {
			this.mappingHintVisible = true;

			setTimeout(() => {
				this.mappingHintVisible = false;
			}, 6000);
		}
	},
	computed: {
		activeNode(): INodeUi {
			return this.$store.getters.activeNode;
		},
		jsonData (): IDataObject[] {
			return executionDataToJson(this.inputData as INodeExecutionData[]);
		},
		focusedMappableInput(): string {
			return this.$store.getters['ui/focusedMappableInput'];
		},
		showHint(): boolean {
			return (
				!this.dragStarted &&
				((this.showMappingHint && this.mappingHintVisible) ||
					(!!this.focusedMappableInput &&
						window.localStorage.getItem(LOCAL_STORAGE_MAPPING_FLAG) !== 'true'))
			);
		},
	},
	methods: {
		handleCopyClick (commandData: { command: string }) {
			const isNotSelected = this.selectedJsonPath === nonExistingJsonPath;
			const selectedPath = isNotSelected ? '[""]' : this.selectedJsonPath;

			let selectedValue = jp.query(this.jsonData, `$${selectedPath}`)[0];
			if (isNotSelected) {
				if (this.hasPinData) {
					selectedValue = clearJsonKey(this.pinData as object);
				} else {
					selectedValue = executionDataToJson(this.getNodeInputData(this.node, this.runIndex, this.currentOutputIndex));
				}
			}

			const newPath = convertPath(selectedPath);

			let value: string;
			if (commandData.command === 'value') {
				if (typeof selectedValue === 'object') {
					value = JSON.stringify(selectedValue, null, 2);
				} else {
					value = selectedValue.toString();
				}

				this.$showToast({
					title: this.$locale.baseText('runData.copyValue.toast'),
					message: '',
					type: 'success',
					duration: 2000,
				});
			} else {
				let startPath = '';
				let path = '';
				if (commandData.command === 'itemPath') {
					const pathParts = newPath.split(']');
					const index = pathParts[0].slice(1);
					path = pathParts.slice(1).join(']');
					startPath = `$item(${index}).$node["${this.node!.name}"].json`;

					this.$showToast({
						title: this.$locale.baseText('runData.copyItemPath.toast'),
						message: '',
						type: 'success',
						duration: 2000,
					});
				} else if (commandData.command === 'parameterPath') {
					path = newPath.split(']').slice(1).join(']');
					startPath = `$node["${this.node!.name}"].json`;

					this.$showToast({
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
				view: this.displayMode,
				copy_type: copyType,
				workflow_id: this.$store.getters.workflowId,
				pane: 'output',
				in_execution_log: this.isReadOnly,
			});

			this.copyToClipboard(value);
		},
	},
	watch: {

	},
});
</script>

<style lang="scss" module>
.jsonDisplay {
	position: absolute;
	top: 0;
	left: 0;
	padding-left: var(--spacing-s);
	right: 0;
	overflow-y: auto;
	line-height: 1.5;
	word-break: normal;
	height: 100%;
	padding-bottom: var(--spacing-3xl);
	background-color: var(--color-background-base);
	padding-top: var(--spacing-s);

	&:hover{
		.actions-group {
			opacity: 1;
		}
	}
}

.actions-group {
	position: sticky;
	z-index: 10;
	top: 0;
	padding-right: var(--spacing-s);
	opacity: 0;
	transition: opacity 0.3s ease;
	text-align: right;
}
</style>

<style lang="scss">
.vjs-tree {
	color: var(--color-json-default);
}

.vjs-tree-node {
	&:hover,
	&.is-highlight{
		background-color: var(--color-json-highlight);
	}
}


.vjs-tree .vjs-value-null {
	&, span {
		color: var(--color-json-null);
	}
}

.vjs-tree .vjs-value-boolean {
	&, span {
		color: var(--color-json-boolean);
	}
}

.vjs-tree .vjs-value-number {
	&, span {
		color: var(--color-json-number);
	}
}

.vjs-tree .vjs-value-string {
	&, span {
		color: var(--color-json-string);
	}
}

.vjs-tree .vjs-key {
	color: var(--color-json-key);
}

.vjs-tree .vjs-tree__brackets {
	color: var(--color-json-brackets);
}

.vjs-tree .vjs-tree__brackets:hover {
	color: var(--color-json-brackets-hover);
}

.vjs-tree .vjs-tree__content.has-line {
	border-left: 1px dotted var(--color-json-line);
}
</style>
