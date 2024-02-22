import type { Completion, CompletionSection } from '@codemirror/autocomplete';
import { i18n } from '@/plugins/i18n';

export const RECOMMENDED_SECTION: CompletionSection = {
	name: i18n.baseText('codeNodeEditor.completer.section.recommended'),
	rank: 0,
};

export const INPUT_SECTION: CompletionSection = {
	name: i18n.baseText('codeNodeEditor.completer.section.input'),
	rank: 1,
};

export const PREVIOUS_NODES_SECTION: CompletionSection = {
	name: i18n.baseText('codeNodeEditor.completer.section.prevNodes'),
	rank: 2,
};

export const METADATA_SECTION: CompletionSection = {
	name: i18n.baseText('codeNodeEditor.completer.section.metadata'),
	rank: 3,
};

export const FIELDS_SECTION: CompletionSection = {
	name: i18n.baseText('codeNodeEditor.completer.section.fields'),
	rank: 4,
};

export const METHODS_SECTION: CompletionSection = {
	name: i18n.baseText('codeNodeEditor.completer.section.methods'),
	rank: 5,
};

export const ROOT_DOLLAR_COMPLETIONS: Completion[] = [
	{
		label: '$json',
		section: INPUT_SECTION,
		info: i18n.rootVars.$json,
	},
	{
		label: '$binary',
		section: INPUT_SECTION,
		info: i18n.rootVars.$binary,
	},
	{
		label: '$input',
		section: INPUT_SECTION,
		info: i18n.rootVars.$input,
	},
	{
		label: '$execution',
		section: METADATA_SECTION,
		info: i18n.rootVars.$execution,
	},
	{
		label: '$itemIndex',
		section: METADATA_SECTION,
		info: i18n.rootVars.$itemIndex,
	},
	{
		label: '$parameter',
		section: METADATA_SECTION,
		info: i18n.rootVars.$parameter,
	},
	{
		label: '$prevNode',
		section: METADATA_SECTION,
		info: i18n.rootVars.$prevNode,
	},
	{
		label: '$runIndex',
		section: METADATA_SECTION,
		info: i18n.rootVars.$runIndex,
	},
	{
		label: '$vars',
		section: METADATA_SECTION,
		info: i18n.rootVars.$vars,
	},
	{
		label: '$workflow',
		section: METADATA_SECTION,
		info: i18n.rootVars.$workflow,
	},

	{
		label: '$now',
		section: FIELDS_SECTION,
		info: i18n.rootVars.$now,
	},
	{
		label: '$today',
		section: FIELDS_SECTION,
		info: i18n.rootVars.$today,
	},
	{
		label: '$if()',
		section: METHODS_SECTION,
		info: i18n.rootVars.$if,
	},
	{
		label: '$ifEmpty()',
		section: METHODS_SECTION,
		info: i18n.rootVars.$ifEmpty,
	},
	{
		label: '$jmespath()',
		section: METHODS_SECTION,
		info: i18n.rootVars.$jmespath,
	},
	{
		label: '$max()',
		section: METHODS_SECTION,
		info: i18n.rootVars.$max,
	},
	{
		label: '$min()',
		section: METHODS_SECTION,
		info: i18n.rootVars.$min,
	},
];

export const STRING_RECOMMENDED_OPTIONS = ['includes()', 'startsWith()', 'replaceAll()', 'length'];
