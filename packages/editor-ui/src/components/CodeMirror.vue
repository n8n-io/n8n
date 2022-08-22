<template>
	<div ref="codemirror" />
</template>

<script lang="ts">
import Vue from 'vue';

import { basicSetup } from 'codemirror';
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { javascript } from "@codemirror/lang-javascript";

export default Vue.extend({
	name: 'CodeMirror',
	data() {
		return {
			value: 'console.log("Hello, World");',
			editor: null as any, // tslint:disable-line:no-any
		};
	},
	mounted() {
		const state = EditorState.create({
			doc: `for (item of items) {
  item.json.myNewField = 1;
}
console.log('Done!');

return items;`,
			extensions: [
				basicSetup,
				javascript(),
			],
		});

		this.editor = new EditorView({ state, parent: this.$refs.codemirror as Element });
	},
});
</script>

<style lang="scss" scoped>
.text-editor {
	width: 100%;
	height: 100%;
	flex: 1 1 auto;
	border: 1px solid var(--color-foreground-base);
	border-radius: var(--border-radius-base);
}

::v-deep {
	.monaco-editor {
		.slider {
			border-radius: var(--border-radius-base);
		}

		&,
		&-background,
		.inputarea.ime-input,
		.margin {
			border-radius: var(--border-radius-base);
			background-color: var(--color-background-xlight) !important;
		}
	}
}
</style>
