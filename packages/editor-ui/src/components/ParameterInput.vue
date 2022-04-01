<template>
	<div @keydown.stop :class="parameterInputClasses">
	<expression-edit :dialogVisible="expressionEditDialogVisible" :value="value" :parameter="parameter" :path="path" @closeDialog="closeExpressionEditDialog" @valueChanged="expressionUpdated"></expression-edit>
	<div class="parameter-input ignore-key-press" :style="parameterInputWrapperStyle" @click="openExpressionEdit">

		<n8n-input
			v-if="isValueExpression && showExpressionAsTextInput"
			:size="inputSize"
			:value="expressionDisplayValue"
			:disabled="isReadOnly"
			:title="displayTitle"
			@keydown.stop
		/>

		<div v-else-if="['json', 'string'].includes(parameter.type) || remoteParameterOptionsLoadingIssues !== null">
			<code-edit v-if="codeEditDialogVisible" :value="value" :parameter="parameter" :type="editorType" :codeAutocomplete="codeAutocomplete" :path="path" @closeDialog="closeCodeEditDialog" @valueChanged="expressionUpdated"></code-edit>
			<text-edit :dialogVisible="textEditDialogVisible" :value="value" :parameter="parameter" :path="path" @closeDialog="closeTextEditDialog" @valueChanged="expressionUpdated"></text-edit>

			<div v-if="isEditor === true" class="code-edit clickable" @click="displayEditDialog()">
				<prism-editor v-if="!codeEditDialogVisible" :lineNumbers="true" :readonly="true" :code="displayValue" language="js"></prism-editor>
			</div>

			<n8n-input
				v-else
				v-model="tempValue"
				ref="inputField"
				:size="inputSize"
				:type="getStringInputType"
				:rows="getArgument('rows')"
				:value="displayValue"
				:disabled="isReadOnly"
				@input="onTextInputChange"
				@change="valueChanged"
				@keydown.stop
				@focus="setFocus"
				@blur="onBlur"
				:title="displayTitle"
				:placeholder="isValueExpression ? '' : getPlaceholder()"
			>
				<div slot="suffix" class="expand-input-icon-container">
					<font-awesome-icon v-if="!isValueExpression && !isReadOnly" icon="external-link-alt" class="edit-window-button clickable" :title="$locale.baseText('parameterInput.openEditWindow')" @click="displayEditDialog()" />
				</div>
			</n8n-input>
		</div>

		<div v-else-if="parameter.type === 'color'" ref="inputField" class="color-input">
			<el-color-picker
				size="small"
				class="color-picker"
				:value="displayValue"
				:disabled="isReadOnly"
				@focus="setFocus"
				@blur="onBlur"
				@change="valueChanged"
				:title="displayTitle"
				:show-alpha="getArgument('showAlpha')"
			/>
			<n8n-input
				v-model="tempValue"
				:size="inputSize"
				type="text"
				:value="tempValue"
				:disabled="isReadOnly"
				@change="valueChanged"
				@keydown.stop
				@focus="setFocus"
				@blur="onBlur"
				:title="displayTitle"
			/>
		</div>

		<el-date-picker
			v-else-if="parameter.type === 'dateTime'"
			v-model="tempValue"
			ref="inputField"
			type="datetime"
			:size="inputSize"
			:value="displayValue"
			:title="displayTitle"
			:disabled="isReadOnly"
			:placeholder="parameter.placeholder ? getPlaceholder() : $locale.baseText('parameterInput.selectDateAndTime')"
			:picker-options="dateTimePickerOptions"
			@change="valueChanged"
			@focus="setFocus"
			@blur="onBlur"
			@keydown.stop
		/>

		<n8n-input-number
			v-else-if="parameter.type === 'number'"
			ref="inputField" :size="inputSize"
			:value="displayValue"
			:controls="false"
			:max="getArgument('maxValue')"
			:min="getArgument('minValue')"
			:precision="getArgument('numberPrecision')"
			:disabled="isReadOnly"
			@change="valueChanged"
			@input="onTextInputChange"
			@focus="setFocus"
			@blur="onBlur"
			@keydown.stop
			:title="displayTitle"
			:placeholder="parameter.placeholder"
		/>

		<n8n-select
			v-else-if="parameter.type === 'options'"
			ref="inputField"
			:size="inputSize"
			filterable
			:value="displayValue"
			:loading="remoteParameterOptionsLoading"
			:disabled="isReadOnly || remoteParameterOptionsLoading"
			:title="displayTitle"
			@change="valueChanged"
			@keydown.stop
			@focus="setFocus"
			@blur="onBlur"
		>
			<n8n-option
				v-for="option in parameterOptions"
				:value="option.value"
				:key="option.value"
				:label="getOptionsOptionDisplayName(option)"
			>
				<div class="list-option">
					<div class="option-headline">
						{{ getOptionsOptionDisplayName(option) }}
					</div>
					<div v-if="option.description" class="option-description" v-html="getOptionsOptionDescription(option)"></div>
				</div>
			</n8n-option>
		</n8n-select>

		<n8n-select
			v-else-if="parameter.type === 'multiOptions'"
			ref="inputField"
			:size="inputSize"
			filterable
			multiple
			:value="displayValue"
			:loading="remoteParameterOptionsLoading"
			:disabled="isReadOnly || remoteParameterOptionsLoading"
			:title="displayTitle"
			:placeholder="$locale.baseText('parameterInput.select')"
			@change="valueChanged"
			@keydown.stop
			@focus="setFocus"
			@blur="onBlur"
		>
			<n8n-option v-for="option in parameterOptions" :value="option.value" :key="option.value" :label="getOptionsOptionDisplayName(option)">
				<div class="list-option">
					<div class="option-headline">{{ getOptionsOptionDisplayName(option) }}</div>
					<div v-if="option.description" class="option-description" v-html="getOptionsOptionDescription(option)"></div>
				</div>
			</n8n-option>
		</n8n-select>

		<el-switch
			v-else-if="parameter.type === 'boolean'"
			class="switch-input"
			ref="inputField"
			active-color="#13ce66"
			:value="displayValue"
			:disabled="isReadOnly"
			@change="valueChanged"
		/>
	</div>

	<div class="parameter-issues" v-if="getIssues.length">
		<n8n-tooltip placement="top" >
			<div slot="content" v-html="`${$locale.baseText('parameterInput.issues')}:<br />&nbsp;&nbsp;- ` + getIssues.join('<br />&nbsp;&nbsp;- ')"></div>
			<font-awesome-icon icon="exclamation-triangle" />
		</n8n-tooltip>
	</div>

	<div class="parameter-options" v-if="displayOptionsComputed">
			<el-dropdown trigger="click" @command="optionSelected" size="mini">
				<span class="el-dropdown-link">
					<font-awesome-icon icon="cogs" class="reset-icon clickable" :title="$locale.baseText('parameterInput.parameterOptions')"/>
				</span>
				<el-dropdown-menu slot="dropdown">
					<el-dropdown-item command="addExpression" v-if="parameter.noDataExpression !== true && !isValueExpression">{{ $locale.baseText('parameterInput.addExpression') }}</el-dropdown-item>
					<el-dropdown-item command="removeExpression" v-if="parameter.noDataExpression !== true && isValueExpression">{{ $locale.baseText('parameterInput.removeExpression') }}</el-dropdown-item>
					<el-dropdown-item command="refreshOptions" v-if="hasRemoteMethod">{{ $locale.baseText('parameterInput.refreshList') }}</el-dropdown-item>
					<el-dropdown-item command="resetValue" :disabled="isDefault" divided>{{ $locale.baseText('parameterInput.resetValue') }}</el-dropdown-item>
				</el-dropdown-menu>
			</el-dropdown>
	</div>
	</div>
</template>

<script lang="ts">
import { get } from 'lodash';

import {
	INodeUi,
} from '@/Interface';
import {
	NodeHelpers,
	NodeParameterValue,
	IHttpRequestOptions,
	ILoadOptions,
	INodeParameters,
	INodePropertyOptions,
	Workflow,
} from 'n8n-workflow';

import CodeEdit from '@/components/CodeEdit.vue';
import ExpressionEdit from '@/components/ExpressionEdit.vue';
// @ts-ignore
import PrismEditor from 'vue-prism-editor';
import TextEdit from '@/components/TextEdit.vue';
import { externalHooks } from '@/components/mixins/externalHooks';
import { nodeHelpers } from '@/components/mixins/nodeHelpers';
import { showMessage } from '@/components/mixins/showMessage';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(
	externalHooks,
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
			'inputSize',
			'isReadOnly',
			'documentationUrl',
			'parameter', // NodeProperties
			'path', // string
			'value',
			'hideIssues', // boolean
			'errorHighlight',
			'isForCredential', // boolean
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
							text: 'Today', // TODO
							// tslint:disable-next-line:no-any
							onClick (picker: any) {
								picker.$emit('pick', new Date());
							},
						},
						{
							text: 'Yesterday', // TODO
							// tslint:disable-next-line:no-any
							onClick (picker: any) {
								const date = new Date();
								date.setTime(date.getTime() - 3600 * 1000 * 24);
								picker.$emit('pick', date);
							},
						},
						{
							text: 'A week ago', // TODO
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
			areExpressionsDisabled(): boolean {
				return this.$store.getters['ui/areExpressionsDisabled'];
			},
			codeAutocomplete (): string | undefined {
				return this.getArgument('codeAutocomplete') as string | undefined;
			},
			showExpressionAsTextInput(): boolean {
				const types = ['number', 'boolean', 'dateTime', 'options', 'multiOptions'];

				return types.includes(this.parameter.type);
			},
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
				const interpolation = { interpolate: { shortPath: this.shortPath } };

				if (this.getIssues.length && this.isValueExpression) {
					return this.$locale.baseText(
						'parameterInput.parameterHasIssuesAndExpression',
						interpolation,
					);
				} else if (this.getIssues.length && !this.isValueExpression) {
					return this.$locale.baseText(
						'parameterInput.parameterHasIssues',
						interpolation,
					);
				} else if (!this.getIssues.length && this.isValueExpression) {
					return this.$locale.baseText(
						'parameterInput.parameterHasExpression',
						interpolation,
					);
				}

				return this.$locale.baseText('parameterInput.parameter', interpolation);
			},
			displayValue (): string | number | boolean | null {
				if (this.remoteParameterOptionsLoading === true) {
					// If it is loading options from server display
					// to user that the data is loading. If not it would
					// display the user the key instead of the value it
					// represents
					return this.$locale.baseText('parameterInput.loadingOptions');
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
			expressionDisplayValue (): string {
				const value = this.displayValue;

				// address type errors for text input
				if (typeof value === 'number' || typeof value === 'boolean') {
					return JSON.stringify(value);
				}

				if (value === null) {
					return '';
				}

				return value;
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
				if (this.areExpressionsDisabled) {
					return this.value;
				}

				if (this.node === null) {
					return null;
				}

				let computedValue: NodeParameterValue;

				try {
					computedValue = this.resolveExpression(this.value) as NodeParameterValue;
				} catch (error) {
					computedValue = `[${this.$locale.baseText('parameterInput.error')}}: ${error.message}]`;
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
				if (this.hideIssues === true || this.node === null) {
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
				return ['code', 'json'].includes(this.editorType);
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
			editorType (): string {
				return this.getArgument('editor') as string;
			},
			parameterOptions (): INodePropertyOptions[] {
				if (this.hasRemoteMethod === false) {
					// Options are already given
					return this.parameter.options;
				}

				// Options get loaded from server
				return this.remoteParameterOptions;
			},
			parameterInputClasses () {
				const classes = [];
				const rows = this.getArgument('rows');
				const isTextarea = this.parameter.type === 'string' && rows !== undefined;
				const isSwitch = this.parameter.type === 'boolean' && !this.isValueExpression;

				if (!isTextarea && !isSwitch) {
					classes.push('parameter-value-container');
				}
				if (this.isValueExpression) {
					classes.push('expression');
				}
				if (this.getIssues.length || this.errorHighlight) {
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
			hasRemoteMethod (): boolean {
				return !!this.getArgument('loadOptionsMethod') || !!this.getArgument('loadOptions');
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
			getPlaceholder(): string {
				return this.isForCredential
					? this.$locale.credText().placeholder(this.parameter)
					: this.$locale.nodeText().placeholder(this.parameter, this.path);
			},
			getOptionsOptionDisplayName(option: { value: string; name: string }): string {
				return this.isForCredential
					? this.$locale.credText().optionsOptionDisplayName(this.parameter, option)
					: this.$locale.nodeText().optionsOptionDisplayName(this.parameter, option, this.path);
			},
			getOptionsOptionDescription(option: { value: string; description: string }): string {
				return this.isForCredential
					? this.$locale.credText().optionsOptionDescription(this.parameter, option)
					: this.$locale.nodeText().optionsOptionDescription(this.parameter, option, this.path);
			},

			async loadRemoteParameterOptions () {
				if (this.node === null || this.hasRemoteMethod === false || this.remoteParameterOptionsLoading) {
					return;
				}
				this.remoteParameterOptionsLoadingIssues = null;
				this.remoteParameterOptionsLoading = true;
				this.remoteParameterOptions.length = 0;

				// Get the resolved parameter values of the current node
				const currentNodeParameters = this.$store.getters.activeNode.parameters;
				const resolvedNodeParameters = this.resolveParameter(currentNodeParameters) as INodeParameters;

				try {
					const loadOptionsMethod = this.getArgument('loadOptionsMethod') as string | undefined;
					const loadOptions = this.getArgument('loadOptions') as ILoadOptions | undefined;

					const options = await this.restApi().getNodeParameterOptions({ nodeTypeAndVersion: { name: this.node.type, version: this.node.typeVersion}, path: this.path, methodName: loadOptionsMethod, loadOptions, currentNodeParameters: resolvedNodeParameters, credentials: this.node.credentials });
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
			trackExpressionEditOpen () {
				if(!this.node) {
					return;
				}

				if((this.node.type as string).startsWith('n8n-nodes-base')) {
					this.$telemetry.track('User opened Expression Editor', {
						node_type: this.node.type,
						parameter_name: this.parameter.displayName,
						parameter_field_type: this.parameter.type,
						new_expression: !this.isValueExpression,
						workflow_id: this.$store.getters.workflowId,
					});
				}
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
			openExpressionEdit() {
				if (this.areExpressionsDisabled) {
					return;
				}

				if (this.isValueExpression) {
					this.expressionEditDialogVisible = true;
					this.trackExpressionEditOpen();
					return;
				}
			},
			onBlur () {
				this.$emit('blur');
			},
			setFocus () {
				if (this.isValueExpression) {
					this.expressionEditDialogVisible = true;
					this.trackExpressionEditOpen();
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
						(this.$refs.inputField.$el.querySelector(this.getStringInputType === 'textarea' ? 'textarea' : 'input') as HTMLInputElement).focus();
					}
				});

				this.$emit('focus');
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
			onTextInputChange (value: string) {
				const parameterData = {
					node: this.node !== null ? this.node.name : this.nodeName,
					name: this.path,
					value,
				};

				this.$emit('textInput', parameterData);
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
					if (this.parameter.type === 'number' || this.parameter.type === 'boolean') {
						this.valueChanged(`={{${this.value}}}`);
					}
					else {
						this.valueChanged(`=${this.value}`);
					}

					this.expressionEditDialogVisible = true;
					this.trackExpressionEditOpen();
				} else if (command === 'removeExpression') {
					this.valueChanged(this.expressionValueComputed !== undefined ? this.expressionValueComputed : null);
				} else if (command === 'refreshOptions') {
					this.loadRemoteParameterOptions();
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

			if (this.hasRemoteMethod === true && this.node !== null) {
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

			this.$externalHooks().run('parameterInput.mount', { parameter: this.parameter, inputFieldRef: this.$refs['inputField'] });
		},
	});
</script>

<style scoped lang="scss">

.code-edit {
	font-size: var(--font-size-xs);
}

.switch-input {
	margin: 2px 0;
}

.parameter-value-container {
	display: flex;
	align-items: center;
}

.parameter-actions {
	display: inline-flex;
	align-items: center;
}

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
	font-size: var(--font-size-s);
}

::v-deep .color-input {
	display: flex;

	.el-color-picker__trigger {
		border: none;
	}
}
</style>

<style lang="scss">

.ql-editor {
	padding: 6px;
	line-height: 26px;
	background-color: #f0f0f0;
}

.expression {
	textarea[disabled], input[disabled] {
		cursor: pointer !important;
	}

	.el-switch__core {
		border: 1px dashed $--custom-expression-text;
	}

	--input-border-color: #{$--custom-expression-text};
	--input-border-style: dashed;
	--input-background-color: #{$--custom-expression-background};
	--disabled-border: #{$--custom-expression-text};
}

.has-issues {
	--input-border-color: var(--color-danger);
}

.el-dropdown {
	color: #999;
}

.list-option {
	max-width: 340px;
	margin: 6px 0;
	white-space: normal;
	padding-right: 20px;

	.option-headline {
		font-weight: var(--font-weight-bold);
		line-height: var(--font-line-height-regular);
		overflow-wrap: break-word;
	}

	.option-description {
		margin-top: 2px;
		font-size: var(--font-size-2xs);
		font-weight: var(--font-weight-regular);
		line-height: var(--font-line-height-xloose);
		color: $--custom-font-very-light;
	}
}

.edit-window-button {
	display: none;
}

.parameter-input:hover .edit-window-button {
	display: inline;
}

.expand-input-icon-container {
	display: flex;
	height: 100%;
	align-items: center;
}

</style>
