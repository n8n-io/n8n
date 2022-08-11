<template>
	<div
		:class="{
			['resource-locator']: true,
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
				filterable
				:size="inputSize"
				:disabled="isReadOnly"
				@change="onModeSelected"
			>
				<n8n-option
					v-for="mode in sortedModes"
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
					type="text"
					:size="inputSize"
					:value="activeDrop || forceShowExpression ? '' : expressionDisplayValue"
					:title="displayTitle"
					:disabled="isReadOnly"
					@keydown.stop
				/>
				<n8n-input
					v-else
					ref="inputField"
					v-model="tempValue"
					:size="inputSize"
					type="text"
					:value="displayValue"
					:disabled="isReadOnly"
					:title="displayTitle"
					:placeholder="currentMode.placeholder ? currentMode.placeholder : ''"
					@change="onInputChange"
					@keydown.stop
					@focus="onFocus"
					@blur="onBlur"
				>
				</n8n-input>
			</DraggableTarget>
			<parameter-issues v-if="resourceIssues" :issues="resourceIssues" />
		</div>
		<div :class="$style['info-text']">
			<n8n-text
				v-if="infoText"
				size="small"
			>
					{{ infoText }}
			</n8n-text>
		</div>
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
		mode: {
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
			default () {
				return {};
			},
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
		sortedModes (): INodePropertyMode[] {
			// Display modes in this order regardless of how they are set in node definition
			const priorityQueue: string[] = ['list', 'id', 'url', 'custom'];
			const sorted: INodePropertyMode[] = [];

			for (const modeName of priorityQueue) {
				const mode = this.findModeByName(modeName);
				if (mode) {
					sorted.push(mode);
				}
			}
			return sorted;
		},
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
			this.setDefaultMode();
		},
		value (newValue: string) {
			this.tempValue = this.displayValue as string;
			this.validate();
		},
	},
	mounted () {
		this.selectedMode = this.mode;
		this.tempValue = this.displayValue as string;
		this.setDefaultMode();
	},
	methods: {
		setDefaultMode (): void {
			if (this.parameter.modes && this.selectedMode === '') {
				// List mode is selected by default if it's available
				const listMode = this.parameter.modes.find((mode : INodePropertyMode) => mode.name === 'list');
				this.selectedMode = listMode ? listMode.name : this.parameter.modes[0].name;
			}
			this.validate();
		},
		validate (): void {
			const valueToValidate = this.displayValue ? this.displayValue.toString() : this.value ? this.value.toString() : '';
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
		onInputChange (value: string): void {
			this.$emit('valueChanged', { value, mode: this.selectedMode });
		},
		onModeSelected (value: string): void {
			this.validate();
			this.$emit('modeChanged', { mode: value, value: this.value });
		},
		onDrop(data: string) {
			this.$emit('drop', data);
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
	flex-basis: 92px;
	--input-background-color: initial;

	input {
		border-radius: var(--border-radius-base) 0 0 var(--border-radius-base);
		border-right: none;
		overflow: hidden;

		&:focus {
			border-right: none;
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
			flex-basis: calc(100% - 92px);
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

.info-text {
	margin-top: var(--spacing-2xs);
}
</style>
