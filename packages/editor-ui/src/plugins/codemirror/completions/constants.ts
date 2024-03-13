import type { Completion, CompletionSection } from '@codemirror/autocomplete';
import { i18n } from '@/plugins/i18n';
import { withSectionHeader } from './utils';

export const FIELDS_SECTION: CompletionSection = withSectionHeader({
	name: i18n.baseText('codeNodeEditor.completer.section.fields'),
	rank: -1,
});

export const RECOMMENDED_SECTION: CompletionSection = withSectionHeader({
	name: i18n.baseText('codeNodeEditor.completer.section.recommended'),
	rank: 0,
});

export const RECOMMENDED_METHODS_SECTION: CompletionSection = withSectionHeader({
	name: i18n.baseText('codeNodeEditor.completer.section.recommendedMethods'),
	rank: 0,
});

export const PREVIOUS_NODES_SECTION: CompletionSection = withSectionHeader({
	name: i18n.baseText('codeNodeEditor.completer.section.prevNodes'),
	rank: 1,
});

export const PROPERTIES_SECTION: CompletionSection = withSectionHeader({
	name: i18n.baseText('codeNodeEditor.completer.section.properties'),
	rank: 2,
});

export const METHODS_SECTION: CompletionSection = withSectionHeader({
	name: i18n.baseText('codeNodeEditor.completer.section.methods'),
	rank: 3,
});

export const METADATA_SECTION: CompletionSection = withSectionHeader({
	name: i18n.baseText('codeNodeEditor.completer.section.metadata'),
	rank: 4,
});

export const OTHER_METHODS_SECTION: CompletionSection = withSectionHeader({
	name: i18n.baseText('codeNodeEditor.completer.section.otherMethods'),
	rank: 100,
});

export const OTHER_SECTION: CompletionSection = withSectionHeader({
	name: i18n.baseText('codeNodeEditor.completer.section.other'),
	rank: 101,
});

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

export const DATE_RECOMMENDED_OPTIONS = ['format()', 'minus()', 'plus()', 'extract()'];
export const LUXON_RECOMMENDED_OPTIONS = ['format()', 'minus()', 'plus()', 'diff()', 'extract()'];
export const OBJECT_RECOMMENDED_OPTIONS = ['keys()', 'values()', 'isEmpty()'];
export const ARRAY_RECOMMENDED_OPTIONS = ['length', 'last()', 'includes()', 'map()', 'filter()'];
export const ARRAY_NUMBER_ONLY_METHODS = ['max()', 'min()', 'sum()', 'average()'];

export const LUXON_SECTIONS: Record<string, CompletionSection> = {
	edit: withSectionHeader({
		name: i18n.baseText('codeNodeEditor.completer.section.edit'),
		rank: 1,
	}),
	compare: withSectionHeader({
		name: i18n.baseText('codeNodeEditor.completer.section.compare'),
		rank: 2,
	}),
	format: withSectionHeader({
		name: i18n.baseText('codeNodeEditor.completer.section.format'),
		rank: 3,
	}),
	query: withSectionHeader({
		name: i18n.baseText('codeNodeEditor.completer.section.component'),
		rank: 4,
	}),
};

export const STRING_SECTIONS: Record<string, CompletionSection> = {
	edit: withSectionHeader({
		name: i18n.baseText('codeNodeEditor.completer.section.edit'),
		rank: 1,
	}),
	query: withSectionHeader({
		name: i18n.baseText('codeNodeEditor.completer.section.query'),
		rank: 2,
	}),
	validation: withSectionHeader({
		name: i18n.baseText('codeNodeEditor.completer.section.validation'),
		rank: 3,
	}),
	case: withSectionHeader({
		name: i18n.baseText('codeNodeEditor.completer.section.case'),
		rank: 4,
	}),
	cast: withSectionHeader({
		name: i18n.baseText('codeNodeEditor.completer.section.cast'),
		rank: 5,
	}),
};
