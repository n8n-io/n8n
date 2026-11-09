import {
	createRule,
	findObjectProperty,
	getOptionObjects,
	getStringLiteralValue,
	isOperationParameter,
	STANDARD_OPERATION_NAMES,
} from '../utils/index.js';

const BASE_RULE_GET_ALL_PREFIX = 'Get all ';

const alternatives = new Intl.ListFormat('en', { type: 'disjunction' });

function sentenceCase(name: string): string {
	return name.charAt(0) + name.slice(1).toLowerCase();
}

function startsWithName(action: string, name: string): boolean {
	const prefix = name.toLowerCase();
	const lowerAction = action.toLowerCase();
	return lowerAction === prefix || lowerAction.startsWith(`${prefix} `);
}

export const OperationStandardActionRule = createRule({
	name: 'operation-standard-action',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Require the actions of the "getAll" and "upsert" operations to start with their standard names, like "Get many" and "Create or update"',
		},
		messages: {
			wrongAction:
				'Start the action of the "{{ value }}" operation with {{ expected }}, not "{{ action }}". For example, use "{{ example }} contacts".',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ObjectExpression(node) {
				if (!isOperationParameter(node)) {
					return;
				}

				for (const option of getOptionObjects(node)) {
					const value = getStringLiteralValue(findObjectProperty(option, 'value')?.value ?? null);
					const names = value === null ? undefined : STANDARD_OPERATION_NAMES.get(value);
					if (value === null || names === undefined) {
						continue;
					}

					const actionProperty = findObjectProperty(option, 'action');
					const action = getStringLiteralValue(actionProperty?.value ?? null);
					if (
						!actionProperty ||
						action === null ||
						names.some((name) => startsWithName(action, name)) ||
						(value === 'getAll' && action.startsWith(BASE_RULE_GET_ALL_PREFIX))
					) {
						continue;
					}

					const actions = names.map(sentenceCase);
					context.report({
						node: actionProperty.value,
						messageId: 'wrongAction',
						data: {
							value,
							action,
							expected: alternatives.format(actions.map((name) => `"${name}"`)),
							example: actions[0],
						},
					});
				}
			},
		};
	},
});
