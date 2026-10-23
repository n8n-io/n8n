import {
	createRule,
	findObjectProperty,
	getOptionObjects,
	getShownResources,
	getStringLiteralValue,
	isOperationParameter,
	repeatsResource,
} from '../utils/index.js';

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

				// An operation list shared by several resources can't name just one of them.
				const resources = getShownResources(node);
				const [resource] = resources;
				if (resources.length !== 1 || resource === undefined) {
					return;
				}

				for (const option of getOptionObjects(node)) {
					const nameProperty = findObjectProperty(option, 'name');
					const name = getStringLiteralValue(nameProperty?.value ?? null);
					if (nameProperty && name !== null && repeatsResource(name, resource)) {
						context.report({
							node: nameProperty.value,
							messageId: 'repeatsResource',
							data: { name, resource, verb: name.split(/\s+/)[0] ?? name },
						});
					}
				}
			},
		};
	},
});
