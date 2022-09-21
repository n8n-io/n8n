<template>
	<div :class="$style.jsonDisplay">
		<vue-json-pretty
			:data="jsonData"
			:deep="10"
			:showLength="true"
			:selected-value.sync="selectedOutputPath"
			rootPath=""
			selectableType="single"
			@selected-change="onSelectedChange"
			class="json-data"
		>
			<template #nodeKey="{ node }">
				<span>{{node.key}}</span>
			</template>
			<template #nodeValue="{ node }">
				<span>{{node.content}}</span>
			</template>
		</vue-json-pretty>
	</div>
</template>

<script lang="ts">
import Vue from 'vue';
import mixins from 'vue-typed-mixins';
//@ts-ignore
import VueJsonPretty from 'vue-json-pretty';
import { LOCAL_STORAGE_MAPPING_FLAG } from '@/constants';
import Draggable from './Draggable.vue';
import { externalHooks } from './mixins/externalHooks';
import { IDataObject, INodeExecutionData } from "n8n-workflow";
import {isJsonKeyObject} from "@/utils";
import { executionDataToJson } from "@/components/helpers";

export default mixins(externalHooks).extend({
	name: 'run-data-json',
	components: {
		VueJsonPretty,
		Draggable,
	},
	props: {
		inputData: {
			type: Array,
			required: true,
		},
		value: {
			type: String,
		},
	},
	data() {
		return {
			selectedOutputPath: this.value,
		};
	},
	mounted() {
	},
	computed: {
		jsonData (): IDataObject[] {
			return executionDataToJson(this.inputData as INodeExecutionData[]);
		},
	},
	methods: {
		onSelectedChange(value: string) {
			this.$emit('input', value);
		},
	},
	watch: {

	},
});
</script>

<style lang="scss" module>
.jsonDisplay {
	position: absolute;
	top: 0;
	left: 0;
	padding-left: var(--spacing-s);
	right: 0;
	overflow-y: auto;
	line-height: 1.5;
	word-break: normal;
	height: 100%;
	padding-bottom: var(--spacing-3xl);
	background-color: var(--color-background-base);
	padding-top: var(--spacing-s);
}
</style>

<style lang="scss">
.vjs-tree {
	color: var(--color-json-default);
}

.vjs-tree-node {
	&:hover,
	&.is-highlight{
		background-color: var(--color-json-highlight);
	}
}


.vjs-tree .vjs-value-null {
	&, span {
		color: var(--color-json-null);
	}
}

.vjs-tree .vjs-value-boolean {
	&, span {
		color: var(--color-json-boolean);
	}
}

.vjs-tree .vjs-value-number {
	&, span {
		color: var(--color-json-number);
	}
}

.vjs-tree .vjs-value-string {
	&, span {
		color: var(--color-json-string);
	}
}

.vjs-tree .vjs-key {
	color: var(--color-json-key);
}

.vjs-tree .vjs-tree__brackets {
	color: var(--color-json-brackets);
}

.vjs-tree .vjs-tree__brackets:hover {
	color: var(--color-json-brackets-hover);
}

.vjs-tree .vjs-tree__content.has-line {
	border-left: 1px dotted var(--color-json-line);
}
</style>
