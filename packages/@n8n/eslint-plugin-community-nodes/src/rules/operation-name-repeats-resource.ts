import {
	createRule,
	findObjectProperty,
	getOptionObjects,
	getShownResources,
	getStringLiteralValue,
	isOperationParameter,
	operationAction,
	repeatsResource,
	STANDARD_OPERATION_NAMES,
} from '../utils/index.js';

/** The action of the name, or the standard name when the value has one and the name uses another word. */
function suggestedName(name: string, value: string | null): string {
	const action = operationAction(name);
	const standardNames = value === null ? undefined : STANDARD_OPERATION_NAMES.get(value);
	if (
		standardNames === undefined ||
		standardNames.some((standard) => standard.toLowerCase() === action.toLowerCase())
	) {
		return action;
	}
	return standardNames[0] ?? action;
}

export const OperationNameRepeatsResourceRule = createRule({
	name: 'operation-name-repeats-resource',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow operation names that only repeat the resource selected above them, like "Get Contact" for the Contact resource',
		},
		messages: {
			repeatsResource:
				'The operation name "{{ name }}" repeats the resource "{{ resource }}", which the editor shows above it. Name only the action (for example "{{ verb }}"). Name an object only when it is not the resource (for example "Get Columns" for a table).',
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

				const resources = getShownResources(node);
				const [resource] = resources;
				if (resources.length !== 1 || resource === undefined) {
					return;
				}

				for (const option of getOptionObjects(node)) {
					const nameProperty = findObjectProperty(option, 'name');
					const name = getStringLiteralValue(nameProperty?.value ?? null);
					if (nameProperty && name !== null && repeatsResource(name, resource)) {
						const value = getStringLiteralValue(findObjectProperty(option, 'value')?.value ?? null);
						context.report({
							node: nameProperty.value,
							messageId: 'repeatsResource',
							data: {
								name,
								resource,
								verb: suggestedName(name, value),
							},
						});
					}
				}
			},
		};
	},
});
