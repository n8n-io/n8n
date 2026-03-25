'use strict';

/**
 * @typedef {import('rollup')} rollup
 * @typedef {import('rollup').WarningHandlerWithDefault} rollup.WarningHandlerWithDefault
 */

/**
 * @type {rollup.WarningHandlerWithDefault}
 */
function handleCircularDependancyWarning(warning, warningHandler) {
	const packagesWithCircularDependencies = [
		'util/',
		'assert/',
		'readable-stream/',
		'crypto-browserify/'
	];
	if (
		!(
			warning.code === 'CIRCULAR_DEPENDENCY' &&
			packagesWithCircularDependencies.some((modulePath) => {
				if (typeof warning.importer !== 'string') {
					return false;
				}
				return warning.importer.includes(modulePath);
			})
		)
	) {
		warningHandler(warning);
	}
}

module.exports.handleCircularDependancyWarning =
	handleCircularDependancyWarning;
