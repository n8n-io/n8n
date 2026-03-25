# define-lazy-prop

> Define a [lazily evaluated](https://en.wikipedia.org/wiki/Lazy_evaluation) property on an object

Useful when the value of a property is expensive to generate, so you want to delay the computation until the property is needed. For example, improving startup performance by deferring nonessential operations.

## Install

```
$ npm install define-lazy-prop
```

## Usage

```js
import defineLazyProperty from 'define-lazy-prop';

const unicorn = {
	// …
};

defineLazyProperty(unicorn, 'rainbow', () => expensiveComputation());

app.on('user-action', () => {
	doSomething(unicorn.rainbow);
});
```

## API

### defineLazyProperty(object, propertyName, valueGetter)

#### object

Type: `object`

Object to add the property to.

#### propertyName

Type: `string`

Name of the property to add.

#### valueGetter

Type: `Function`

Called the first time `propertyName` is accessed. Expected to return a value.

## Related

- [lazy-value](https://github.com/sindresorhus/lazy-value) - Create a lazily evaluated value
- [import-lazy](https://github.com/sindresorhus/import-lazy) - Import a module lazily
- [p-lazy](https://github.com/sindresorhus/p-lazy) - Create a lazy promise
