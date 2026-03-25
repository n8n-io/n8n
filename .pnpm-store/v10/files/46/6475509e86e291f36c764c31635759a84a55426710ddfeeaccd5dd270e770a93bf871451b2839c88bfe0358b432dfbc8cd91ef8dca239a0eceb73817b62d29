'use strict';

function mergeDescriptors(destination, source, overwrite = true) {
	if (!destination) {
		throw new TypeError('The `destination` argument is required.');
	}

	if (!source) {
		throw new TypeError('The `source` argument is required.');
	}

	for (const name of Object.getOwnPropertyNames(source)) {
		if (!overwrite && Object.hasOwn(destination, name)) {
			// Skip descriptor
			continue;
		}

		// Copy descriptor
		const descriptor = Object.getOwnPropertyDescriptor(source, name);
		Object.defineProperty(destination, name, descriptor);
	}

	return destination;
}

module.exports = mergeDescriptors;
