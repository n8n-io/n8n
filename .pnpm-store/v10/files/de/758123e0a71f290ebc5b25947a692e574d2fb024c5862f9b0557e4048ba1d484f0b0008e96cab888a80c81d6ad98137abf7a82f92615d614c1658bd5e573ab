# p-map [![Build Status](https://travis-ci.org/sindresorhus/p-map.svg?branch=master)](https://travis-ci.org/sindresorhus/p-map)

> Map over promises concurrently

Useful when you need to run promise-returning & async functions multiple times with different inputs concurrently.


## Install

```
$ npm install p-map
```


## Usage

```js
const pMap = require('p-map');
const got = require('got');

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

## API

### pMap(input, mapper, options?)

Returns a `Promise` that is fulfilled when all promises in `input` and ones returned from `mapper` are fulfilled, or rejects if any of the promises reject. The fulfilled value is an `Array` of the fulfilled values returned from `mapper` in `input` order.

#### input

Type: `Iterable<Promise | unknown>`

Iterated over concurrently in the `mapper` function.

#### mapper(element, index)

Type: `Function`

Expected to return a `Promise` or value.

#### options

Type: `object`

##### concurrency

Type: `number`<br>
Default: `Infinity`<br>
Minimum: `1`

Number of concurrently pending promises returned by `mapper`.

##### stopOnError

Type: `boolean`<br>
Default: `true`

When set to `false`, instead of stopping when a promise rejects, it will wait for all the promises to settle and then reject with an [aggregated error](https://github.com/sindresorhus/aggregate-error) containing all the errors from the rejected promises.


## Related

- [p-all](https://github.com/sindresorhus/p-all) - Run promise-returning & async functions concurrently with optional limited concurrency
- [p-filter](https://github.com/sindresorhus/p-filter) - Filter promises concurrently
- [p-times](https://github.com/sindresorhus/p-times) - Run promise-returning & async functions a specific number of times concurrently
- [p-props](https://github.com/sindresorhus/p-props) - Like `Promise.all()` but for `Map` and `Object`
- [p-map-series](https://github.com/sindresorhus/p-map-series) - Map over promises serially
- [p-queue](https://github.com/sindresorhus/p-queue) - Promise queue with concurrency control
- [More…](https://github.com/sindresorhus/promise-fun)


---

<div align="center">
	<b>
		<a href="https://tidelift.com/subscription/pkg/npm-p-map?utm_source=npm-p-map&utm_medium=referral&utm_campaign=readme">Get professional support for this package with a Tidelift subscription</a>
	</b>
	<br>
	<sub>
		Tidelift helps make open source sustainable for maintainers while giving companies<br>assurances about security, maintenance, and licensing for their dependencies.
	</sub>
</div>
