const {toString} = Object.prototype;

const NODE_TYPE_ELEMENT = 1;

const DOM_PROPERTIES_TO_CHECK = [
	'innerHTML',
	'ownerDocument',
	'style',
	'attributes',
	'nodeValue',
];

function isObject(value) {
	return value !== null && typeof value === 'object';
}

function isHtmlElement(value) {
	return isObject(value)
		&& value.nodeType === NODE_TYPE_ELEMENT
		&& typeof value.nodeName === 'string'
		&& DOM_PROPERTIES_TO_CHECK.every(property => property in value);
}

module.exports = function (value) {
	if (value === undefined) {
		return 'undefined';
	}

	if (value === null) {
		return 'null';
	}

	if (Number.isNaN(value)) {
		return 'nan';
	}

	if (Array.isArray(value)) {
		return 'array';
	}

	switch (toString.call(value)) {
		case '[object Date]': {
			return 'date';
		}

		case '[object RegExp]': {
			return 'regexp';
		}

		case '[object Arguments]': {
			return 'arguments';
		}

		case '[object Error]': {
			return 'error';
		}

		// No default
	}

	if (value && isHtmlElement(value)) {
		return 'element';
	}

	if (value && value instanceof Uint8Array && value.constructor.name === 'Buffer') {
		return 'buffer';
	}

	if (typeof value.valueOf === 'function') {
		value = value.valueOf?.() ?? Object.prototype.valueOf.apply(value);
	}

	return typeof value;
};
