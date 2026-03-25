import {ReferenceTracker} from '@eslint-community/eslint-utils';

const createTraceMap = (object, type) => {
	let map = {[type]: true};

	const path = object.split('.').reverse();
	for (const name of path) {
		map = {[name]: map};
	}

	return map;
};

export class GlobalReferenceTracker {
	#traceMap = {};
	#filter;
	#handle;

	constructor({
		object,
		objects = [object],
		filter,
		handle,
		type = ReferenceTracker.READ,
	}) {
		for (const object of objects) {
			Object.assign(this.#traceMap, createTraceMap(object, type));
		}

		this.#filter = filter;
		this.#handle = handle;
	}

	* track(globalScope) {
		const tracker = new ReferenceTracker(globalScope);

		for (const reference of tracker.iterateGlobalReferences(this.#traceMap)) {
			if (this.#filter && !this.#filter(reference)) {
				continue;
			}

			const problems = this.#handle(reference);

			if (!problems) {
				continue;
			}

			if (problems[Symbol.iterator]) {
				yield * problems;
			} else {
				yield problems;
			}
		}
	}

	createListeners(context) {
		return {
			'Program:exit': program => this.track(context.sourceCode.getScope(program)),
		};
	}
}

Object.assign(GlobalReferenceTracker, {
	READ: ReferenceTracker.READ,
	CALL: ReferenceTracker.CALL,
	CONSTRUCT: ReferenceTracker.CONSTRUCT,
});
