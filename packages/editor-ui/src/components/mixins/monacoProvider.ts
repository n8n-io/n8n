import Vue from 'vue';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

export const monacoProvider = Vue.extend({
	data() {
		return {
			instance: null as monaco.editor.IStandaloneCodeEditor | null,
			libraries: new Map() as Map<string, monaco.IDisposable>,
		};
	},

	destroyed() {
		this.instance!.dispose();

		this.libraries.forEach((library) => {
			library.dispose();
		});
		this.libraries = new Map();
	},

	methods: {
		/**
		 * Loads the Monaco editor in the `root` provided.
		 * @param options
		 */
		createEditor(options: {
			root: HTMLElement;
			content: string;
			onUpdate: (value: string) => void;
			readOnly?: boolean;
			language?: 'javascript' | 'html';
		}): void {
			this.instance = monaco.editor.create(options.root, {
				value: options.content,
				readOnly: options.readOnly,
				language: options.language || 'javascript',
				tabSize: 2,
			});

			this.instance.onDidChangeModelContent(() => {
				const model = this.instance!.getModel();
				if (!model) return;

				options.onUpdate(model.getValue());
			});
		},

		/**
		 * Adds a new library (i.e. `.d.ts`) that will be available as intellisense.
		 */
		loadJsLibrary(options: {
			name: string;
			content: unknown;
			comment?: string;
			showOriginal?: boolean;
		}): void {
			const jsonContent = JSON.stringify(options.content, null, 2);
			const originalData = `\`\`\`\nconst ${options.name} = ${jsonContent}\n\`\`\``
				.split('\n')
				.map((line) => ` * ${line}`)
				.join('\n');

			const comment: string = [
				'/**\n',
				` * ${options.comment ? options.comment : ''}`,
				originalData,
				' */',
			].join('\n');

			const libContents: string = [
				comment,
				`const ${options.name} = ${jsonContent}`,
			].join('\n');

			const library = monaco.languages.typescript.javascriptDefaults.addExtraLib(libContents);

			this.libraries.set(options.name, library);
		},
	},
});
