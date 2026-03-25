# p-lazy

> Create a lazy promise that defers execution until it's awaited or when `.then()` or `.catch()` is called

Useful if you're doing some heavy operations and would like to only do it when the promise is actually used.


## Install

```
$ npm install p-lazy
```


## Usage

```js
const PLazy = require('p-lazy');

const lazyPromise = new PLazy(resolve => {
	someHeavyOperation(resolve);
});

// `someHeavyOperation` is not yet called

(async () => {
	await doSomethingFun;
	// `someHeavyOperation` is called
	console.log(await lazyPromise);
})();
```


## API

### new PLazy(executor)

Same as the [`Promise` constructor](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise). `PLazy` is a subclass of `Promise`.

### PLazy.from(fn)

Create a `PLazy` promise from a promise-returning or async function.

### PLazy.resolve(value)

Create a `PLazy` promise that is resolved with the given `value`, or the promise passed as `value`.

### PLazy.reject(reason)

Create a `PLazy` promise that is rejected with the given `reason`.


## Related

- [p-cancelable](https://github.com/sindresorhus/p-cancelable) - Create a promise that can be canceled
- [p-defer](https://github.com/sindresorhus/p-defer) - Create a deferred promise
- [lazy-value](https://github.com/sindresorhus/lazy-value) - Create a lazily evaluated value
- [define-lazy-prop](https://github.com/sindresorhus/define-lazy-prop) - Define a lazily evaluated property on an object
- [More…](https://github.com/sindresorhus/promise-fun)


## License

MIT © [Sindre Sorhus](https://sindresorhus.com)
