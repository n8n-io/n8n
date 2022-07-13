<template>
	<n8n-input-label
		:label="hideLabel? '': $locale.nodeText().inputLabelDisplayName(parameter, path)"
		:tooltipText="hideLabel? '': $locale.nodeText().inputLabelDescription(parameter, path)"
		:showTooltip="focused"
		:showOptions="menuExpanded || focused"
		:bold="false"
		size="small"
	>
		<template #options>
			<parameter-options
				:parameter="parameter"
				:value="value"
				:isReadOnly="isReadOnly"
				:showOptions="displayOptions"
				@optionSelected="optionSelected"
				@menu-expanded="onMenuExpanded"
			/>
		</template>
		<template>
			<parameter-input
				ref="param"
				:parameter="parameter"
				:value="value"
				:displayOptions="displayOptions"
				:path="path"
				:isReadOnly="isReadOnly"
				@valueChanged="valueChanged"
				@focus="focused = true"
				@blur="focused = false"
				inputSize="small" />
			<input-hint :class="$style.hint" :hint="$locale.nodeText().hint(parameter, path)" />
		</template>
	</n8n-input-label>
</template>

<script lang="ts">
import Vue from 'vue';

import {
	IUpdateInformation,
} from '@/Interface';

import ParameterInput from '@/components/ParameterInput.vue';
import InputHint from './ParameterInputHint.vue';
import ParameterOptions from './ParameterOptions.vue';

export default Vue
	.extend({
		name: 'ParameterInputFull',
		components: {
			ParameterInput,
			InputHint,
			ParameterOptions,
		},
		data() {
			return {
				focused: false,
				menuExpanded: false,
			};
		},
		props: [
			'displayOptions',
			'isReadOnly',
			'parameter',
			'path',
			'value',
			'hideLabel',
		],
		methods: {
			onMenuExpanded(expanded: boolean) {
				this.menuExpanded = expanded;
			},
			optionSelected (command: string) {
				if (this.$refs.param) {
					(this.$refs.param as Vue).$emit('optionSelected', command);
				}
			},
			valueChanged (parameterData: IUpdateInformation) {
				this.$emit('valueChanged', parameterData);
			},
		},
	});
</script>

<style lang="scss" module>
	.hint {
		margin-top: var(--spacing-4xs);
	}
</style>
