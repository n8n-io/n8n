# isomorphic-timers-promises

[![Build Status][ci-img]][ci]
[![BrowserStack Status][browserstack-img]][browserstack]

[`timers/promises`](https://nodejs.org/api/timers.html#timers_timers_promises_api)
for client and server.

> The `timers/promises` API provides an alternative set of timer functions that
> return `Promise` objects.

## Install

```sh
npm install isomorphic-timers-promises --save
```

## Usage

```js
import {
	setTimeout,
	setImmediate,
	setInterval
} from 'isomorphic-timers-promises';

(async () => {
	const result = await setTimeout(100, 'becky');
	console.log(result); // 'becky'
})();

(async () => {
	const result = await setImmediate('maya');
	console.log(result); // 'maya'
})();

(async () => {
	let result = 0;
	for await (const startTime of setInterval(100, Date.now())) {
		const now = Date.now();
		result = result + 1;
		if (now - startTime >= 1000) {
			break;
		}
	}
	console.log(result); // 10
})();
```

### Usage with Webpack

<details>
	
<summary>Show me</summary>

```js
// webpack.config.js
module.exports = {
	// ...
	resolve: {
		alias: {
			'timers/promises': 'isomorphic-timers-promises'
		}
	}
};
```

</details>

### Usage with Rollup

<details>
	
<summary>Show me</summary>

```js
// rollup.config.js
const { default: resolve } = require('@rollup/plugin-node-resolve');
const alias = require('@rollup/plugin-alias');

module.exports = {
	// ...
	plugins: [
		resolve(),
		alias({
			entries: {
				'timers/promises': 'isomorphic-timers-promises'
			}
		})
	]
};
```

</details>

## API

### setTimeout([delay[, value[, options]]])

Returns: `Promise`

| Property         | Type          | Default | Description                                                                                                                                  |
| ---------------- | ------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `delay`          | `number`      | `1`     | The number of milliseconds to wait before fulfilling the promise.                                                                            |
| `value`          | `*`           |         | A value with which the promise is fulfilled.                                                                                                 |
| `options.ref`    | `boolean`     | `true`  | Set to `false` to indicate that the scheduled timeout should not require the event loop to remain active. Valid only for server environment. |
| `options.signal` | `AbortSignal` |         | An optional `AbortSignal` that can be used to cancel the scheduled timeout.                                                                  |

### setImmediate([value[, options]])

Returns: `Promise`

| Property         | Type          | Default | Description                                                                                                                                    |
| ---------------- | ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`          | `*`           |         | A value with which the promise is fulfilled.                                                                                                   |
| `options.ref`    | `boolean`     | `true`  | Set to `false` to indicate that the scheduled immediate should not require the event loop to remain active. Valid only for server environment. |
| `options.signal` | `AbortSignal` |         | An optional `AbortSignal` that can be used to cancel the scheduled immediate.                                                                  |

### setInterval([delay[, value[, options]]])

Returns: async iterator that generates values in an interval of `delay`.

| Property         | Type          | Default | Description                                                                                                                                                     |
| ---------------- | ------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `delay`          | `number`      | `1`     | The number of milliseconds to wait between iterations.                                                                                                          |
| `value`          | `*`           |         | A value with which the iterator returns.                                                                                                                        |
| `options.ref`    | `boolean`     | `true`  | Set to `false` to indicate that the scheduled timeout between iterations should not require the event loop to remain active. Valid only for server environment. |
| `options.signal` | `AbortSignal` |         | An optional `AbortSignal` that can be used to cancel the scheduled timeout between operations.                                                                  |

## Node and browser support

Supports Node 10+.

Tested in Chrome 72, Firefox 65, Internet Explorer 11 and should work in all
modern browsers.

Check
[support based on Browserslist configuration](https://browserslist.dev/?q=bGFzdCAzIG1ham9yIHZlcnNpb25zLCBzaW5jZSAyMDE5LCBub3QgaWUgPD0gMTAsIG5vZGUgMTA%3D)).

Assumes `Promise`, `AbortController` and `setImmediate` are polyfilled or
available in global context.

## Test

For automated tests, run `npm run test:automated` (append `:watch` for watcher
support).

Test suite is taken and modified from official Node.js repository
([`setTimeout`](https://github.com/nodejs/node/blob/master/test/parallel/test-timers-timeout-promisified.js),
[`setImmediate`](https://github.com/nodejs/node/blob/master/test/parallel/test-timers-immediate-promisified.js),
[`setInterval`](https://github.com/nodejs/node/blob/master/test/parallel/test-timers-interval-promisified.js)).

## License

MIT © [Ivan Nikolić](http://ivannikolic.com)

<!-- prettier-ignore-start -->

[ci]: https://travis-ci.com/niksy/isomorphic-timers-promises
[ci-img]: https://travis-ci.com/niksy/isomorphic-timers-promises.svg?branch=master
[browserstack]: https://www.browserstack.com/
[browserstack-img]: https://www.browserstack.com/automate/badge.svg?badge_key=Tm5vWkh0c2l3U0lKVEtOSkxVcGFvSUs3VVZ0dHZOcHROMWtoUmlIZ1lVaz0tLUgwQ1JoSEU1YStCTi9SSTZ4RWRBRkE9PQ==--81b6442621a16459ec7e2e40dab413dff6c62aaa

<!-- prettier-ignore-end -->
