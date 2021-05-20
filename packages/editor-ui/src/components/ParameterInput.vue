<template>
	<div @keydown.stop :class="parameterInputClasses">
	<expression-edit :dialogVisible="expressionEditDialogVisible" :value="value" :parameter="parameter" :path="path" @closeDialog="closeExpressionEditDialog" @valueChanged="expressionUpdated"></expression-edit>
	<div class="parameter-input ignore-key-press" :style="parameterInputWrapperStyle">
		<div v-if="['json', 'string'].includes(parameter.type) || remoteParameterOptionsLoadingIssues !== null">
			<code-edit :dialogVisible="codeEditDialogVisible" :value="value" :parameter="parameter" @closeDialog="closeCodeEditDialog" @valueChanged="expressionUpdated"></code-edit>
			<text-edit :dialogVisible="textEditDialogVisible" :value="value" :parameter="parameter" @closeDialog="closeTextEditDialog" @valueChanged="expressionUpdated"></text-edit>

			<div v-if="isEditor === true" class="clickable" @click="displayEditDialog()">
				<prism-editor v-if="!codeEditDialogVisible" :lineNumbers="true" :readonly="true" :code="displayValue" language="js"></prism-editor>
			</div>

			<el-input v-else v-model="tempValue" ref="inputField" size="small" :type="getStringInputType" :rows="getArgument('rows')" :value="displayValue" :disabled="!isValueExpression && isReadOnly" @change="valueChanged" @keydown.stop @focus="setFocus" :title="displayTitle" :placeholder="isValueExpression?'':parameter.placeholder">
				<font-awesome-icon v-if="!isValueExpression && !isReadOnly" slot="suffix" icon="external-link-alt" class="edit-window-button clickable" title="Open Edit Window" @click="displayEditDialog()" />
			</el-input>
		</div>
		<div v-else-if="parameter.type === 'dateTime'">
			<el-date-picker
				v-model="tempValue"
				ref="inputField"
				type="datetime"
				size="small"
				:value="displayValue"
				:title="displayTitle"
				:disabled="isReadOnly"
				:placeholder="parameter.placeholder?parameter.placeholder:'Select date and time'"
				:picker-options="dateTimePickerOptions"
				@change="valueChanged"
				@focus="setFocus"
				@keydown.stop
			>
			</el-date-picker>
		</div>

		<div v-else-if="parameter.type === 'number'">
			<!-- <el-slider :value="value" @input="valueChanged"></el-slider> -->
			<el-input-number ref="inputField" size="small" :value="displayValue" :max="getArgument('maxValue')" :min="getArgument('minValue')" :precision="getArgument('numberPrecision')" :step="getArgument('numberStepSize')" :disabled="isReadOnly" @change="valueChanged" @focus="setFocus" @keydown.stop :title="displayTitle" :placeholder="parameter.placeholder"></el-input-number>
		</div>

		<el-select
			v-else-if="parameter.type === 'options'"
			ref="inputField"
			size="small"
			filterable
			:value="displayValue"
			:loading="remoteParameterOptionsLoading"
			:disabled="isReadOnly || remoteParameterOptionsLoading"
			:title="displayTitle"
			@change="valueChanged"
			@keydown.stop
			@focus="setFocus"
		>
			<el-option
				v-for="option in parameterOptions"
				:value="option.value"
				:key="option.value"
				:label="option.name"
			>
				<div class="option-headline">{{ option.name }}</div>
				<div v-if="option.description" class="option-description" v-html="option.description"></div>
			</el-option>
		</el-select>

		<el-select
			v-else-if="parameter.type === 'multiOptions'"
			ref="inputField"
			size="small"
			filterable
			multiple
			:value="displayValue"
			:loading="remoteParameterOptionsLoading"
			:disabled="isReadOnly || remoteParameterOptionsLoading"
			@change="valueChanged"
			@keydown.stop
			@focus="setFocus"
			:title="displayTitle"
		>
			<el-option v-for="option in parameterOptions" :value="option.value" :key="option.value" :label="option.name" >
				<div class="option-headline">{{ option.name }}</div>
				<div v-if="option.description" class="option-description" v-html="option.description"></div>
			</el-option>
		</el-select>

		<div v-else-if="parameter.type === 'color'" ref="inputField" class="color-input">
			<el-color-picker :value="displayValue" :disabled="isReadOnly" @change="valueChanged" size="small" class="color-picker" @focus="setFocus" :title="displayTitle" :show-alpha="getArgument('showAlpha')"></el-color-picker>
			<el-input v-model="tempValue" size="small" type="text" :value="tempValue" :disabled="isReadOnly" @change="valueChanged" @keydown.stop @focus="setFocus" :title="displayTitle" ></el-input>
		</div>

		<div v-else-if="parameter.type === 'boolean'">
			<el-switch ref="inputField" :value="displayValue" @change="valueChanged" active-color="#13ce66" :disabled="isValueExpression || isReadOnly"></el-switch>
			<div class="expression-info clickable" @click="expressionEditDialogVisible = true">Edit Expression</div>
		</div>
	</div>
	<div class="parameter-options" v-if="displayOptionsComputed">
			<el-dropdown trigger="click" @command="optionSelected" size="mini">
				<span class="el-dropdown-link">
					<font-awesome-icon icon="cogs" class="reset-icon clickable" title="Parameter Options"/>
				</span>
				<el-dropdown-menu slot="dropdown">
					<el-dropdown-item command="addExpression" v-if="parameter.noDataExpression !== true && !isValueExpression">Add Expression</el-dropdown-item>
					<el-dropdown-item command="removeExpression" v-if="parameter.noDataExpression !== true && isValueExpression">Remove Expression</el-dropdown-item>
					<el-dropdown-item command="resetValue" :disabled="isDefault" divided>Reset Value</el-dropdown-item>
				</el-dropdown-menu>
			</el-dropdown>

	</div>
	<div class="parameter-issues" v-if="getIssues.length">
		<el-tooltip placement="top" effect="light">
			<div slot="content" v-html="'Issues:<br />&nbsp;&nbsp;- ' + getIssues.join('<br />&nbsp;&nbsp;- ')"></div>
			<font-awesome-icon icon="exclamation-triangle" />
		</el-tooltip>
	</div>

	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { get } from 'lodash';

import {
	INodeUi,
	IVariableItemSelected,
	IVariableSelectorOption,
} from '@/Interface';
import {
	NodeHelpers,
	NodeParameterValue,
	INodeParameters,
	INodePropertyOptions,
	Workflow,
} from 'n8n-workflow';

import CodeEdit from '@/components/CodeEdit.vue';
import ExpressionEdit from '@/components/ExpressionEdit.vue';
// @ts-ignore
import PrismEditor from 'vue-prism-editor';
import TextEdit from '@/components/TextEdit.vue';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { showMessage } from '@/components/mixins/showMessage';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(
	genericHelpers,
	nodeHelpers,
	showMessage,
	workflowHelpers,
)
	.extend({
		name: 'ParameterInput',
		components: {
			CodeEdit,
			ExpressionEdit,
			PrismEditor,
			TextEdit,
		},
		props: [
			'displayOptions', // boolean
			'parameter', // NodeProperties
			'path', // string
			'value',
			'isCredential', // boolean
		],
		data () {
			return {
				codeEditDialogVisible: false,
				nodeName: '',
				expressionAddOperation: 'set' as 'add' | 'set',
				expressionEditDialogVisible: false,
				remoteParameterOptions: [] as INodePropertyOptions[],
				remoteParameterOptionsLoading: false,
				remoteParameterOptionsLoadingIssues: null as string | null,
				textEditDialogVisible: false,
				tempValue: '', //  el-date-picker and el-input does not seem to work without v-model so add one
				dateTimePickerOptions: {
					shortcuts: [
						{
							text: 'Today',
							// tslint:disable-next-line:no-any
							onClick (picker: any) {
								picker.$emit('pick', new Date());
							},
						},
						{
							text: 'Yesterday',
							// tslint:disable-next-line:no-any
							onClick (picker: any) {
								const date = new Date();
								date.setTime(date.getTime() - 3600 * 1000 * 24);
								picker.$emit('pick', date);
							},
						},
						{
							text: 'A week ago',
							// tslint:disable-next-line:no-any
							onClick (picker: any) {
								const date = new Date();
								date.setTime(date.getTime() - 3600 * 1000 * 24 * 7);
								picker.$emit('pick', date);
							},
						},
					],
				},
			};
		},
		watch: {
			dependentParametersValues () {
				// Reload the remote parameters whenever a parameter
				// on which the current field depends on changes
				this.loadRemoteParameterOptions();
			},
			value () {
				if (this.parameter.type === 'color' && this.getArgument('showAlpha') === true) {
					// Do not set for color with alpha else wrong value gets displayed in field
					return;
				}
				this.tempValue = this.displayValue as string;
			},
		},
		computed: {
			dependentParametersValues (): string | null {
				const loadOptionsDependsOn = this.getArgument('loadOptionsDependsOn') as string[] | undefined;

				if (loadOptionsDependsOn === undefined) {
					return null;
				}

				// Get the resolved parameter values of the current node
				const currentNodeParameters = this.$store.getters.activeNode.parameters;
				const resolvedNodeParameters = this.resolveParameter(currentNodeParameters);

				const returnValues: string[] = [];
				for (const parameterPath of loadOptionsDependsOn) {
					returnValues.push(get(resolvedNodeParameters, parameterPath) as string);
				}

				return returnValues.join('|');
			},
			node (): INodeUi | null {
				return this.$store.getters.activeNode;
			},
			displayTitle (): string {
				let title = `Parameter: "${this.shortPath}"`;
				if (this.getIssues.length) {
					title += ` has issues`;
					if (this.isValueExpression === true) {
						title += ` and expression`;
					}
					title += `!`;
				} else {
					if (this.isValueExpression === true) {
						title += ` has expression`;
					}
				}

				return title;
			},
			displayValue (): string | number | boolean | null {
				if (this.remoteParameterOptionsLoading === true) {
					// If it is loading options from server display
					// to user that the data is loading. If not it would
					// display the user the key instead of the value it
					// represents
					return 'Loading options...';
				}

				let returnValue;
				if (this.isValueExpression === false) {
					returnValue = this.value;
				} else {
					returnValue = this.expressionValueComputed;
				}

				if (this.parameter.type === 'color' && this.getArgument('showAlpha') === true && returnValue.charAt(0) === '#') {
					// Convert the value to rgba that el-color-picker can display it correctly
					const bigint = parseInt(returnValue.slice(1), 16);
					const h = [];
					h.push((bigint >> 24) & 255);
					h.push((bigint >> 16) & 255);
					h.push((bigint >> 8) & 255);
					h.push((255 - bigint & 255) / 255);

					returnValue = 'rgba('+h.join()+')';
				}

				if (returnValue !== undefined && returnValue !== null && this.parameter.type === 'string') {
					const rows = this.getArgument('rows');
					if (rows === undefined || rows === 1) {
						returnValue = returnValue.toString().replace(/\n/, '|');
					}
				}

				return returnValue;
			},
			displayOptionsComputed (): boolean {
				if (this.isReadOnly === true) {
					return false;
				}
				if (this.parameter.type === 'collection') {
					return false;
				}

				if (this.displayOptions === true) {
					return true;
				}

				return false;
			},
			expressionValueComputed (): NodeParameterValue | null {
				if (this.node === null) {
					return null;
				}

				let computedValue: NodeParameterValue;

				try {
					computedValue = this.resolveExpression(this.value) as NodeParameterValue;
				} catch (error) {
					computedValue = `[ERROR: ${error.message}]`;
				}

				// Try to convert it into the corret type
				if (this.parameter.type === 'number') {
					computedValue = parseInt(computedValue as string, 10);
					if (isNaN(computedValue)) {
						return null;
					}
				}

				return computedValue;
			},
			getStringInputType () {
				if (this.getArgument('password') === true) {
					return 'password';
				}

				const rows = this.getArgument('rows');
				if (rows !== undefined && rows > 1) {
					return 'textarea';
				}

				return 'text';
			},
			getIssues (): string[] {
				if (this.isCredential === true || this.node === null) {
					return [];
				}

				const newPath = this.shortPath.split('.');
				newPath.pop();

				const issues = NodeHelpers.getParameterIssues(this.parameter, this.node.parameters, newPath.join('.'));

				if (['options', 'multiOptions'].includes(this.parameter.type) && this.remoteParameterOptionsLoading === false && this.remoteParameterOptionsLoadingIssues === null) {
					// Check if the value resolves to a valid option
					// Currently it only displays an error in the node itself in
					// case the value is not valid. The workflow can still be executed
					// and the error is not displayed on the node in the workflow
					const validOptions = this.parameterOptions!.map((options: INodePropertyOptions) => options.value);

					const checkValues: string[] = [];
					if (Array.isArray(this.displayValue)) {
						checkValues.push.apply(checkValues, this.displayValue);
					} else {
						checkValues.push(this.displayValue as string);
					}

					for (const checkValue of checkValues) {
						if (checkValue === null || !validOptions.includes(checkValue)) {
							if (issues.parameters === undefined) {
								issues.parameters = {};
							}
							issues.parameters[this.parameter.name] = [`The value "${checkValue}" is not supported!`];
						}
					}
				} else if (this.remoteParameterOptionsLoadingIssues !== null) {
					if (issues.parameters === undefined) {
						issues.parameters = {};
					}
					issues.parameters[this.parameter.name] = [`There was a problem loading the parameter options from server: "${this.remoteParameterOptionsLoadingIssues}"`];
				}

				if (issues !== undefined &&
					issues.parameters !== undefined &&
					issues.parameters[this.parameter.name] !== undefined) {
					return issues.parameters[this.parameter.name];
				}

				return [];
			},
			isDefault (): boolean {
				return this.parameter.default === this.value;
			},
			isEditor (): boolean {
				return this.getArgument('editor') === 'code';
			},
			isValueExpression () {
				if (this.parameter.noDataExpression === true) {
					return false;
				}
				if (typeof this.value === 'string' && this.value.charAt(0) === '=') {
					return true;
				}
				return false;
			},
			parameterOptions (): INodePropertyOptions[] {
				if (this.remoteMethod === undefined) {
					// Options are already given
					return this.parameter.options;
				}

				// Options get loaded from server
				return this.remoteParameterOptions;
			},
			parameterInputClasses () {
				const classes = [];
				if (this.isValueExpression) {
					classes.push('expression');
				}
				if (this.getIssues.length) {
					classes.push('has-issues');
				}
				return classes;
			},
			parameterInputWrapperStyle () {
				let deductWidth = 0;
				const styles = {
					width: '100%',
				};
				if (this.displayOptionsComputed === true) {
					deductWidth += 25;
				}
				if (this.getIssues.length) {
					deductWidth += 20;
				}

				if (deductWidth !== 0) {
					styles.width = `calc(100% - ${deductWidth}px)`;
				}

				return styles;
			},
			remoteMethod (): string | undefined {
				return this.getArgument('loadOptionsMethod') as string | undefined;
			},
			shortPath (): string {
				const shortPath = this.path.split('.');
				shortPath.shift();
				return shortPath.join('.');
			},
			workflow (): Workflow {
				return this.getWorkflow();
			},
		},
		methods: {
			async loadRemoteParameterOptions () {
				if (this.node === null || this.remoteMethod === undefined || this.remoteParameterOptionsLoading) {
					return;
				}
				this.remoteParameterOptionsLoadingIssues = null;
				this.remoteParameterOptionsLoading = true;
				this.remoteParameterOptions.length = 0;

				// Get the resolved parameter values of the current node
				const currentNodeParameters = this.$store.getters.activeNode.parameters;
				const resolvedNodeParameters = this.resolveParameter(currentNodeParameters) as INodeParameters;

				try {
					const options = await this.restApi().getNodeParameterOptions(this.node.type, this.path, this.remoteMethod, resolvedNodeParameters, this.node.credentials);
					this.remoteParameterOptions.push.apply(this.remoteParameterOptions, options);
				} catch (error) {
					this.remoteParameterOptionsLoadingIssues = error.message;
				}

				this.remoteParameterOptionsLoading = false;
			},
			closeCodeEditDialog () {
				this.codeEditDialogVisible = false;
			},
			closeExpressionEditDialog () {
				this.expressionEditDialogVisible = false;
			},
			closeTextEditDialog () {
				this.textEditDialogVisible = false;
			},
			displayEditDialog () {
				if (this.isEditor) {
					this.codeEditDialogVisible = true;
				} else {
					this.textEditDialogVisible = true;
				}
			},
			getArgument (argumentName: string): string | number | boolean | undefined {
				if (this.parameter.typeOptions === undefined) {
					return undefined;
				}

				if (this.parameter.typeOptions[argumentName] === undefined) {
					return undefined;
				}

				return this.parameter.typeOptions[argumentName];
			},
			expressionUpdated (value: string) {
				this.valueChanged(value);
			},
			setFocus () {
				if (this.isValueExpression) {
					this.expressionEditDialogVisible = true;
					return;
				}

				if (['json', 'string'].includes(this.parameter.type) && this.getArgument('alwaysOpenEditWindow')) {
					this.displayEditDialog();
					return;
				}

				if (this.node !== null) {
					// When an event like mouse-click removes the active node while
					// editing is active it does not know where to save the value to.
					// For that reason do we save the node-name here. We could probably
					// also just do that once on load but if Vue decides for some reason to
					// reuse the input it could have the wrong value so lets set it everytime
					// just to be sure
					this.nodeName = this.node.name;
				}

				// Set focus on field
				setTimeout(() => {
					// @ts-ignore
					if (this.$refs.inputField.$el) {
						// @ts-ignore
						(this.$refs.inputField.$el.querySelector('input') as HTMLInputElement).focus();
					}
				});
			},
			rgbaToHex (value: string): string | null {
				// Convert rgba to hex from: https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
				const valueMatch = (value as string).match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d+(\.\d+)?)\)$/);
				if (valueMatch === null) {
					// TODO: Display something if value is not valid
					return null;
				}
				const [r, g, b, a] = valueMatch.splice(1, 4).map(v => Number(v));
				return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1) + ((1 << 8) + Math.floor((1-a)*255)).toString(16).slice(1);
			},
			valueChanged (value: string | number | boolean | Date | null) {
				if (value instanceof Date) {
					value = value.toISOString();
				}

				if (this.parameter.type === 'color' && this.getArgument('showAlpha') === true && value !== null && value.toString().charAt(0) !== '#') {
					const newValue = this.rgbaToHex(value as string);
					if (newValue !== null) {
						this.tempValue = newValue;
						value = newValue;
					}
				}

				const parameterData = {
					node: this.node !== null ? this.node.name : this.nodeName,
					name: this.path,
					value,
				};

				this.$emit('valueChanged', parameterData);
			},
			optionSelected (command: string) {
				if (command === 'resetValue') {
					this.valueChanged(this.parameter.default);
				} else if (command === 'addExpression') {
					this.valueChanged(`=${this.value}`);
					this.expressionEditDialogVisible = true;
				} else if (command === 'removeExpression') {
					this.valueChanged(this.expressionValueComputed || null);
				}
			},
		},
		mounted () {
			this.tempValue = this.displayValue as string;
			if (this.node !== null) {
				this.nodeName = this.node.name;
			}

			if (this.parameter.type === 'color' && this.getArgument('showAlpha') === true && this.displayValue !== null && this.displayValue.toString().charAt(0) !== '#') {
				const newValue = this.rgbaToHex(this.displayValue as string);
				if (newValue !== null) {
					this.tempValue = newValue;
				}
			}

			if (this.remoteMethod !== undefined && this.node !== null) {
				// Make sure to load the parameter options
				// directly and whenever the credentials change
				this.$watch(() => this.node!.credentials, () => {
					this.loadRemoteParameterOptions();
				}, { deep: true, immediate: true });

				// Reload function on change element from
				// displayOptions.typeOptions.reloadOnChange parameters
				if (this.parameter.typeOptions && this.parameter.typeOptions.reloadOnChange) {
					// Get all paramter in reloadOnChange property
					// This reload when parameters in reloadOnChange is updated
					const paramtersOnChange : string[] = this.parameter.typeOptions.reloadOnChange;
					for (let i = 0; i < paramtersOnChange.length; i++) {
						const parameter = paramtersOnChange[i] as string;
						if (parameter in this.node.parameters) {
							this.$watch(() => {
								if (this.node && this.node.parameters && this.node.parameters[parameter]) {
									return this.node.parameters![parameter];
								} else {
									return null;
								}
							}, () => {
								this.loadRemoteParameterOptions();
							}, { deep: true, immediate: true });
						}
					}
				}
			}
		},
	});
</script>

<style scoped lang="scss">

.parameter-input {
	display: inline-block;
}

.parameter-options {
	width: 25px;
	text-align: right;
	float: right;
}

.parameter-issues {
	width: 20px;
	text-align: right;
	float: right;
	color: #ff8080;
	font-size: 1.2em;
}

.color-input {
	background-color: $--custom-input-background;
	border-radius: 16px;
	line-height: 2.2em;

	.el-input {
		width: 90px;
	}
	.color-picker {
		float: left;
		z-index: 10;
	}
}

</style>

<style lang="scss">

.ql-editor {
	padding: 6px;
	line-height: 26px;
}

.expression-info {
	display: none;
}
.expression {
	.expression-info {
		display: inline-block;
		background-color: #441133;
		color: #fff;
		font-size: 0.7em;
		line-height: 2.5em;
		padding: 0 0.5em;
		margin-left: 1em;
		border-radius: 3px;
	}

	.el-switch__core {
		border: 1px dashed $--custom-expression-text;
	}

	.el-input > .el-input__inner,
	.el-select > .el-input__inner,
	.el-textarea textarea,
	.el-textarea textarea:active,
	.el-textarea textarea:focus,
	.el-textarea textarea:hover,
	.el-input-number,
	.color-input {
		border: 1px dashed $--custom-expression-text;
		color: $--custom-expression-text;
		background-color: $--custom-expression-background;
	}

	.el-input-number input,
	.color-input .el-input__inner {
		background-color: $--custom-expression-background;
	}

	// Overwrite again for number and color inputs to not create
	// a second border inside of the already existing one
	.color-input .el-input > .el-input__inner,
	.el-input-number .el-input > .el-input__inner {
		border: none;
		background-color: none;
	}
}

.has-issues {
	.el-textarea textarea,
	.el-textarea textarea:active,
	.el-textarea textarea:focus,
	.el-textarea textarea:hover,
	.el-input-number input,
	.el-input-number input:active,
	.el-input-number input:focus,
	.el-input-number input:hover,
	.el-input-number [role="button"],
	.el-input-number [role="button"]:active,
	.el-input-number [role="button"]:focus,
	.el-input-number [role="button"]:hover,
	.el-input input,
	.el-input input:active,
	.el-input input:focus,
	.el-input input:hover {
		border-width: 1px;
		border-color: #ff8080;
		border-style: solid;
	}
}

.el-dropdown {
	color: #999;
}

.option-headline {
	font-weight: 600;
}
li:not(.selected) .option-description {
	color: $--custom-font-very-light;
}

.option-description {
	font-weight: 400;
	white-space: normal;
	max-width: 350px;
	margin-top: -4px;
}

.edit-window-button {
	display: none;
}

.parameter-input:hover .edit-window-button {
	display: inline;
}

</style>
