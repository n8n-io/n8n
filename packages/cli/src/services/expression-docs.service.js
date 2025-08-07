'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.ExpressionDocsService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
let ExpressionDocsService = class ExpressionDocsService {
	constructor(logger) {
		this.logger = logger;
	}
	getFunctionDocumentation(functionName) {
		const allDocs = this.getAllFunctionDocs();
		if (functionName) {
			return allDocs.find((doc) => doc.name === functionName) ?? null;
		}
		return allDocs;
	}
	getVariableDocumentation(variableName) {
		const allDocs = this.getAllVariableDocs();
		if (variableName) {
			return allDocs.find((doc) => doc.name === variableName) ?? null;
		}
		return allDocs;
	}
	getExpressionSyntaxDocs(topic) {
		const allDocs = this.getAllSyntaxDocs();
		if (topic) {
			return allDocs.find((doc) => doc.topic === topic) ?? null;
		}
		return allDocs;
	}
	getContextualDocumentation(nodeType, context) {
		const functions = this.getAllFunctionDocs();
		const variables = this.getAllVariableDocs();
		const relevantFunctions = functions.filter((func) => {
			if (!func.tags) return false;
			return func.tags.some(
				(tag) =>
					tag.includes(nodeType.toLowerCase()) || tag.includes('general') || tag.includes('common'),
			);
		});
		const relevantVariables = variables.filter((variable) => {
			if (!variable.availability?.nodeTypes) return true;
			return variable.availability.nodeTypes.includes(nodeType);
		});
		const contextSpecificTips = this.getNodeSpecificTips(nodeType, context);
		return {
			relevantFunctions,
			relevantVariables,
			contextSpecificTips,
		};
	}
	searchDocumentation(query, type) {
		const searchTerm = query.toLowerCase();
		const results = {
			functions: [],
			variables: [],
			syntax: [],
		};
		if (!type || type === 'functions') {
			results.functions = this.getAllFunctionDocs().filter(
				(func) =>
					func.name.toLowerCase().includes(searchTerm) ||
					func.description.toLowerCase().includes(searchTerm) ||
					func.category.toLowerCase().includes(searchTerm) ||
					func.tags?.some((tag) => tag.toLowerCase().includes(searchTerm)),
			);
		}
		if (!type || type === 'variables') {
			results.variables = this.getAllVariableDocs().filter(
				(variable) =>
					variable.name.toLowerCase().includes(searchTerm) ||
					variable.description.toLowerCase().includes(searchTerm) ||
					variable.category.toLowerCase().includes(searchTerm),
			);
		}
		if (!type || type === 'syntax') {
			results.syntax = this.getAllSyntaxDocs().filter(
				(syntax) =>
					syntax.topic.toLowerCase().includes(searchTerm) ||
					syntax.description.toLowerCase().includes(searchTerm),
			);
		}
		return results;
	}
	getAllFunctionDocs() {
		return [
			{
				name: '$min',
				description: 'Returns the minimum value from a list of numbers',
				syntax: '$min(value1, value2, ...values)',
				parameters: [
					{
						name: 'values',
						type: 'number[]',
						description: 'Numbers to compare',
					},
				],
				returnType: 'number',
				examples: [
					{
						description: 'Find minimum of three numbers',
						code: '$min(5, 2, 8)',
						result: '2',
					},
					{
						description: 'Find minimum from array',
						code: '$min(...[10, 5, 15])',
						result: '5',
					},
				],
				category: 'math',
				tags: ['math', 'numbers', 'comparison', 'general'],
				relatedFunctions: ['$max', '$average'],
			},
			{
				name: '$max',
				description: 'Returns the maximum value from a list of numbers',
				syntax: '$max(value1, value2, ...values)',
				parameters: [
					{
						name: 'values',
						type: 'number[]',
						description: 'Numbers to compare',
					},
				],
				returnType: 'number',
				examples: [
					{
						description: 'Find maximum of three numbers',
						code: '$max(5, 2, 8)',
						result: '8',
					},
					{
						description: 'Find maximum from JSON data',
						code: '$max($json.score1, $json.score2, $json.score3)',
						result: 'highest score value',
					},
				],
				category: 'math',
				tags: ['math', 'numbers', 'comparison', 'general'],
				relatedFunctions: ['$min', '$average'],
			},
			{
				name: '$average',
				description: 'Calculates the arithmetic mean of numbers',
				syntax: '$average(value1, value2, ...values)',
				parameters: [
					{
						name: 'values',
						type: 'number[]',
						description: 'Numbers to average',
					},
				],
				returnType: 'number',
				examples: [
					{
						description: 'Calculate average of test scores',
						code: '$average(85, 92, 78, 96)',
						result: '87.75',
					},
				],
				category: 'math',
				tags: ['math', 'numbers', 'calculation', 'general'],
				relatedFunctions: ['$min', '$max', '$sum'],
			},
			{
				name: '$now',
				description: 'Returns the current date and time as a DateTime object',
				syntax: '$now',
				returnType: 'DateTime',
				examples: [
					{
						description: 'Get current timestamp',
						code: '$now',
						result: 'Current DateTime object',
					},
					{
						description: 'Format current date',
						code: '$now.toFormat("yyyy-MM-dd")',
						result: '2024-01-15',
					},
				],
				category: 'date',
				tags: ['date', 'time', 'current', 'general'],
				relatedFunctions: ['$today', 'DateTime.now()'],
				notes: [
					'Returns a Luxon DateTime object',
					'Use .toFormat() to format as string',
					'Use .toISO() for ISO string format',
				],
			},
			{
				name: '$today',
				description: "Returns today's date at midnight as a DateTime object",
				syntax: '$today',
				returnType: 'DateTime',
				examples: [
					{
						description: 'Get today at midnight',
						code: '$today',
						result: "Today's DateTime at 00:00:00",
					},
					{
						description: 'Check if date is today',
						code: '$json.created_date >= $today',
						result: 'Boolean comparison result',
					},
				],
				category: 'date',
				tags: ['date', 'time', 'today', 'general'],
				relatedFunctions: ['$now', 'DateTime.fromISO()'],
			},
			{
				name: 'split',
				description: 'Splits a string into an array based on a separator',
				syntax: 'string.split(separator)',
				parameters: [
					{
						name: 'separator',
						type: 'string',
						description: 'String to split on',
					},
				],
				returnType: 'string[]',
				examples: [
					{
						description: 'Split CSV values',
						code: '"apple,banana,cherry".split(",")',
						result: '["apple", "banana", "cherry"]',
					},
					{
						description: 'Split by space',
						code: '$json.full_name.split(" ")',
						result: 'Array of name parts',
					},
				],
				category: 'string',
				tags: ['string', 'array', 'parsing', 'general'],
				relatedFunctions: ['join', 'slice', 'substring'],
			},
			{
				name: 'map',
				description:
					'Creates a new array with the results of calling a function for every array element',
				syntax: 'array.map(callback)',
				parameters: [
					{
						name: 'callback',
						type: 'function',
						description: 'Function to call for each element',
					},
				],
				returnType: 'any[]',
				examples: [
					{
						description: 'Double all numbers',
						code: '[1, 2, 3].map(x => x * 2)',
						result: '[2, 4, 6]',
					},
					{
						description: 'Extract property from objects',
						code: '$json.users.map(user => user.name)',
						result: 'Array of user names',
					},
				],
				category: 'array',
				tags: ['array', 'transformation', 'iteration', 'general'],
				relatedFunctions: ['filter', 'reduce', 'forEach'],
			},
			{
				name: '$jmesPath',
				description: 'Query JSON data using JMESPath syntax',
				syntax: '$jmesPath(data, query)',
				parameters: [
					{
						name: 'data',
						type: 'object',
						description: 'JSON data to query',
					},
					{
						name: 'query',
						type: 'string',
						description: 'JMESPath query string',
					},
				],
				returnType: 'any',
				examples: [
					{
						description: 'Extract nested array values',
						code: '$jmesPath($json, "users[*].name")',
						result: 'Array of user names',
					},
					{
						description: 'Filter and sort',
						code: '$jmesPath($json, "items[?price > `10`] | sort_by(@, &name)")',
						result: 'Filtered and sorted items',
					},
				],
				category: 'utility',
				tags: ['json', 'query', 'filtering', 'general'],
				relatedFunctions: ['$evaluateExpression'],
				notes: [
					'Powerful JSON querying language',
					'Supports filtering, sorting, and complex transformations',
					'Use backticks for literal values in queries',
				],
			},
		];
	}
	getAllVariableDocs() {
		return [
			{
				name: '$json',
				type: 'object',
				description: 'JSON data from the current item being processed',
				examples: [
					{
						description: 'Access a property',
						code: '$json.name',
						result: 'Value of the name property',
					},
					{
						description: 'Access nested property',
						code: '$json.user.email',
						result: 'Email from nested user object',
					},
				],
				category: 'core',
				properties: {
					all: {
						type: 'any',
						description: 'Any property from the JSON data',
						example: '$json.propertyName',
					},
				},
				notes: [
					'Alias for $data',
					"Contains the current item's JSON data",
					'Use dot notation to access nested properties',
				],
				availability: {
					contexts: ['all'],
				},
			},
			{
				name: '$data',
				type: 'object',
				description: 'Raw data from the current item (alias for $json)',
				examples: [
					{
						description: 'Access raw data',
						code: '$data',
						result: 'Complete current item data',
					},
				],
				category: 'core',
				notes: ['Same as $json', 'Contains the complete current item data'],
				availability: {
					contexts: ['all'],
				},
			},
			{
				name: '$binary',
				type: 'object',
				description: 'Binary data from the current item',
				examples: [
					{
						description: 'Access binary file',
						code: '$binary.data',
						result: 'Binary data object',
					},
					{
						description: 'Get file name',
						code: '$binary.fileName',
						result: 'Name of the binary file',
					},
				],
				category: 'core',
				properties: {
					fileName: {
						type: 'string',
						description: 'Name of the binary file',
						example: '$binary.fileName',
					},
					mimeType: {
						type: 'string',
						description: 'MIME type of the binary data',
						example: '$binary.mimeType',
					},
					data: {
						type: 'Buffer',
						description: 'The binary data itself',
						example: '$binary.data',
					},
				},
				availability: {
					contexts: ['all'],
				},
			},
			{
				name: '$item',
				type: 'function',
				description: 'Access data from a specific item by index',
				examples: [
					{
						description: 'Get first item data',
						code: '$item(0).json.name',
						result: 'Name from first item',
					},
					{
						description: 'Get previous item',
						code: '$item($itemIndex - 1).json',
						result: 'JSON data from previous item',
					},
				],
				category: 'core',
				notes: [
					'Use to access data from other items in the input',
					'Index starts at 0',
					'Can access json, binary, and other properties',
				],
				availability: {
					contexts: ['all'],
				},
			},
			{
				name: '$items',
				type: 'function',
				description: 'Access all items from a node',
				examples: [
					{
						description: 'Get all items from previous node',
						code: '$items()',
						result: 'Array of all items',
					},
					{
						description: 'Get items from specific node',
						code: '$items("HTTP Request")',
						result: 'All items from HTTP Request node',
					},
				],
				category: 'core',
				notes: [
					'Returns array of all items',
					'Can specify node name to get items from specific node',
					'Useful for processing multiple items at once',
				],
				availability: {
					contexts: ['all'],
				},
			},
			{
				name: '$node',
				type: 'object',
				description: 'Access data from any node in the workflow',
				examples: [
					{
						description: 'Get data from specific node',
						code: '$node["HTTP Request"].json',
						result: 'JSON data from HTTP Request node',
					},
					{
						description: 'Access node parameters',
						code: '$node["Set"].parameter.value1',
						result: 'Parameter value from Set node',
					},
				],
				category: 'core',
				properties: {
					json: {
						type: 'object',
						description: 'JSON data output from the node',
						example: '$node["NodeName"].json',
					},
					binary: {
						type: 'object',
						description: 'Binary data output from the node',
						example: '$node["NodeName"].binary',
					},
					parameter: {
						type: 'object',
						description: 'Parameter values set in the node',
						example: '$node["NodeName"].parameter.paramName',
					},
				},
				availability: {
					contexts: ['all'],
				},
			},
			{
				name: '$workflow',
				type: 'object',
				description: 'Information about the current workflow',
				examples: [
					{
						description: 'Get workflow ID',
						code: '$workflow.id',
						result: 'Current workflow ID',
					},
					{
						description: 'Get workflow name',
						code: '$workflow.name',
						result: 'Current workflow name',
					},
				],
				category: 'workflow',
				properties: {
					id: {
						type: 'string',
						description: 'Unique identifier of the workflow',
						example: '$workflow.id',
					},
					name: {
						type: 'string',
						description: 'Display name of the workflow',
						example: '$workflow.name',
					},
					active: {
						type: 'boolean',
						description: 'Whether the workflow is currently active',
						example: '$workflow.active',
					},
				},
				availability: {
					contexts: ['all'],
				},
			},
			{
				name: '$parameter',
				type: 'object',
				description: 'Access parameter values from the current node',
				examples: [
					{
						description: 'Get parameter value',
						code: '$parameter.myParam',
						result: 'Value of myParam parameter',
					},
				],
				category: 'node',
				availability: {
					contexts: ['node-execution'],
				},
			},
			{
				name: '$env',
				type: 'object',
				description: 'Access environment variables',
				examples: [
					{
						description: 'Get environment variable',
						code: '$env.NODE_ENV',
						result: 'Value of NODE_ENV',
					},
					{
						description: 'Use in conditional',
						code: '$env.DEBUG === "true"',
						result: 'Boolean comparison result',
					},
				],
				category: 'environment',
				notes: [
					'Access server environment variables',
					'Use for configuration and secrets',
					'Available environment variables depend on server setup',
				],
				availability: {
					contexts: ['all'],
				},
			},
		];
	}
	getAllSyntaxDocs() {
		return [
			{
				topic: 'Basic Expressions',
				description: 'How to write and use basic expressions in n8n',
				syntax: '={{ expression }}',
				examples: [
					{
						description: 'Simple property access',
						code: '={{ $json.name }}',
						result: 'Value of name property',
					},
					{
						description: 'String concatenation',
						code: '={{ "Hello " + $json.name }}',
						result: 'Hello John',
					},
					{
						description: 'Mathematical operation',
						code: '={{ $json.price * 1.1 }}',
						result: 'Price with 10% markup',
					},
				],
				relatedTopics: ['Variables', 'Functions'],
				notes: [
					'Expressions must be wrapped in {{ }}',
					'Use JavaScript syntax inside expressions',
					'Access node data using special variables like $json',
				],
			},
			{
				topic: 'Conditional Logic',
				description: 'Using if-else logic and ternary operators in expressions',
				syntax: '={{ condition ? valueIfTrue : valueIfFalse }}',
				examples: [
					{
						description: 'Simple ternary operator',
						code: '={{ $json.age >= 18 ? "Adult" : "Minor" }}',
						result: 'Adult or Minor based on age',
					},
					{
						description: 'Complex condition',
						code: '={{ $json.status === "active" && $json.verified ? "Ready" : "Pending" }}',
						result: 'Ready or Pending based on conditions',
					},
					{
						description: 'Nested conditions',
						code: '={{ $json.score > 90 ? "A" : $json.score > 80 ? "B" : "C" }}',
						result: 'Letter grade based on score',
					},
				],
				relatedTopics: ['Basic Expressions', 'Logical Operators'],
				notes: [
					'Use ternary operator (condition ? true : false) for simple if-else',
					'Chain multiple conditions for complex logic',
					'Logical operators: && (and), || (or), ! (not)',
				],
			},
			{
				topic: 'Array Operations',
				description: 'Working with arrays in expressions',
				syntax: 'array.method(callback)',
				examples: [
					{
						description: 'Filter array elements',
						code: '={{ $json.items.filter(item => item.price > 10) }}',
						result: 'Array of items with price > 10',
					},
					{
						description: 'Transform array elements',
						code: '={{ $json.users.map(user => user.name.toUpperCase()) }}',
						result: 'Array of uppercase user names',
					},
					{
						description: 'Find array element',
						code: '={{ $json.products.find(p => p.id === "123") }}',
						result: 'First product with ID 123',
					},
				],
				relatedTopics: ['Functions', 'Loops'],
				notes: [
					'Use array methods like map, filter, find, reduce',
					'Arrow functions: (param) => expression',
					'Access array elements with bracket notation: array[0]',
				],
			},
			{
				topic: 'Date and Time',
				description: 'Working with dates and times using Luxon DateTime',
				syntax: 'DateTime.method() or $now.method()',
				examples: [
					{
						description: 'Format current date',
						code: '={{ $now.toFormat("yyyy-MM-dd") }}',
						result: '2024-01-15',
					},
					{
						description: 'Parse date string',
						code: '={{ DateTime.fromISO($json.created_at).toFormat("MMM dd, yyyy") }}',
						result: 'Jan 15, 2024',
					},
					{
						description: 'Date arithmetic',
						code: '={{ $now.plus({ days: 7 }).toISO() }}',
						result: 'ISO string for 7 days from now',
					},
				],
				relatedTopics: ['Functions', 'Variables'],
				notes: [
					'Uses Luxon library for date/time operations',
					'$now and $today provide current date/time',
					'Use toFormat() for custom date formatting',
					'Use plus/minus for date arithmetic',
				],
			},
			{
				topic: 'Error Handling',
				description: 'Handling errors and edge cases in expressions',
				syntax: 'Various defensive programming patterns',
				examples: [
					{
						description: 'Safe property access',
						code: '={{ $json.user?.name || "Unknown" }}',
						result: 'Name or "Unknown" if user is null',
					},
					{
						description: 'Type checking',
						code: '={{ typeof $json.count === "number" ? $json.count : 0 }}',
						result: 'Number value or 0 if not a number',
					},
					{
						description: 'Array safety',
						code: '={{ Array.isArray($json.items) ? $json.items.length : 0 }}',
						result: 'Array length or 0 if not an array',
					},
				],
				relatedTopics: ['Conditional Logic', 'Type Checking'],
				notes: [
					'Use optional chaining (?.) for safe property access',
					'Provide fallback values with || operator',
					'Check types before operations to prevent errors',
					'Use Array.isArray() to verify arrays',
				],
			},
		];
	}
	getCategories() {
		const functions = this.getAllFunctionDocs();
		const categories = [...new Set(functions.map((func) => func.category))];
		return categories.map((category) => ({
			name: category,
			description: `${category.charAt(0).toUpperCase() + category.slice(1)} functions`,
			functionCount: functions.filter((func) => func.category === category).length,
		}));
	}
	getFunctionsByCategory(category) {
		const functions = this.getAllFunctionDocs();
		if (category) {
			return functions.filter((func) => func.category === category);
		}
		return functions;
	}
	getContextVariables(context = 'all') {
		const variables = this.getAllVariableDocs();
		if (context === 'all') {
			return variables;
		}
		return variables.filter(
			(variable) =>
				variable.availability?.contexts.includes(context) ||
				variable.availability?.contexts.includes('all'),
		);
	}
	getNodeSpecificTips(nodeType, context) {
		const tips = {
			httpRequest: [
				'Use $json to access response data',
				'Check $json.statusCode for HTTP status',
				'Access headers with $json.headers',
				'Use expressions in URL parameters',
			],
			setNode: [
				'Use expressions to transform data',
				'Access input data with $json',
				'Combine multiple data sources',
				'Set conditional values with ternary operators',
			],
			codeNode: [
				'Access all items with $input.all()',
				'Return data using return statement',
				'Use $json for current item in Code node context',
			],
			IF: [
				'Use comparison operators: ===, !==, >, <, >=, <=',
				'Combine conditions with && and ||',
				'Check for null/undefined with optional chaining',
			],
			switchNode: [
				'Compare against $json properties',
				'Use regular expressions for pattern matching',
				'Support multiple conditions per output',
			],
			webhookNode: [
				'Access request body with $json',
				'Get query parameters with $parameter',
				'Check HTTP method with $parameter.httpMethod',
			],
		};
		return (
			tips[nodeType] || [
				'Use $json to access current item data',
				'Use $items() to access all input items',
				'Use $node to access data from other nodes',
				'Check the expression editor for available variables',
			]
		);
	}
};
exports.ExpressionDocsService = ExpressionDocsService;
exports.ExpressionDocsService = ExpressionDocsService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [backend_common_1.Logger])],
	ExpressionDocsService,
);
//# sourceMappingURL=expression-docs.service.js.map
