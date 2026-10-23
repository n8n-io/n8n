import {
	createRule,
	findObjectProperty,
	getOptionObjects,
	getStringLiteralValue,
	isOperationParameter,
} from '../utils/index.js';

const BASE_RULE_GET_ALL_PREFIX = 'Get all ';

export const OperationGetManyActionRule = createRule({
	name: 'operation-get-many-action',
	meta: {
		type: 'problem',
		docs: {
			description: 'Require the action of the "getAll" operation to start with "Get many"',
		},
		messages: {
			wrongAction:
				'Start the action of the "getAll" operation with "Get many", not "{{ action }}". For example, use "Get many contacts".',
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
					if (value !== 'getAll') {
						continue;
					}

					const actionProperty = findObjectProperty(option, 'action');
					const action = getStringLiteralValue(actionProperty?.value ?? null);
					if (
						!actionProperty ||
						action === null ||
						/^Get many\b/.test(action) ||
						action.startsWith(BASE_RULE_GET_ALL_PREFIX)
					) {
						continue;
					}

					context.report({
						node: actionProperty.value,
						messageId: 'wrongAction',
						data: { action },
					});
				}
			},
		};
	},
});
