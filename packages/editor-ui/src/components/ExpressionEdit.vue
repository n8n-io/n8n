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
						<div class="expression-editor">
							<expression-input :parameter="parameter" ref="inputFieldExpression" rows="8" :value="value" :path="path" @change="valueChanged" @keydown.stop="noOp"></expression-input>
						</div>
					</div>

					<div class="expression-result-wrapper">
						<div class="editor-description">
							{{ $locale.baseText('expressionEdit.result') }}
						</div>
						<expression-input :parameter="parameter" resolvedValue="true" ref="expressionResult" rows="8" :value="displayValue" :path="path"></expression-input>
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

export default mixins(
	externalHooks,
	genericHelpers,
).extend({
	name: 'ExpressionEdit',
	props: [
		'dialogVisible',
		'parameter',
		'path',
		'value',
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
				this.callDebounced('updateDisplayValue', 500);
			}
		},

		updateDisplayValue () {
			this.displayValue = this.latestValue;
		},

		closeDialog () {
			// Handle the close externally as the visible parameter is an external prop
			// and is so not allowed to be changed here.
			this.$emit('valueChanged', this.latestValue);
			this.$emit('closeDialog');
			return false;
		},

		itemSelected (eventData: IVariableItemSelected) {
			(this.$refs.inputFieldExpression as any).itemSelected(eventData); // tslint:disable-line:no-any
			this.$externalHooks().run('expressionEdit.itemSelected', { parameter: this.parameter, value: this.value, selectedItem: eventData });
		},
	},
	watch: {
		dialogVisible (newValue) {
			this.displayValue = this.value;
			this.latestValue = this.value;

			const resolvedExpressionValue = this.$refs.expressionResult && (this.$refs.expressionResult as any).getValue() || undefined;  // tslint:disable-line:no-any
			this.$externalHooks().run('expressionEdit.dialogVisibleChanged', { dialogVisible: newValue, parameter: this.parameter, value: this.value, resolvedExpressionValue });

			if (!newValue) {
				this.$telemetry.track('User closed Expression Editor', { empty_expression: (this.value === '=') || (this.value === '={{}}') || !this.value, workflow_id: this.$store.getters.workflowId });
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
		background-color: #f9f9f9;
		border-top-right-radius: 8px;
		border-bottom-right-radius: 8px;
	}
}

.header-side-menu {
	padding: 1em 0 0.5em 1.8em;
	border-top-left-radius: 8px;

	background-color: $--custom-window-sidebar-top;
	color: #555;
	border-bottom: 1px solid $--color-primary;
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
		color: $--color-primary;
	}
}

.variable-selector {
	margin: 0 1em;
}
</style>
