import { RuleTester } from '@typescript-eslint/rule-tester';

import { NoBuilderHintLeakageRule } from './no-builder-hint-leakage.js';

const ruleTester = new RuleTester();

ruleTester.run('no-builder-hint-leakage', NoBuilderHintLeakageRule, {
	valid: [
		{
			name: 'builderHint with no forbidden patterns',
			code: 'const x = { builderHint: { propertyHint: "use expr() to embed expressions" } };',
		},
		{
			name: 'builderHint using expr() form in example',
			code: 'const x = { builderHint: { propertyHint: "e.g. expr(\'{{ $json.field }}\')" } };',
		},
		{
			name: 'connection-type names as keys are allowed (wire-format structural data)',
			code: 'const x = { builderHint: { inputs: { ai_languageModel: { required: true } } } };',
		},
		{
			name: 'wire-format ={{ ... }} outside builderHint is fine in default scope',
			code: "const inputs = '={{ $parameter.foo }}';",
		},
		{
			name: 'connection-type literal outside builderHint is fine in default scope',
			code: "const requires = ['ai_languageModel'];",
		},
		{
			name: 'with scope=all, connection-type as key is still allowed',
			code: "const inputs = { ai_languageModel: 'required' };",
			options: [{ scope: 'all' }],
		},
		{
			name: 'with scope=all, exact connection-type as value is allowed (structured data)',
			code: "const config = { connectionType: 'ai_languageModel' };",
			options: [{ scope: 'all' }],
		},
		{
			name: 'with scope=all, connection-type in array of literals is allowed',
			code: "const required = ['ai_tool', 'ai_memory'];",
			options: [{ scope: 'all' }],
		},
	],
	invalid: [
		{
			name: 'wire-format ={{ ... }} inside builderHint message',
			code: 'const x = { builderHint: { propertyHint: "e.g. ={{ $json.field }}" } };',
			errors: [{ messageId: 'wireExpression' }],
		},
		{
			name: 'wire-format ={{ ... }} inside template literal in builderHint',
			code: 'const x = { builderHint: { propertyHint: `e.g. ={{ $json.field }}` } };',
			errors: [{ messageId: 'wireExpression' }],
		},
		{
			name: 'connection-type literal inside builderHint message',
			code: 'const x = { builderHint: { searchHint: "requires ai_languageModel" } };',
			errors: [{ messageId: 'connectionTypeLiteral' }],
		},
		{
			name: 'multiple connection-type literals in one string',
			code: 'const x = { builderHint: { propertyHint: "needs ai_languageModel and ai_tool" } };',
			errors: [{ messageId: 'connectionTypeLiteral' }, { messageId: 'connectionTypeLiteral' }],
		},
		{
			name: 'wire-format inside nested builderHint structure',
			code: 'const x = { description: { builderHint: { tip: { message: "={{ $json.x }}" } } } };',
			errors: [{ messageId: 'wireExpression' }],
		},
		{
			name: 'with scope=all, wire-format anywhere is flagged',
			code: 'const prompt = "use ={{ $json.foo }} pattern";',
			options: [{ scope: 'all' }],
			errors: [{ messageId: 'wireExpression' }],
		},
		{
			name: 'with scope=all, connection-type literal in any string is flagged',
			code: 'const prompt = "Connect via ai_tool to AI Agent";',
			options: [{ scope: 'all' }],
			errors: [{ messageId: 'connectionTypeLiteral' }],
		},
	],
});
