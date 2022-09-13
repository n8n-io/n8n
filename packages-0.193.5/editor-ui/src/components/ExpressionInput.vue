<template>
	<div>
		<div ref="expression-editor" :style="editorStyle" class="ignore-key-press" @keydown.stop></div>
	</div>
</template>

<script lang="ts">

import Vue from 'vue';

import 'quill/dist/quill.core.css';

import Quill, { DeltaOperation } from 'quill';
// @ts-ignore
import AutoFormat from 'quill-autoformat';
import {
	NodeParameterValue,
	Workflow,
} from 'n8n-workflow';

import {
	IVariableItemSelected,
} from '@/Interface';
import { genericHelpers } from '@/components/mixins/genericHelpers';
import { workflowHelpers } from '@/components/mixins/workflowHelpers';

import mixins from 'vue-typed-mixins';

export default mixins(
	genericHelpers,
	workflowHelpers,
)
	.extend({
		name: 'ExpressionInput',
		props: [
			'rows',
			'value',
			'parameter',
			'path',
			'resolvedValue',
		],
		data () {
			return {
				editor: null as null | Quill,
			};
		},
		computed: {
			editorStyle () {
				let rows = 1;
				if (this.rows) {
					rows = parseInt(this.rows, 10);
				}

				return {
					'height': Math.max((rows * 26 + 10), 40) + 'px',
				};
			},
			workflow (): Workflow {
				return this.getCurrentWorkflow();
			},
		},
		watch: {
			value () {
				if (this.resolvedValue) {
					// When resolved value gets displayed update the input automatically
					this.initValue();
				}
			},
		},
		mounted () {
			const that = this;

			// tslint:disable-next-line
			const Inline = Quill.import('blots/inline');

			class VariableField extends Inline {
				static create (value: string) {
					const node = super.create(value);
					node.setAttribute('data-value', value);
					node.setAttribute('class', 'variable');

					return node;
				}

				static formats (domNode: HTMLElement) {
					// For the not resolved one the value can be read directly from the dom
					let variableName = domNode.innerHTML.trim();
					if (that.resolvedValue) {
					// For the resolve done it has to get the one from creation.
					// It will not update on change but because the init runs on every change it does not really matter
						variableName = domNode.getAttribute('data-value') as string;
					}

					const newClasses = that.getPlaceholderClasses(variableName);
					if (domNode.getAttribute('class') !== newClasses) {
					// Only update when it changed else we get an endless loop!
						domNode.setAttribute('class', newClasses);
					}

					return true;
				}
			}

			VariableField.blotName = 'variable';
			VariableField.className = 'variable';
			VariableField.tagName = 'span';

			Quill.register({
				'formats/variable': VariableField,
			});

			AutoFormat.DEFAULTS = {
				expression: {
					trigger: /\B[\w\s]/,
					find: /\{\{[^\s,;:!?}]+\}\}/i,
					format: 'variable',
				},
			};

			this.editor = new Quill(this.$refs['expression-editor'] as Element, {
				readOnly: !!this.resolvedValue || this.isReadOnly,
				modules: {
					autoformat: {},
					keyboard: {
						bindings: {
							'list autofill': null,
						},
					},
				},
			});

			this.editor.root.addEventListener('blur', (event: Event) => {
				this.$emit('blur', event);
			});

			this.initValue();

			if (!this.resolvedValue) {
				// Only call update when not resolved value gets displayed
				this.setFocus();
				this.editor.on('text-change', () => this.update());
			}
		},
		methods: {
			// ------------------------------- EDITOR -------------------------------
			customizeVariable (variableName: string) {
				const returnData = {
					classes: [] as string[],
					message: variableName as string,
				};

				let value;
				try {
					value = this.resolveExpression(`=${variableName}`);

					if (value !== undefined) {
						returnData.classes.push('valid');
					} else {
						returnData.classes.push('invalid');
					}
				} catch (e) {
					returnData.classes.push('invalid');
				}

				return returnData;
			},
			// Resolves the given variable. If it is not valid it will return
			// an error-string.
			resolveParameterString (variableName: string) {
				let returnValue;
				try {
					returnValue = this.resolveExpression(`=${variableName}`);
				} catch (error) {
					return `[invalid (${error.message})]`;
				}
				if (returnValue === undefined) {
					return '[not found]';
				}

				return returnValue;
			},
			getPlaceholderClasses (variableName: string) {
				const customizeData = this.customizeVariable(variableName);
				return 'variable ' + customizeData.classes.join(' ');
			},
			getValue () {
				if (!this.editor) {
					return '';
				}

				const content = this.editor.getContents();
				if (!content || !content.ops) {
					return '';
				}

				let returnValue = '';

				// Convert the editor operations into a string
				content.ops.forEach((item: DeltaOperation) => {
					if (!item.insert) {
						return;
					}

					returnValue += item.insert;
				});

				// For some unknown reason does the Quill always return a "\n"
				// at the end. Remove it here manually
				return '=' + returnValue.replace(/\s+$/g, '');
			},
			setFocus () {
				// TODO: There is a bug that when opening ExpressionEditor and typing directly it shows the first letter and
				//       then adds the second letter in from of the first on
				this.editor!.focus();
			},

			itemSelected (eventData: IVariableItemSelected) {
				// We can only get the selection if editor is in focus so make
				// sure it is
				this.editor!.focus();
				const selection = this.editor!.getSelection();

				let addIndex = null;
				if (selection) {
					addIndex = selection.index;
				}

				if (addIndex) {
					// If we have a location to add variable to add it there
					this.editor!.insertText(addIndex, `{{${eventData.variable}}}`, 'variable', true);
					this.update();
				} else {
					// If no position got found add it to end
					let newValue = this.getValue();
					if (newValue === '=' || newValue === '=0') {
						newValue = `{{${eventData.variable}}}\n`;
					} else {
						newValue += ` {{${eventData.variable}}}\n`;
					}

					this.$emit('change', newValue, true);
					if (!this.resolvedValue) {
						Vue.nextTick(() => {
							this.initValue();
						});
					}
				}
			},
			initValue () {
				if (!this.value) {
					return;
				}

				let currentValue = this.value;

				if (currentValue.charAt(0) === '=') {
					currentValue = currentValue.slice(1);
				}

				// Convert the expression string into a Quill Operations
				const editorOperations: DeltaOperation[] = [];
				currentValue.replace(/\{\{(.*?)\}\}/ig, '*%%#_@^$1*%%#_@').split('*%%#_@').forEach((value: string) => {
					if (value && value.charAt(0) === '^') {
						// Is variable
						let displayValue = `{{${value.slice(1)}}}` as string | number | boolean | null | undefined;
						if (this.resolvedValue) {
							displayValue = [null, undefined].includes(displayValue as null | undefined) ? '' : displayValue;
							displayValue = this.resolveParameterString((displayValue as string).toString()) as NodeParameterValue;
						}

						displayValue = [null, undefined].includes(displayValue as null | undefined) ? '' : displayValue;

						editorOperations.push({
							attributes: {
								variable: `{{${value.slice(1)}}}`,
							},
							insert: (displayValue as string).toString(),
						});
					} else {
						// Is text
						editorOperations.push({
							insert: value,
						});
					}
				});

				// @ts-ignore
				this.editor!.setContents(editorOperations);
			},
			update () {
				this.$emit('input', this.getValue());
				this.$emit('change', this.getValue());
			},
		},
	});

</script>

<style lang="scss">

.variable-wrapper {
	text-decoration: none;
}

.variable-value {
	font-weight: bold;
	color: var(--color-text-dark);
	background-color: var(--color-text-base);
	padding: 3px;
	border-radius: 3px;
}

.variable-delete {
	position: relative;
	left: -3px;
	top: -8px;
	display: none;
	color: var(--color-text-xlight);
	font-weight: bold;
	padding: 2px 4px;
}

.variable-wrapper:hover .variable-delete {
	display: inline;
	background-color: var(--color-danger);
	border-radius: 5px;
}

.variable {
	font-weight: bold;
	color: #000;
	background-color: var(--color-text-base);
	padding: 3px;
	border-radius: 3px;
	margin: 0 2px;

	&:first-child {
		margin-left: 0;
	}

	&.invalid {
		background-color: var(--color-danger);
	}

	&.valid {
		background-color: var(--color-success);
	}

}

.ql-editor {
	padding: 0.5em 1em;
}

.ql-disabled .ql-editor {
	border-width: 1px;
	border: 1px solid $--custom-expression-text;
	color: $--custom-expression-text;
	background-color: $--custom-expression-background;
	cursor: not-allowed;
}

.ql-disabled .ql-editor .variable {
	color: #303030;
}

</style>
