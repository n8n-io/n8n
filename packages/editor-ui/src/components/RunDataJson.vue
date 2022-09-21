<template>
	<div :class="$style.jsonDisplay">
		<vue-json-pretty
			:data="jsonData"
			:deep="10"
			v-model="value.path"
			:showLine="true"
			:showLength="true"
			selectableType="single"
			path=""
			:highlightSelectedNode="true"
			:selectOnClickNode="true"
			@click="dataItemClicked"
			class="json-data"
		/>
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

export default mixins(externalHooks).extend({
	name: 'run-data-json',
	components: {
		VueJsonPretty,
		Draggable,
	},
	props: {
		jsonData: {
			type: Object,
		},
		value: {
			type: Object,
		},
	},
	data() {
		return {

		};
	},
	mounted() {
	},
	computed: {
	},
	methods: {
		dataItemClicked (path: string, data: object | number | string) {
			this.value.value = data;
			this.$emit('input', this.value);
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

.vjs-tree.is-highlight-selected {
	background-color: var(--color-json-highlight);
}

.vjs-tree .vjs-value__null {
	color: var(--color-json-null);
}

.vjs-tree .vjs-value__boolean {
	color: var(--color-json-boolean);
}

.vjs-tree .vjs-value__number {
	color: var(--color-json-number);
}

.vjs-tree .vjs-value__string {
	color: var(--color-json-string);
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
