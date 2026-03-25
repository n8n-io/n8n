declare const isGeneratorFn: {
	/**
	Check if something is a generator function.

	@example
	```
	import isGeneratorFn = require('is-generator-fn');

	isGeneratorFn(function * () {});
	//=> true

	isGeneratorFn(function () {});
	//=> false
	```
	*/
	(value: unknown): value is GeneratorFunction;

	// TODO: Remove this for the next major release, refactor the whole definition to:
	// declare function isGeneratorFn(value: unknown): value is GeneratorFunction;
	// export = isGeneratorFn;
	default: typeof isGeneratorFn;
};

export = isGeneratorFn;
