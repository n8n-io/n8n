<template>
	<div
		:class="{
			[$style['resource-locator']]: true,
			[$style['multiple-modes']]: hasMultipleModes,
		}"
	>
		<div
			v-if="hasMultipleModes"
			:class="$style['mode-selector']"
		>
			<n8n-select
				v-model="selectedMode"
				@change="onModeSelected"
				size="small"
				filterable
			>
				<n8n-option
					v-for="mode in parameter.modes"
					:key="mode.name"
					:label="$locale.baseText(getModeLabel(mode.name)) || mode.displayName"
					:value="mode.name">
				</n8n-option>
			</n8n-select>
		</div>
		<div :class="inputClasses">
			<DraggableTarget
				type="mapping"
				:disabled="false"
				:sticky="true"
				:stickyOffset="4"
				@drop="onDrop"
			>
				<n8n-input
					v-if="isValueExpression || droppable || forceShowExpression"
					:size="inputSize"
					type="text"
					:rows="rows"
					:value="activeDrop || forceShowExpression ? '' : expressionDisplayValue"
					:title="displayTitle"
					@keydown.stop
				/>
				<n8n-input
					v-else
					ref="inputField"
					v-model="tempValue"
					:size="inputSize"
					type="text"
					:rows="rows"
					:value="displayValue"
					:disabled="isReadOnly"
					:title="displayTitle"
					:placeholder="currentMode.placeholder ? currentMode.placeholder : ''"
					@input="onInput"
					@change="onInputChange"
					@keydown.stop
					@focus="onFocus"
					@blur="onBlur"
				>
					<div slot="suffix" :class="$style['expand-input-icon-container']">
						<font-awesome-icon
							v-if="!isReadOnly"
							icon="expand-alt"
							:class="[$style['edit-window-button'], 'clickable']"
							:title="$locale.baseText('parameterInput.openEditWindow')"
							@click="onEditIconClick"
						/>
					</div>
				</n8n-input>
			</DraggableTarget>
			<parameter-issues v-if="resourceIssues" :issues="resourceIssues" />
		</div>
		<n8n-text
			v-if="infoText"
			size="small"
			:class="$style['info-text']"
		>
				{{ infoText }}
		</n8n-text>
	</div>
</template>

<script lang="ts">
import mixins from 'vue-typed-mixins';

import { INodeProperties, INodePropertyMode } from 'n8n-workflow';
import { getParameterModeLabel, validateResourceLocatorParameter } from './helpers';

import DraggableTarget from '@/components/DraggableTarget.vue';
import ExpressionEdit from '@/components/ExpressionEdit.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import { PropType } from 'vue';

export default mixins().extend({
	name: 'ResourceLocator',
	components: {
		DraggableTarget,
		ExpressionEdit,
		ParameterIssues,
	},
	props: {
		parameter: {
			type: Object as () => INodeProperties,
			required: true,
		},
		value: {
			type: String,
			default: '',
		},
		inputSize: {
			type: String,
			default: 'small',
			validator: size => {
				return ['mini', 'small', 'medium', 'large', 'xlarge'].includes(size);
			},
		},
		eventSource: {
			type: String,
			default: 'ndv',
		},
		parameterIssues: {
			type: Array as PropType<string[]>,
			default () {
				return [];
			},
		},
		displayValue: {
			type: String,
			default: '',
		},
		displayTitle: {
			type: String,
			default: '',
		},
		expressionDisplayValue: {
			type: String,
			default: '',
		},
		parameterInputClasses: {
			type: Object,
			default: {},
		},
		rows: {
			type: Number,
			default: 0,
		},
		isReadOnly: {
			type: Boolean,
			default: false,
		},
		activeDrop: {
			type: Boolean,
			default: false,
		},
		forceShowExpression: {
			type: Boolean,
			default: false,
		},
		isValueExpression: {
			type: Boolean,
			default: false,
		},
		expressionEditDialogVisible: {
			type: Boolean,
			default: false,
		},
		droppable: {
			type: Boolean,
			default: true,
		},
	},
	data() {
		return {
			selectedMode: '',
			tempValue: '',
			resourceIssues: [] as string[],
		};
	},
	computed: {
		inputPlaceholder (): string {
			return this.currentMode.placeholder ? this.currentMode.placeholder : '';
		},
		infoText (): string {
			return this.currentMode.hint ?  this.currentMode.hint : this.parameter.description || '';
		},
		currentMode (): INodePropertyMode {
			return this.findModeByName(this.selectedMode) || {} as INodePropertyMode;
		},
		hasMultipleModes (): boolean {
			return (this.parameter.modes && this.parameter.modes.length > 1) ? true : false;
		},
		inputClasses (): {[c: string]: boolean} {
			const classes = {
				...this.parameterInputClasses,
				[this.$style['input-container']]: true,
			};
			if (this.resourceIssues.length) {
				classes['has-issues'] = true;
			}
			return classes;
		},
	},
	watch: {
		parameterIssues () {
			this.validate();
		},
		hasMultipleModes (newValue: boolean) {
			// TODO: Only do this if there is no mode selected...
			this.setDefaultMode();
		},
		value (newValue: string) {
			this.tempValue = this.displayValue as string;
		},
	},
	mounted () {
		this.tempValue = this.displayValue as string;
		if (this.selectedMode === '') {
			this.setDefaultMode();
		}
	},
	methods: {
		setDefaultMode (): void {
			if (this.parameter.modes) {
				// List mode is selected by default if it's available
				const listMode = this.parameter.modes.find((mode : INodePropertyMode) => mode.name === 'list');
				this.selectedMode = listMode ? listMode.name : this.parameter.modes[0].name;
			}
			this.validate();
		},
		validate (): void {
			const valueToValidate = this.displayValue ? this.displayValue.toString() : this.expressionDisplayValue ? this.expressionDisplayValue.toString() : '';
			const validationErrors: string[] = validateResourceLocatorParameter(valueToValidate, this.currentMode);
			this.resourceIssues = this.parameterIssues.concat(validationErrors);
		},
		findModeByName (name: string): INodePropertyMode | null {
			if (this.parameter.modes) {
				return this.parameter.modes.find((mode: INodePropertyMode) => mode.name === name) || null;
			}
			return null;
		},
		getModeLabel (name: string): string | null {
			return getParameterModeLabel(name);
		},
		onInput (value: string): void {
			this.$emit('textInputChange', value);
		},
		onInputChange (value: string): void {
			this.$emit('change', value);
		},
		onModeSelected (value: string): void {
			this.validate();
		},
		onExpressionValueChanged (latestValue: string): void {
			this.tempValue = latestValue;
			this.$emit('valueChanged', latestValue);
		},
		onDrop(data: string) {
			this.$emit('drop', data);
		},
		onEditIconClick (): void {
			this.$emit('editIconClick');
		},
		onBlur (): void {
			this.$emit('blur');
		},
		onFocus (): void {
			this.$emit('focus');
		},
	},
});
</script>

<style lang="scss" module>
.mode-selector {
	flex-basis: 100px;
	--input-background-color: initial;

	input {
		border-radius: var(--border-radius-base) 0 0 var(--border-radius-base);
		border-right: none;
		overflow: hidden;
		text-overflow: ellipsis;

		&:focus {
			border-right: var(--color-secondary) var(--border-style-base) var(--border-width-base);
		}
	}
}

.resource-locator {
	display: flex;
	flex-wrap: wrap;

	.input-container {
		display: flex;
		align-items: center;
		width: 100%;

		div:first-child {
			display: flex;
			flex-grow: 1;
		}

		input {
			border-radius: 0 var(--border-radius-base) var(--border-radius-base) 0;
		}
		&:hover .edit-window-button {
			display: inline;
		}
	}

	&.multiple-modes {
		.input-container {
			display: flex;
			align-items: center;
			flex-basis: calc(100% - 100px);
			flex-grow: 1;
		}
	}
}

.edit-window-button {
	display: none;
}

.expand-input-icon-container {
	display: flex;
	height: 100%;
	align-items: center;
}

.has-issues {
	--input-border-color: var(--color-danger);
}
</style>
