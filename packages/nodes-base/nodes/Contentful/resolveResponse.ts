// @ts-nocheck
// Code from https://github.com/contentful/contentful-resolve-response/blob/master/index.js
import { cloneDeep } from 'lodash';

const UNRESOLVED_LINK = {}; // unique object to avoid polyfill bloat using Symbol()

/**
 * isLink Function
 * Checks if the object has sys.type "Link"
 * @param object
 */
const isLink = (object: { sys: { type: string } }) =>
	object && object.sys && object.sys.type === 'Link';

/**
 * findNormalizableLinkInArray
 *
 * @param array
 * @param predicate
 * @return {*}
 */
const findNormalizableLinkInArray = (array, predicate) => {
	for (let i = 0, len = array.length; i < len; i++) {
		if (predicate(array[i])) {
			return array[i];
		}
	}
	return UNRESOLVED_LINK;
};

/**
 * getLink Function
 *
 * @param response
 * @param link
 * @return {undefined}
 */
const getLink = (allEntries, link) => {
	const { linkType: type, id } = link.sys;

	const predicate = ({ sys }) => sys.type === type && sys.id === id;

	return findNormalizableLinkInArray(allEntries, predicate);
};

/**
 * cleanUpLinks Function
 * - Removes unresolvable links from Arrays and Objects
 *
 * @param {Object[]|Object} input
 */
const cleanUpLinks = input => {
	if (Array.isArray(input)) {
		return input.filter(val => val !== UNRESOLVED_LINK);
	}
	for (const key in input) {
		if (input[key] === UNRESOLVED_LINK) {
			delete input[key];
		}
	}
	return input;
};

/**
 * walkMutate Function
 * @param input
 * @param predicate
 * @param mutator
 * @return {*}
 */
const walkMutate = (input, predicate, mutator, removeUnresolved) => {
	if (predicate(input)) {
		return mutator(input);
	}

	if (input && typeof input === 'object') {
		for (const key in input) {
			if (input.hasOwnProperty(key)) {
				input[key] = walkMutate(
					input[key],
					predicate,
					mutator,
					removeUnresolved
				);
			}
		}
		if (removeUnresolved) {
			input = cleanUpLinks(input);
		}
	}
	return input;
};

const normalizeLink = (allEntries, link, removeUnresolved) => {
	const resolvedLink = getLink(allEntries, link);
	if (resolvedLink === UNRESOLVED_LINK) {
		return removeUnresolved ? resolvedLink : link;
	}
	return resolvedLink;
};

const makeEntryObject = (item, itemEntryPoints) => {
	if (!Array.isArray(itemEntryPoints)) {
		return item;
	}

	const entryPoints = Object.keys(item).filter(
		ownKey => itemEntryPoints.indexOf(ownKey) !== -1
	);

	return entryPoints.reduce((entryObj, entryPoint) => {
		entryObj[entryPoint] = item[entryPoint];
		return entryObj;
	}, {});
};

/**
 * resolveResponse Function
 * Resolves contentful response to normalized form.
 * @param {Object} response Contentful response
 * @param {Object} options
 * @param {Boolean} options.removeUnresolved - Remove unresolved links default:false
 * @param {Array<String>} options.itemEntryPoints - Resolve links only in those item properties
 * @return {Object}
 */
const resolveResponse = (response, options) => {
	options = options || {};
	if (!response.items) {
		return [];
	}
	const responseClone = cloneDeep(response);
	const allIncludes = Object.keys(responseClone.includes || {}).reduce(
		(all, type) => [...all, ...response.includes[type]],
		[]
	);

	const allEntries = [...responseClone.items, ...allIncludes];

	allEntries.forEach(item => {
		const entryObject = makeEntryObject(item, options.itemEntryPoints);

		Object.assign(
			item,
			walkMutate(
				entryObject,
				isLink,
				link => normalizeLink(allEntries, link, options.removeUnresolved),
				options.removeUnresolved
			)
		);
	});

	return responseClone.items;
};

export default resolveResponse;
