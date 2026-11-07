import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';
import type { NodePropertyTypes } from 'n8n-workflow';

import {
	isNodeTypeClass,
	findNodeDescriptionObject,
	findArrayLiteralProperty,
	findObjectProperty,
	getBooleanLiteralValue,
	getStringLiteralValue,
	isFileType,
	createRule,
} from '../utils/index.js';

/**
 * The containers that hold non-required fields. Exempt, because they are the
 * place this rule moves fields into. The rule does not check the container
 * name: `additionalFields`, `options`, `updateFields` and `filters` are all
 * usual names.
 *
 * `satisfies NodePropertyTypes[]` keeps these lists tied to the property types
 * `n8n-workflow` declares, so a renamed or removed type fails the typecheck
 * instead of silently turning an exemption off.
 */
const CONTAINER_TYPES = new Set<string>([
	'collection',
	'fixedCollection',
] satisfies NodePropertyTypes[]);

/** Types that show information or hold no user input, so they are not fields. */
const NON_INPUT_TYPES = new Set<string>([
	'notice',
	'callout',
	'hidden',
	'curlImport',
] satisfies NodePropertyTypes[]);

/**
 * Selectors that decide which other fields n8n shows. They belong at the top
 * level even when they are not required, so the user picks what to do first.
 */
const SELECTOR_FIELD_NAMES = new Set(['resource', 'operation', 'authentication']);

export const NonRequiredFieldsInCollectionRule = createRule({
	name: 'non-required-fields-in-collection',
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Enforce that non-required node fields live in an "Additional Options" or "Additional Fields" collection',
		},
		messages: {
			nonRequiredFieldAtTopLevel:
				'"{{ field }}" is not required. Move it into an "Additional Options" or "Additional Fields" collection.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		const isRequired = (property: TSESTree.ObjectExpression): boolean => {
			const requiredProperty = findObjectProperty(property, 'required');
			if (!requiredProperty) {
				return false;
			}

			// A non-literal value (e.g. a variable) is unknowable at lint time, so
			// treat the field as required rather than report a guess.
			return getBooleanLiteralValue(requiredProperty.value) !== false;
		};

		const checkProperties = (propertiesArray: TSESTree.ArrayExpression): void => {
			for (const element of propertiesArray.elements) {
				if (element?.type !== AST_NODE_TYPES.ObjectExpression) {
					continue;
				}

				const nameProperty = findObjectProperty(element, 'name');
				const name = nameProperty ? getStringLiteralValue(nameProperty.value) : null;
				if (!name || SELECTOR_FIELD_NAMES.has(name)) {
					continue;
				}

				const typeProperty = findObjectProperty(element, 'type');
				const type = typeProperty ? getStringLiteralValue(typeProperty.value) : null;
				if (type && (CONTAINER_TYPES.has(type) || NON_INPUT_TYPES.has(type))) {
					continue;
				}

				if (isRequired(element)) {
					continue;
				}

				context.report({
					node: element,
					messageId: 'nonRequiredFieldAtTopLevel',
					data: { field: name },
				});
			}
		};

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) {
					return;
				}

				const description = findNodeDescriptionObject(node);
				if (!description) {
					return;
				}

				const propertiesArray = findArrayLiteralProperty(description, 'properties');
				if (!propertiesArray) {
					return;
				}

				checkProperties(propertiesArray);
			},
		};
	},
});
