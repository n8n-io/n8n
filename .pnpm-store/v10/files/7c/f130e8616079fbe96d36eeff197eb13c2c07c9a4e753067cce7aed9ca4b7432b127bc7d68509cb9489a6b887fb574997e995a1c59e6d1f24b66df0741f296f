# p-debounce [![Build Status](https://travis-ci.org/sindresorhus/p-debounce.svg?branch=master)](https://travis-ci.org/sindresorhus/p-debounce)

> [Debounce](https://css-tricks.com/debouncing-throttling-explained-examples/) promise-returning & async functions


## Install

```
$ npm install p-debounce
```


## Usage

```js
const pDebounce = require('p-debounce');

const expensiveCall = async input => input;

const debouncedFn = pDebounce(expensiveCall, 200);

for (const i of [1, 2, 3]) {
	debouncedFn(i).then(console.log);
}
//=> 3
//=> 3
//=> 3
```


## API

### pDebounce(fn, wait, [options])

Returns a function that delays calling `fn` until after `wait` milliseconds have elapsed since the last time it was called.

#### fn

Type: `Function`

Promise-returning/async function to debounce.

#### wait

Type: `number`

Milliseconds to wait before calling `fn`.

#### options

Type: `Object`

##### leading

Type: `boolean`<br>
Default: `false`

Call the `fn` on the [leading edge of the timeout](https://css-tricks.com/debouncing-throttling-explained-examples/#article-header-id-1). Meaning immediately, instead of waiting for `wait` milliseconds.


## Related

- [p-throttle](https://github.com/sindresorhus/p-throttle) - Throttle promise-returning & async functions
- [p-limit](https://github.com/sindresorhus/p-limit) - Run multiple promise-returning & async functions with limited concurrency
- [p-memoize](https://github.com/sindresorhus/p-memoize) - Memoize promise-returning & async functions
- [debounce-fn](https://github.com/sindresorhus/debounce-fn) - Debounce a function
- [More…](https://github.com/sindresorhus/promise-fun)


## License

MIT © [Sindre Sorhus](https://sindresorhus.com)
