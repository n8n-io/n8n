import type { Completion, CompletionSection } from '@codemirror/autocomplete';
import { i18n } from '@n8n/i18n';
import { withSectionHeader } from './utils';
import { createInfoBoxRenderer } from './infoBoxRenderer';
import { Facet } from '@codemirror/state';
import type { TargetNodeParameterContext } from '@/Interface';

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
		info: createInfoBoxRenderer({
			name: '$json',
			returnType: 'Object',
			description: i18n.baseText('codeNodeEditor.completer.json'),
			docURL: 'https://docs.n8n.io/data/data-structure/',
		}),
	},
	{
		label: '$binary',
		section: RECOMMENDED_SECTION,
		info: createInfoBoxRenderer({
			name: '$binary',
			returnType: 'Object',
			description: i18n.baseText('codeNodeEditor.completer.binary'),
		}),
	},
	{
		label: '$now',
		section: RECOMMENDED_SECTION,
		info: createInfoBoxRenderer({
			name: '$now',
			returnType: 'DateTime',
			description: i18n.baseText('codeNodeEditor.completer.$now'),
		}),
	},
	{
		label: '$if()',
		section: RECOMMENDED_SECTION,
		info: createInfoBoxRenderer(
			{
				name: '$if',
				returnType: 'any',
				description: i18n.baseText('codeNodeEditor.completer.$if'),
				args: [
					{
						name: 'condition',
						description: i18n.baseText('codeNodeEditor.completer.$if.args.condition'),
						type: 'boolean',
					},
					{
						name: 'valueIfTrue',
						description: i18n.baseText('codeNodeEditor.completer.$if.args.valueIfTrue'),
						type: 'any',
					},
					{
						name: 'valueIfFalse',
						description: i18n.baseText('codeNodeEditor.completer.$if.args.valueIfFalse'),
						type: 'any',
					},
				],
				examples: [
					{
						example: '$if($now.hour < 17, "Good day", "Good evening")',
						description: i18n.baseText('codeNodeEditor.completer.$if.examples.1'),
					},
					{
						description: i18n.baseText('codeNodeEditor.completer.$if.examples.2'),
						example:
							'$if($now.hour < 10, "Good morning", $if($now.hour < 17, "Good day", "Good evening"))',
					},
				],
			},
			true,
		),
	},
	{
		label: '$ifEmpty()',
		section: RECOMMENDED_SECTION,
		info: createInfoBoxRenderer(
			{
				name: '$ifEmpty',
				returnType: 'any',
				description: i18n.baseText('codeNodeEditor.completer.$ifEmpty'),
				args: [
					{
						name: 'value',
						description: i18n.baseText('codeNodeEditor.completer.$ifEmpty.args.value'),
						type: 'any',
					},
					{
						name: 'valueIfEmpty',
						description: i18n.baseText('codeNodeEditor.completer.$ifEmpty.args.valueIfEmpty'),
						type: 'any',
					},
				],
				examples: [
					{
						example: '"Hi " + $ifEmpty(name, "there")',
						evaluated: 'e.g. "Hi Nathan" or "Hi there"',
					},
				],
			},
			true,
		),
	},
	{
		label: '$execution',
		section: METADATA_SECTION,
		info: createInfoBoxRenderer({
			name: '$execution',
			returnType: 'ExecData',
			description: i18n.baseText('codeNodeEditor.completer.$execution'),
		}),
	},
	{
		label: '$itemIndex',
		section: METADATA_SECTION,
		info: createInfoBoxRenderer({
			name: '$itemIndex',
			returnType: 'number',
			description: i18n.baseText('codeNodeEditor.completer.$itemIndex'),
		}),
	},
	{
		label: '$input',
		section: METADATA_SECTION,
		info: createInfoBoxRenderer({
			name: '$input',
			returnType: 'Object',
			description: i18n.baseText('codeNodeEditor.completer.$input'),
		}),
	},
	{
		label: '$parameter',
		section: METADATA_SECTION,
		info: createInfoBoxRenderer({
			name: '$parameter',
			returnType: 'Object',
			description: i18n.baseText('codeNodeEditor.completer.$parameter'),
		}),
	},
	{
		label: '$prevNode',
		section: METADATA_SECTION,
		info: createInfoBoxRenderer({
			name: '$prevNode',
			returnType: 'PrevNodeData',
			description: i18n.baseText('codeNodeEditor.completer.$prevNode'),
		}),
	},
	{
		label: '$runIndex',
		section: METADATA_SECTION,
		info: createInfoBoxRenderer({
			name: '$runIndex',
			returnType: 'number',
			description: i18n.baseText('codeNodeEditor.completer.$runIndex'),
		}),
	},
	{
		label: '$today',
		section: METADATA_SECTION,
		info: createInfoBoxRenderer({
			name: '$today',
			returnType: 'DateTime',
			description: i18n.baseText('codeNodeEditor.completer.$today'),
		}),
	},
	{
		label: '$vars',
		section: METADATA_SECTION,
		info: createInfoBoxRenderer({
			name: '$vars',
			returnType: 'Object',
			description: i18n.baseText('codeNodeEditor.completer.$vars'),
		}),
	},
	{
		label: '$workflow',
		section: METADATA_SECTION,
		info: createInfoBoxRenderer({
			name: '$workflow',
			returnType: 'WorkflowData',
			description: i18n.baseText('codeNodeEditor.completer.$workflow'),
		}),
	},
	{
		label: '$jmespath()',
		section: METHODS_SECTION,
		info: createInfoBoxRenderer(
			{
				name: '$jmespath',
				description: i18n.baseText('codeNodeEditor.completer.$jmespath'),
				returnType: 'any',
				args: [
					{
						name: 'obj',
						description: i18n.baseText('codeNodeEditor.completer.$jmespath.args.obj'),
						type: 'Object | Array',
					},
					{
						name: 'expression',
						description: i18n.baseText('codeNodeEditor.completer.$jmespath.args.expression'),
						type: 'string',
					},
				],
				examples: [
					{
						example:
							'data = {\n  "people": [\n    {\n      "name": "Bob",\n      "age": 20,\n      "other": "foo"\n    },\n    {\n      "name": "Fred",\n      "age": 25,\n      "other": "bar"\n    },\n    {\n      "name": "George",\n      "age": 30,\n      "other": "baz"\n    }\n  ]\n}\n\n$jmespath(data.people, \'[*].name\')',
						evaluated: "['Bob', 'Fred', 'George']",
						description: i18n.baseText('codeNodeEditor.completer.$jmespath.examples.1'),
					},
					{
						example: "$jmespath(data.people, '[?age > `20`].[name, age]')",
						evaluated: "[['Fred', 25], ['George', 30]]",
						description: i18n.baseText('codeNodeEditor.completer.$jmespath.examples.2'),
					},
					{
						example: "$jmespath(data.people, '[?age > `20`].name | [0]')",
						evaluated: 'Fred',
						description: i18n.baseText('codeNodeEditor.completer.$jmespath.examples.3'),
					},
					{
						example:
							'data = {\n  "reservations": [\n    {\n      "id": 1,\n      "guests": [\n        {\n          "name": "Nathan",\n          "requirements": {\n            "room": "double",\n            "meal": "vegetarian"\n          }\n        },\n        {\n          "name": "Meg",\n          "requirements": {\n            "room": "single"\n          }\n        }\n      ]\n    },\n    {\n      "id": 2,\n      "guests": [\n        {\n          "name": "Lex",\n          "requirements": {\n            "room": "double"\n          }\n        }\n      ]\n    }\n  ]\n}\n\n$jmespath(data, "reservations[].guests[?requirements.room==\'double\'][].name")',
						evaluated: "['Nathan', 'Lex']",
						description: i18n.baseText('codeNodeEditor.completer.$jmespath.examples.4'),
					},
				],
			},
			true,
		),
	},
	{
		label: '$fromAI()',
		section: METHODS_SECTION,
		info: createInfoBoxRenderer(
			{
				name: '$fromAI',
				returnType: 'any',
				description: 'Populate this with the parameter passed from the large language model',
				docURL: 'https://docs.n8n.io/advanced-ai/examples/using-the-fromai-function/',
				args: [
					{
						name: 'key',
						description:
							'The key or name of the argument, must be between 1 and 64 characters long and only contain lowercase letters, uppercase letters, numbers, underscores, and hyphens',
						type: 'string',
					},
					{
						name: 'description',
						description: 'Description of the argument',
						type: 'string',
						optional: true,
					},
					{
						name: 'type',
						description: 'Type of the argument',
						type: 'string | number | boolean | json',
						optional: true,
					},
					{
						name: 'defaultValue',
						description: 'Default value for the argument',
						type: 'any',
						optional: true,
					},
				],
				examples: [
					{
						example: '$fromAI("name")',
						description: 'Get the name of the person',
					},
					{
						example: '$fromAI("age", "The age of the person", "number", 18)',
						description: 'Get the age of the person as number with default value 18',
					},
					{
						example: '$fromAI("isStudent", "Is the person a student", "boolean", false)',
						description: 'Get the student status of the person as boolean with default value false',
					},
				],
			},
			true,
		),
	},
	{
		label: '$max()',
		section: METHODS_SECTION,
		info: createInfoBoxRenderer(
			{
				name: '$max',
				returnType: 'number',
				description: i18n.baseText('codeNodeEditor.completer.$max'),
				args: [
					{
						name: 'numbers',
						description: i18n.baseText('codeNodeEditor.completer.$max.args.numbers'),
						type: 'number',
						variadic: true,
					},
				],
				examples: [{ example: '$max(1, 5, 42, 0.5)', evaluated: '42' }],
			},
			true,
		),
	},
	{
		label: '$min()',
		section: METHODS_SECTION,
		info: createInfoBoxRenderer(
			{
				name: '$min',
				returnType: 'number',
				description: i18n.baseText('codeNodeEditor.completer.$min'),
				args: [
					{
						name: 'numbers',
						description: i18n.baseText('codeNodeEditor.completer.$max.args.numbers'),
						variadic: true,
						type: 'number',
					},
				],
				examples: [{ example: '$min(1, 5, 42, 0.5)', evaluated: '0.5' }],
			},
			true,
		),
	},
	{
		label: '$nodeVersion',
		section: METADATA_SECTION,
		info: createInfoBoxRenderer({
			name: '$nodeVersion',
			returnType: 'number',
			description: i18n.baseText('codeNodeEditor.completer.$nodeVersion'),
		}),
	},
];

export const STRING_RECOMMENDED_OPTIONS = [
	'includes()',
	'split()',
	'startsWith()',
	'replaceAll()',
	'length',
];

export const LUXON_RECOMMENDED_OPTIONS = ['format()', 'minus()', 'plus()', 'diffTo()', 'extract()'];
export const OBJECT_RECOMMENDED_OPTIONS = ['keys()', 'values()', 'isEmpty()', 'hasField()'];
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

export const TARGET_NODE_PARAMETER_FACET = Facet.define<
	TargetNodeParameterContext | undefined,
	TargetNodeParameterContext | undefined
>({
	combine: (values) => values[0],
});
