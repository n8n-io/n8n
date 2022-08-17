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
					v-for="mode in parameter.modes"
					:key="mode.name"
					:label="$locale.baseText(getModeLabel(mode.name)) || mode.displayName"
					:value="mode.name"
					:disabled="isValueExpression && mode.name === 'list'"
					:title="isValueExpression && mode.name === 'list' ? $locale.baseText('resourceLocator.modeSelector.listMode.disabled.title') : ''"
				>
				</n8n-option>
			</n8n-select>
		</div>
		<div :class="inputClasses">
			<DraggableTarget
				type="mapping"
				:disabled="hasOnlyListMode"
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
					:readonly="selectedMode === 'list'"
					:title="displayTitle"
					:placeholder="currentMode.placeholder ? currentMode.placeholder : ''"
					@change="onInputChange"
					@keydown.stop
					@focus="onFocus"
					@blur="onBlur"
					@click.native="listModeDropDownToggle"
				>
					<div slot="suffix" :class="$style['list-mode-icon-contapiner']">
						<i
							v-if="currentMode.name === 'list'"
							:class="{
								['el-input__icon']: true,
								['el-icon-arrow-down']: true,
								[$style['select-icon']]: true,
								[$style['is-reverse']]: listModeDropdownOpen
							}"
						></i>
					</div>
				</n8n-input>
			</DraggableTarget>
			<parameter-issues v-if="resourceIssues" :issues="resourceIssues" />
		</div>

		<list-mode-dropdown
			v-if="selectedMode === 'list' && listModeDropdownOpen"
		/>

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
import { getParameterModeLabel, hasOnlyListMode, validateResourceLocatorParameter } from './helpers';

import DraggableTarget from '@/components/DraggableTarget.vue';
import ExpressionEdit from '@/components/ExpressionEdit.vue';
import ParameterIssues from '@/components/ParameterIssues.vue';
import ListModeDropdown from '@/components/ResourceLocator/ListModeDropdown.vue';
import { PropType } from 'vue';


export default mixins().extend({
	name: 'ResourceLocator',
	components: {
		DraggableTarget,
		ExpressionEdit,
		ListModeDropdown,
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
			listModeDropdownOpen: false,
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
		hasOnlyListMode (): boolean {
			return hasOnlyListMode(this.parameter);
		},
		inputClasses (): {[c: string]: boolean} {
			const classes = {
				...this.parameterInputClasses,
				[this.$style['input-container']]: true,
				[this.$style['list-mode-input-container']]: this.selectedMode === 'list',
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
		value () {
			this.tempValue = this.displayValue as string;
			this.validate();
		},
		isValueExpression (newValue: boolean) {
			if (newValue === true) {
				this.switchFromListMode();
			}
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
			this.switchFromListMode();
			this.$emit('drop', data);
		},
		onBlur (): void {
			this.$emit('blur');
		},
		onFocus (): void {
			this.$emit('focus');
		},
		listModeDropDownToggle (): void {
			this.listModeDropdownOpen = !this.listModeDropdownOpen;
		},
		switchFromListMode (): void {
			if (this.selectedMode === 'list' && this.parameter.modes) {
				// Find the first mode that's not list mode
				const mode = this.parameter.modes.find(m => m.name !== 'list');
				if (mode) {
					this.selectedMode = mode.name;
				}
			}
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

		&:disabled {
			cursor: not-allowed !important;
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

.select-icon {
	cursor: pointer;
	font-size: 14px;
	transition: transform 0.3s, -webkit-transform 0.3s;
	-webkit-transform: rotateZ(0);
					transform: rotateZ(0);

	&.is-reverse {
		-webkit-transform: rotateZ(180deg);
					transform: rotateZ(180deg);
	}
}

.list-mode-input-container * {
	cursor: pointer;
}
</style>
