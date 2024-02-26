import type { Completion, CompletionSection } from '@codemirror/autocomplete';
import { i18n } from '@/plugins/i18n';

export const RECOMMENDED_SECTION: CompletionSection = {
	name: i18n.baseText('codeNodeEditor.completer.section.recommended'),
	rank: 0,
};

export const RECOMMENDED_METHODS_SECTION: CompletionSection = {
	name: i18n.baseText('codeNodeEditor.completer.section.recommendedMethods'),
	rank: 0,
};

export const PREVIOUS_NODES_SECTION: CompletionSection = {
	name: i18n.baseText('codeNodeEditor.completer.section.prevNodes'),
	rank: 2,
};

export const FIELDS_SECTION: CompletionSection = {
	name: i18n.baseText('codeNodeEditor.completer.section.fields'),
	rank: 3,
};

export const METHODS_SECTION: CompletionSection = {
	name: i18n.baseText('codeNodeEditor.completer.section.methods'),
	rank: 4,
};

export const METADATA_SECTION: CompletionSection = {
	name: i18n.baseText('codeNodeEditor.completer.section.metadata'),
	rank: 5,
};

export const OTHER_METHODS_SECTION: CompletionSection = {
	name: i18n.baseText('codeNodeEditor.completer.section.otherMethods'),
	rank: 100,
};

export const OTHER_SECTION: CompletionSection = {
	name: i18n.baseText('codeNodeEditor.completer.section.other'),
	rank: 101,
};

export const ROOT_DOLLAR_COMPLETIONS: Completion[] = [
	{
		label: '$json',
		section: RECOMMENDED_SECTION,
		info: i18n.rootVars.$json,
	},
	{
		label: '$binary',
		section: RECOMMENDED_SECTION,
		info: i18n.rootVars.$binary,
	},
	{
		label: '$now',
		section: RECOMMENDED_SECTION,
		info: i18n.rootVars.$now,
	},
	{
		label: '$if()',
		section: RECOMMENDED_SECTION,
		info: i18n.rootVars.$if,
	},
	{
		label: '$ifEmpty()',
		section: RECOMMENDED_SECTION,
		info: i18n.rootVars.$ifEmpty,
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
		label: '$input',
		section: METADATA_SECTION,
		info: i18n.rootVars.$input,
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
		label: '$today',
		section: METADATA_SECTION,
		info: i18n.rootVars.$today,
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

export const STRING_RECOMMENDED_OPTIONS = [
	'includes()',
	'split()',
	'startsWith()',
	'replaceAll()',
	'length',
];
export const STRING_EDIT_OPTIONS = [
	'concat()',
	'replace()',
	'replaceAll()',
	'replaceSpecialChars()',
	'slice()',
	'split()',
	'substring()',
	'trim()',
	'trimEnd()',
	'trimStart()',
	'hash()',
	'removeMarkdown()',
	'removeTags()',
	'urlDecode()',
	'urlEncode()',
	'quote()',
	'extractEmail()',
	'extractDomain()',
	'extractUrl()',
];

export const LUXON_RECOMMENDED_OPTIONS = ['format()', 'minus()', 'plus()', 'diff()'];
export const ARRAY_RECOMMENDED_OPTIONS = ['length', 'last()', 'includes()', 'map()', 'filter()'];
export const OBJECT_RECOMMENDED_OPTIONS = ['keys()', 'values()', 'isEmpty()'];

export const LUXON_SECTIONS: Record<string, CompletionSection> = {
	edit: {
		name: i18n.baseText('codeNodeEditor.completer.section.edit'),
		rank: 1,
	},
	compare: {
		name: i18n.baseText('codeNodeEditor.completer.section.compare'),
		rank: 2,
	},
	format: {
		name: i18n.baseText('codeNodeEditor.completer.section.format'),
		rank: 3,
	},
	query: {
		name: i18n.baseText('codeNodeEditor.completer.section.component'),
		rank: 4,
	},
};

export const STRING_SECTIONS: Record<string, CompletionSection> = {
	edit: {
		name: i18n.baseText('codeNodeEditor.completer.section.edit'),
		rank: 1,
	},
	query: {
		name: i18n.baseText('codeNodeEditor.completer.section.query'),
		rank: 2,
	},
	validation: {
		name: i18n.baseText('codeNodeEditor.completer.section.validation'),
		rank: 3,
	},
	case: {
		name: i18n.baseText('codeNodeEditor.completer.section.case'),
		rank: 4,
	},
	cast: {
		name: i18n.baseText('codeNodeEditor.completer.section.cast'),
		rank: 5,
	},
};
