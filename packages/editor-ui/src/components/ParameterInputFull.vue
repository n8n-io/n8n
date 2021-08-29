<template>
	<el-row class="parameter-wrapper" :class="{'multi-line': isMultiLineParameter}">
		<el-col :span="isMultiLineParameter ? 24 : 10" class="parameter-name" :class="{'multi-line': isMultiLineParameter}">
			<span class="title" :title="parameter.displayName">{{parameter.displayName}}</span>:
			<n8n-tooltip class="parameter-info" placement="top" v-if="parameter.description" >
				<div slot="content" v-html="parameter.description"></div>
				<font-awesome-icon icon="question-circle" />
			</n8n-tooltip>
		</el-col>
		<el-col :span="isMultiLineParameter ? 24 : 14" class="parameter-value">
			<parameter-input :parameter="parameter" :value="value" :displayOptions="displayOptions" :path="path" @valueChanged="valueChanged" inputSize="small" />
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
	display: flex;
	align-items: center;

	&.multi-line {
		flex-direction: column;
	}

	.option {
		margin: 1em;
	}

	.parameter-info {
		background-color: #ffffffaa;
		display: none;
		position: absolute;
		right: 2px;
		top: 1px;
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
