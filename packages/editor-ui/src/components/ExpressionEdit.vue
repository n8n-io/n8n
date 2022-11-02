<template>
	<div v-if="dialogVisible" @keydown.stop>
		<el-dialog :visible="dialogVisible" custom-class="expression-dialog classic" append-to-body width="80%" :title="$locale.baseText('expressionEdit.editExpression')" :before-close="closeDialog">
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
						<variable-selector :path="path" @itemSelected="itemSelected"></variable-selector>
					</div>
				</el-col>
				<el-col :span="16" class="right-side">
					<div class="expression-editor-wrapper">
						<div class="editor-description">
							{{ $locale.baseText('expressionEdit.expression') }}
						</div>
						<div class="expression-editor ph-no-capture">
							<expression-input :parameter="parameter" ref="inputFieldExpression" rows="8" :value="value" :path="path" @change="valueChanged" @keydown.stop="noOp"></expression-input>
						</div>
					</div>

					<div class="expression-result-wrapper">
						<div class="editor-description">
							{{ $locale.baseText('expressionEdit.result') }}
						</div>
						<div class="ph-no-capture">
							<expression-input :parameter="parameter" resolvedValue="true" ref="expressionResult" rows="8" :value="displayValue" :path="path"></expression-input>
						</div>
					</div>

				</el-col>
			</el-row>

		</el-dialog>
	</div>
</template>

<script lang="ts">
import ExpressionInput from '@/components/ExpressionInput.vue';
import VariableSelector from '@/components/VariableSelector.vue';

import { IVariableItemSelected } from '@/Interface';

import { externalHooks } from '@/components/mixins/externalHooks';
import { genericHelpers } from '@/components/mixins/genericHelpers';

import mixins from 'vue-typed-mixins';
import { hasExpressionMapping } from './helpers';
import { debounceHelper } from './mixins/debounce';

export default mixins(
	externalHooks,
	genericHelpers,
	debounceHelper,
).extend({
	name: 'ExpressionEdit',
	props: [
		'dialogVisible',
		'parameter',
		'path',
		'value',
		'eventSource',
	],
	components: {
		ExpressionInput,
		VariableSelector,
	},
	data () {
		return {
			displayValue: '',
			latestValue: '',
		};
	},
	methods: {
		valueChanged (value: string, forceUpdate = false) {
			this.latestValue = value;

			if (forceUpdate === true) {
				this.updateDisplayValue();
				this.$emit('valueChanged', this.latestValue);
			} else {
				this.callDebounced('updateDisplayValue', { debounceTime: 500 });
			}
		},

		updateDisplayValue () {
			this.displayValue = this.latestValue;
		},

		closeDialog () {
			if (this.latestValue !== this.value) {
				// Handle the close externally as the visible parameter is an external prop
				// and is so not allowed to be changed here.
				this.$emit('valueChanged', this.latestValue);
			}
			this.$emit('closeDialog');
			return false;
		},

		itemSelected (eventData: IVariableItemSelected) {
			(this.$refs.inputFieldExpression as any).itemSelected(eventData); // tslint:disable-line:no-any
			this.$externalHooks().run('expressionEdit.itemSelected', { parameter: this.parameter, value: this.value, selectedItem: eventData });

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
				node_type_dest: this.$store.getters['ndv/activeNode'].type,
				parameter_name_dest: this.parameter.displayName,
				is_immediate_input: false,
				variable_expression: eventData.variable,
				node_name: this.$store.getters['ndv/activeNode'].name,
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

				if (splitVar[0].startsWith('$node')) {
					const sourceNodeName = splitVar[0].split('"')[1];
					trackProperties.node_type_source = this.$store.getters.getNodeByName(sourceNodeName).type;
					const nodeConnections: Array<Array<{ node: string }>> = this.$store.getters.outgoingConnectionsByNodeName(sourceNodeName).main;
					trackProperties.is_immediate_input = (nodeConnections && nodeConnections[0] && !!nodeConnections[0].find(({ node }) => node === this.$store.getters['ndv/activeNode'].name)) ? true : false;

					if (splitVar[1].startsWith('parameter')) {
						trackProperties.parameter_name_source = splitVar[1].split('"')[1];
					}

				} else {
					trackProperties.is_immediate_input = true;

					if(splitVar[0].startsWith('$parameter')) {
						trackProperties.parameter_name_source = splitVar[0].split('"')[1];
					}
				}
			}

			this.$telemetry.track('User inserted item from Expression Editor variable selector', trackProperties);
		},
	},
	watch: {
		dialogVisible (newValue) {
			this.displayValue = this.value;
			this.latestValue = this.value;

			const resolvedExpressionValue = this.$refs.expressionResult && (this.$refs.expressionResult as any).getValue() || undefined;  // tslint:disable-line:no-any
			this.$externalHooks().run('expressionEdit.dialogVisibleChanged', { dialogVisible: newValue, parameter: this.parameter, value: this.value, resolvedExpressionValue });

			if (!newValue) {
				const telemetryPayload = {
					empty_expression: (this.value === '=') || (this.value === '={{}}') || !this.value,
					workflow_id: this.$store.getters.workflowId,
					source: this.eventSource,
					session_id: this.$store.getters['ndv/ndvSessionId'],
					has_parameter: this.value.includes('$parameter'),
					has_mapping: hasExpressionMapping(this.value),
				};
				this.$telemetry.track('User closed Expression Editor', telemetryPayload);
				this.$externalHooks().run('expressionEdit.closeDialog', telemetryPayload);
			}
		},
	},
});
</script>

<style scoped lang="scss">
.editor-description {
	line-height: 1.5;
	font-weight: bold;
	padding: 0 0 0.5em 0.2em;;
}

.expression-result-wrapper,
.expression-editor-wrapper {
	padding: 10px;
}

.expression-result-wrapper {
	margin-top: 1em;
}

::v-deep .expression-dialog {
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

.header-side-menu {
	padding: 1em 0 0.5em 1.8em;
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
	margin: 0 1em;
}
</style>
