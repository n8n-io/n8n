<template>
	<div v-if="dialogVisible" class="expression-edit" @keydown.stop>
		<el-dialog
			:model-value="dialogVisible"
			class="expression-dialog classic"
			width="80%"
			:title="$locale.baseText('expressionEdit.editExpression')"
			:before-close="closeDialog"
		>
			<el-row>
				<el-col :span="8">
					<div class="header-side-menu">
						<div class="headline">
							{{ $locale.baseText('expressionEdit.editExpression') }}
						</div>
						<div class="sub-headline">
							{{ $locale.baseText('expressionEdit.variableSelector') }}
						</div>
					</div>

					<div class="variable-selector">
						<VariableSelector
							:path="path"
							:redact-values="redactValues"
							@item-selected="itemSelected"
						></VariableSelector>
					</div>
				</el-col>
				<el-col :span="16" class="right-side">
					<div class="expression-editor-wrapper">
						<div class="editor-description">
							<div>
								{{ $locale.baseText('expressionEdit.expression') }}
							</div>
							<div class="hint">
								<span>
									{{ $locale.baseText('expressionEdit.anythingInside') }}
								</span>
								<div class="expression-syntax-example" v-text="`{{ }}`"></div>
								<span>
									{{ $locale.baseText('expressionEdit.isJavaScript') }}
								</span>
								{{ ' ' }}
								<n8n-link size="medium" :to="expressionsDocsUrl">
									{{ $locale.baseText('expressionEdit.learnMore') }}
								</n8n-link>
							</div>
						</div>
						<div class="expression-editor">
							<ExpressionEditorModalInput
								ref="inputFieldExpression"
								:model-value="modelValue"
								:is-read-only="isReadOnly"
								:path="path"
								:class="{ 'ph-no-capture': redactValues }"
								data-test-id="expression-modal-input"
								@change="valueChanged"
								@close="closeDialog"
							/>
						</div>
					</div>

					<div class="expression-result-wrapper">
						<div class="editor-description">
							{{ $locale.baseText('expressionEdit.resultOfItem1') }}
						</div>
						<div :class="{ 'ph-no-capture': redactValues }">
							<ExpressionOutput
								ref="expressionResult"
								:segments="segments"
								:extensions="theme"
								data-test-id="expression-modal-output"
							/>
						</div>
					</div>
				</el-col>
			</el-row>
		</el-dialog>
	</div>
</template>

<script lang="ts">
import { type PropType, defineComponent } from 'vue';
import { mapStores } from 'pinia';
import ExpressionEditorModalInput from '@/components/ExpressionEditorModal/ExpressionEditorModalInput.vue';
import VariableSelector from '@/components/VariableSelector.vue';

import type { IVariableItemSelected } from '@/Interface';

import { EXPRESSIONS_DOCS_URL } from '@/constants';

import { useWorkflowsStore } from '@/stores/workflows.store';
import { useNDVStore } from '@/stores/ndv.store';
import { useExternalHooks } from '@/composables/useExternalHooks';
import { createExpressionTelemetryPayload } from '@/utils/telemetryUtils';
import { useDebounce } from '@/composables/useDebounce';

import type { Segment } from '@/types/expressions';
import ExpressionOutput from './InlineExpressionEditor/ExpressionOutput.vue';
import { outputTheme } from './ExpressionEditorModal/theme';
import type { INodeProperties } from 'n8n-workflow';

export default defineComponent({
	name: 'ExpressionEdit',
	components: {
		ExpressionEditorModalInput,
		ExpressionOutput,
		VariableSelector,
	},
	props: {
		dialogVisible: {
			type: Boolean,
			default: false,
		},
		parameter: {
			type: Object as PropType<INodeProperties>,
			default: () => ({}),
		},
		path: {
			type: String,
			default: '',
		},
		modelValue: {
			type: String,
			default: '',
		},
		eventSource: {
			type: String,
			default: '',
		},
		redactValues: {
			type: Boolean,
			default: false,
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
	},
	setup() {
		const externalHooks = useExternalHooks();
		const { callDebounced } = useDebounce();

		return {
			callDebounced,
			externalHooks,
		};
	},
	data() {
		return {
			displayValue: '',
			latestValue: '',
			segments: [] as Segment[],
			expressionsDocsUrl: EXPRESSIONS_DOCS_URL,
			theme: outputTheme(),
		};
	},
	computed: {
		...mapStores(useNDVStore, useWorkflowsStore),
	},
	watch: {
		dialogVisible(newValue) {
			this.displayValue = this.modelValue;
			this.latestValue = this.modelValue;

			const resolvedExpressionValue =
				(this.$refs.expressionResult as InstanceType<typeof ExpressionOutput>)?.getValue() || '';
			void this.externalHooks.run('expressionEdit.dialogVisibleChanged', {
				dialogVisible: newValue,
				parameter: this.parameter,
				value: this.modelValue,
				resolvedExpressionValue,
			});

			if (!newValue) {
				const telemetryPayload = createExpressionTelemetryPayload(
					this.segments,
					this.modelValue,
					this.workflowsStore.workflowId,
					this.ndvStore.pushRef,
					this.ndvStore.activeNode?.type ?? '',
				);

				this.$telemetry.track('User closed Expression Editor', telemetryPayload);
				void this.externalHooks.run('expressionEdit.closeDialog', telemetryPayload);
			}
		},
	},
	methods: {
		valueChanged({ value, segments }: { value: string; segments: Segment[] }, forceUpdate = false) {
			this.latestValue = value;
			this.segments = segments;

			if (forceUpdate) {
				this.updateDisplayValue();
				this.$emit('update:modelValue', this.latestValue);
			} else {
				void this.callDebounced(this.updateDisplayValue, {
					debounceTime: 500,
				});
			}
		},

		updateDisplayValue() {
			this.displayValue = this.latestValue;
		},

		closeDialog() {
			if (this.latestValue !== this.modelValue) {
				// Handle the close externally as the visible parameter is an external prop
				// and is so not allowed to be changed here.
				this.$emit('update:modelValue', this.latestValue);
			}
			this.$emit('closeDialog');
			return false;
		},

		itemSelected(eventData: IVariableItemSelected) {
			(
				this.$refs.inputFieldExpression as {
					itemSelected: (variable: IVariableItemSelected) => void;
				}
			).itemSelected(eventData);
			void this.externalHooks.run('expressionEdit.itemSelected', {
				parameter: this.parameter,
				value: this.modelValue,
				selectedItem: eventData,
			});

			const trackProperties: {
				event_version: string;
				node_type_dest: string;
				node_type_source?: string;
				parameter_name_dest: string;
				parameter_name_source?: string;
				variable_type?: string;
				is_immediate_input: boolean;
				variable_expression: string;
				node_name: string;
			} = {
				event_version: '2',
				node_type_dest: this.ndvStore.activeNode ? this.ndvStore.activeNode.type : '',
				parameter_name_dest: this.parameter.displayName,
				is_immediate_input: false,
				variable_expression: eventData.variable,
				node_name: this.ndvStore.activeNode ? this.ndvStore.activeNode.name : '',
			};

			if (eventData.variable) {
				let splitVar = eventData.variable.split('.');

				if (eventData.variable.startsWith('Object.keys')) {
					splitVar = eventData.variable.split('(')[1].split(')')[0].split('.');
					trackProperties.variable_type = 'Keys';
				} else if (eventData.variable.startsWith('Object.values')) {
					splitVar = eventData.variable.split('(')[1].split(')')[0].split('.');
					trackProperties.variable_type = 'Values';
				} else {
					trackProperties.variable_type = 'Raw value';
				}

				if (splitVar[0].startsWith("$('")) {
					const match = /\$\('(.*?)'\)/.exec(splitVar[0]);
					if (match && match.length > 1) {
						const sourceNodeName = match[1];
						trackProperties.node_type_source =
							this.workflowsStore.getNodeByName(sourceNodeName)?.type;
						const nodeConnections: Array<Array<{ node: string }>> =
							this.workflowsStore.outgoingConnectionsByNodeName(sourceNodeName).main;
						trackProperties.is_immediate_input =
							nodeConnections &&
							nodeConnections[0] &&
							nodeConnections[0].some(({ node }) => node === this.ndvStore.activeNode?.name || '');

						if (splitVar[1].startsWith('parameter')) {
							trackProperties.parameter_name_source = splitVar[1].split('"')[1];
						}
					}
				} else {
					trackProperties.is_immediate_input = true;

					if (splitVar[0].startsWith('$parameter')) {
						trackProperties.parameter_name_source = splitVar[0].split('"')[1];
					}
				}
			}

			this.$telemetry.track(
				'User inserted item from Expression Editor variable selector',
				trackProperties,
			);
		},
	},
});
</script>

<style scoped lang="scss">
.expression-edit {
	:deep(.expression-dialog) {
		.el-dialog__header {
			padding: 0;
		}
		.el-dialog__title {
			display: none;
		}

		.el-dialog__body {
			padding: 0;
			font-size: var(--font-size-s);
		}

		.right-side {
			background-color: var(--color-background-light);
			border-top-right-radius: 8px;
			border-bottom-right-radius: 8px;
		}
	}
}

.editor-description {
	line-height: 1.5;
	font-weight: bold;
	padding: 0 0 0.5em 0.2em;
	display: flex;
	justify-content: space-between;

	.hint {
		color: var(--color-text-base);
		font-weight: normal;
		display: flex;

		@media (max-width: $breakpoint-xs) {
			display: none;
		}

		span {
			margin-right: var(--spacing-4xs);
		}
		.expression-syntax-example {
			display: inline-block;
			margin-top: 3px;
			height: 16px;
			line-height: 1;
			background-color: var(--color-expression-syntax-example);
			color: var(--color-text-dark);
			margin-right: var(--spacing-4xs);
		}
	}
}

.expression-result-wrapper,
.expression-editor-wrapper {
	padding: 10px;
}

.expression-result-wrapper {
	margin-top: 1em;
}

.header-side-menu {
	padding: 1em 0 0.5em var(--spacing-s);
	border-top-left-radius: 8px;

	background-color: var(--color-background-base);
	color: var(--color-text-dark);
	border-bottom: 1px solid $color-primary;
	margin-bottom: 1em;

	.headline {
		font-size: 1.35em;
		font-weight: 600;
		line-height: 1.5;
	}

	.sub-headline {
		font-weight: 600;
		font-size: 1.1em;
		text-align: center;
		line-height: 1.5;
		padding-top: 1.5em;
		color: $color-primary;
	}
}

.variable-selector {
	margin: 0 var(--spacing-s);
}
</style>
