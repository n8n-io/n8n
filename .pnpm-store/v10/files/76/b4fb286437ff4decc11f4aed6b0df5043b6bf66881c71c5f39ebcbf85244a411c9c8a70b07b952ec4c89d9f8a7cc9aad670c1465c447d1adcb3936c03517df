import {isMemberExpression} from '../ast/index.js';

/**
@param {
	{
		object?: string,
		method?: string,
		methods?: string[],
	}
} [options]
@returns {string}
*/
function isPrototypeProperty(node, options) {
	const {
		object,
		property,
		properties,
	} = {
		property: '',
		properties: [],
		...options,
	};

	if (!isMemberExpression(node, {
		property,
		properties,
		optional: false,
	})) {
		return;
	}

	const objectNode = node.object;

	return (
		// `Object.prototype.method` or `Array.prototype.method`
		isMemberExpression(objectNode, {
			object,
			property: 'prototype',
			optional: false,
		})
		// `[].method`
		|| (
			object === 'Array'
			&& objectNode.type === 'ArrayExpression'
			&& objectNode.elements.length === 0
		)
		// `{}.method`
		|| (
			object === 'Object'
			&& objectNode.type === 'ObjectExpression'
			&& objectNode.properties.length === 0
		)
	);
}

export const isArrayPrototypeProperty = (node, options) => isPrototypeProperty(node, {...options, object: 'Array'});
export const isObjectPrototypeProperty = (node, options) => isPrototypeProperty(node, {...options, object: 'Object'});
