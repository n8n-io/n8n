import { snippetCompletion } from '@codemirror/autocomplete';

export const blockCommentSnippet = snippetCompletion('/**\n * #{}\n */', {
	label: '/**',
	detail: 'Block Comment',
});

export const snippets = [
	snippetCompletion('console.log(#{})', { label: 'log', detail: 'Log to console' }),
	snippetCompletion('for (const #{1:element} of #{2:array}) {\n\t#{}\n}', {
		label: 'forof',
		detail: 'For-of Loop',
	}),
	snippetCompletion(
		'for (const #{1:key} in #{2:object}) {\n\tif (Object.prototype.hasOwnProperty.call(#{2:object}, #{1:key})) {\n\t\tconst #{3:element} = #{2:object}[#{1:key}];\n\t\t#{}\n\t}\n}',
		{
			label: 'forin',
			detail: 'For-in Loop',
		},
	),
	snippetCompletion(
		'for (let #{1:index} = 0; #{1:index} < #{2:array}.length; #{1:index}++) {\n\tconst #{3:element} = #{2:array}[#{1:index}];\n\t#{}\n}',
		{
			label: 'for',
			detail: 'For Loop',
		},
	),
	snippetCompletion('if (#{1:condition}) {\n\t#{}\n}', {
		label: 'if',
		detail: 'If Statement',
	}),
	snippetCompletion('if (#{1:condition}) {\n\t#{}\n} else {\n\t\n}', {
		label: 'ifelse',
		detail: 'If-Else Statement',
	}),
	snippetCompletion('function #{1:name}(#{2:params}) {\n\t#{}\n}', {
		label: 'function',
		detail: 'Function Statement',
	}),
	snippetCompletion('function #{1:name}(#{2:params}) {\n\t#{}\n}', {
		label: 'fn',
		detail: 'Function Statement',
	}),
	snippetCompletion(
		'switch (#{1:key}) {\n\tcase #{2:value}:\n\t\t#{}\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}',
		{
			label: 'switch',
			detail: 'Switch Statement',
		},
	),
	snippetCompletion('try {\n\t#{}\n} catch (#{1:error}) {\n\t\n}', {
		label: 'trycatch',
		detail: 'Try-Catch Statement',
	}),
	snippetCompletion('while (#{1:condition}) {\n\t#{}\n}', {
		label: 'while',
		detail: 'While Statement',
	}),
	blockCommentSnippet,
];
