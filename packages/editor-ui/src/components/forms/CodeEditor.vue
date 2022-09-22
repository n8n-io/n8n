<template>
	<div ref="code" class="text-editor ph-no-capture" @keydown.stop />
</template>

<script lang="ts">
import Vue from 'vue';
import * as monaco from 'monaco-editor';

export default Vue.extend({
	props: {
		type: {
			type: String,
			default: 'code',
		},
		readonly: {
			type: Boolean,
			default: false,
		},
		value: {
			type: String,
			default: '',
		},
		autocomplete: {
			type: Function,
		},
		options: {
			type: Object,
			default: () => ({}),
		},
	},
	data() {
		return {
			monacoInstance: null as monaco.editor.IStandaloneCodeEditor | null,
			monacoLibrary: null as monaco.IDisposable | null,
		};
	},
	methods: {
		loadEditor() {
			if (!this.$refs.code) return;

			this.monacoInstance = monaco.editor.create(this.$refs.code as HTMLElement, {
				automaticLayout: true,
				value: this.value,
				language: this.type === 'code' ? 'javascript' : 'json',
				tabSize: 2,
				wordBasedSuggestions: false,
				readOnly: this.readonly,
				padding: {
					top: 16,
				},
				minimap: {
					enabled: false,
				},
				...this.options,
			});

			this.monacoInstance.onDidChangeModelContent(() => {
				const model = this.monacoInstance!.getModel();
				if (model) {
					this.$emit('input', model.getValue());
				}
			});

			monaco.editor.defineTheme('n8nCustomTheme', {
				base: 'vs',
				inherit: true,
				rules: [],
				colors: {
					'editor.background': '#f5f2f0',
				},
			});
			monaco.editor.setTheme('n8nCustomTheme');

			if (this.type === 'code') {
				// As wordBasedSuggestions: false does not have any effect does it however seem
				// to remove all all suggestions from the editor if I do this
				monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
					allowNonTsExtensions: true,
				});

				if (this.autocomplete) {
					this.monacoLibrary = monaco.languages.typescript.javascriptDefaults.addExtraLib(
						this.autocomplete().join('\n'),
					);
				}
			} else if (this.type === 'json') {
				monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
					validate: true,
				});
			}
		},
		handleResize() {
			if (this.monacoInstance) {
				// Workaround to force Monaco to recompute its boundaries
				this.monacoInstance.layout({} as unknown as undefined);
			}
		},
	},
	mounted() {
		setTimeout(this.loadEditor);
		window.addEventListener('resize', this.handleResize);
	},
	destroyed() {
		if (this.monacoLibrary) {
			this.monacoLibrary.dispose();
		}
		window.removeEventListener('resize', this.handleResize);
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
