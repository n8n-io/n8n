declare namespace pMap {
	interface Options {
		/**
		Number of concurrently pending promises returned by `mapper`.

		@default Infinity
		*/
		readonly concurrency?: number;

		/**
		When set to `false`, instead of stopping when a promise rejects, it will wait for all the promises to settle and then reject with an [aggregated error](https://github.com/sindresorhus/aggregate-error) containing all the errors from the rejected promises.

		@default true
		*/
		readonly stopOnError?: boolean;
	}

	/**
	Function which is called for every item in `input`. Expected to return a `Promise` or value.

	@param element - Iterated element.
	@param index - Index of the element in the source array.
	*/
	type Mapper<Element = any, NewElement = any> = (
		element: Element,
		index: number
	) => NewElement | Promise<NewElement>;
}

/**
@param input - Iterated over concurrently in the `mapper` function.
@param mapper - Function which is called for every item in `input`. Expected to return a `Promise` or value.
@returns A `Promise` that is fulfilled when all promises in `input` and ones returned from `mapper` are fulfilled, or rejects if any of the promises reject. The fulfilled value is an `Array` of the fulfilled values returned from `mapper` in `input` order.

@example
```
import pMap = require('p-map');
import got = require('got');

const sites = [
	getWebsiteFromUsername('https://sindresorhus'), //=> Promise
	'https://ava.li',
	'https://github.com'
];

(async () => {
	const mapper = async site => {
		const {requestUrl} = await got.head(site);
		return requestUrl;
	};

	const result = await pMap(sites, mapper, {concurrency: 2});

	console.log(result);
	//=> ['https://sindresorhus.com/', 'https://ava.li/', 'https://github.com/']
})();
```
*/
declare function pMap<Element, NewElement>(
	input: Iterable<Element>,
	mapper: pMap.Mapper<Element, NewElement>,
	options?: pMap.Options
): Promise<NewElement[]>;

export = pMap;
