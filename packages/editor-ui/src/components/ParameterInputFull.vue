<template>
	<el-row class="parameter-wrapper">
		<el-col :span="isMultiLineParameter ? 24 : 10" class="parameter-name" :class="{'multi-line': isMultiLineParameter}">
			<span class="title" :title="parameter.displayName">{{parameter.displayName}}</span>:
			<el-tooltip class="parameter-info" placement="top" v-if="parameter.description" effect="light">
				<div slot="content" v-html="addTargetBlank(parameter.description)"></div>
				<font-awesome-icon icon="question-circle" />
			</el-tooltip>
		</el-col>
		<el-col :span="isMultiLineParameter ? 24 : 14" class="parameter-value">
			<parameter-input :parameter="parameter" :value="value" :displayOptions="displayOptions" :path="path" @valueChanged="valueChanged" />
		</el-col>
	</el-row>
</template>

<script lang="ts">
import Vue from 'vue';

import {
	IUpdateInformation,
} from '@/Interface';

import ParameterInput from '@/components/ParameterInput.vue';
import { addTargetBlank } from './helpers';

export default Vue
	.extend({
		name: 'ParameterInputFull',
		components: {
			ParameterInput,
		},
		computed: {
			isMultiLineParameter () {
				if (this.level > 4) {
					return true;
				}
				const rows = this.getArgument('rows');
				if (rows !== undefined && rows > 1) {
					return true;
				}

				return false;
			},
			level (): number {
				return this.path.split('.').length;
			},
		},
		props: [
			'displayOptions',
			'parameter',
			'path',
			'value',
		],
		methods: {
			addTargetBlank,
			getArgument (argumentName: string): string | number | boolean | undefined {
				if (this.parameter.typeOptions === undefined) {
					return undefined;
				}

				if (this.parameter.typeOptions[argumentName] === undefined) {
					return undefined;
				}

				return this.parameter.typeOptions[argumentName];
			},
			valueChanged (parameterData: IUpdateInformation) {
				this.$emit('valueChanged', parameterData);
			},
		},
	});
</script>

<style lang="scss">

.parameter-wrapper {
	line-height: 2.5em;

	.option {
		margin: 1em;
	}

	.parameter-info {
		background-color: #ffffffaa;
		border-radius: 6px;
		display: none;
		padding: 4px;
		position: absolute;
		right: 0px;
		top: 8px;
	}

	.parameter-name {
		position: relative;

		&:hover {
			.parameter-info {
				display: inline;
			}
		}

		&.multi-line {
			line-height: 1.5em;
		}
	}

	.title {
		font-weight: 400;
	}
}

</style>
