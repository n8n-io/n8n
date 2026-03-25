# dot-prop

> Get, set, or delete a property from a nested object using a dot path

## Install

```sh
npm install dot-prop
```

## Usage

```js
import {getProperty, setProperty, hasProperty, deleteProperty} from 'dot-prop';

// Getter
getProperty({foo: {bar: 'unicorn'}}, 'foo.bar');
//=> 'unicorn'

getProperty({foo: {bar: 'a'}}, 'foo.notDefined.deep');
//=> undefined

getProperty({foo: {bar: 'a'}}, 'foo.notDefined.deep', 'default value');
//=> 'default value'

getProperty({foo: {'dot.dot': 'unicorn'}}, 'foo.dot\\.dot');
//=> 'unicorn'

getProperty({foo: [{bar: 'unicorn'}]}, 'foo[0].bar');
//=> 'unicorn'

// Setter
const object = {foo: {bar: 'a'}};
setProperty(object, 'foo.bar', 'b');
console.log(object);
//=> {foo: {bar: 'b'}}

const foo = setProperty({}, 'foo.bar', 'c');
console.log(foo);
//=> {foo: {bar: 'c'}}

setProperty(object, 'foo.baz', 'x');
console.log(object);
//=> {foo: {bar: 'b', baz: 'x'}}

setProperty(object, 'foo.biz[0]', 'a');
console.log(object);
//=> {foo: {bar: 'b', baz: 'x', biz: ['a']}}

// Has
hasProperty({foo: {bar: 'unicorn'}}, 'foo.bar');
//=> true

// Deleter
const object = {foo: {bar: 'a'}};
deleteProperty(object, 'foo.bar');
console.log(object);
//=> {foo: {}}

object.foo.bar = {x: 'y', y: 'x'};
deleteProperty(object, 'foo.bar.x');
console.log(object);
//=> {foo: {bar: {y: 'x'}}}
```

## API

### getProperty(object, path, defaultValue?)

Get the value of the property at the given path.

Returns the value if any.

### setProperty(object, path, value)

Set the property at the given path to the given value.

Returns the object.

### hasProperty(object, path)

Check whether the property at the given path exists.

Returns a boolean.

### deleteProperty(object, path)

Delete the property at the given path.

Returns a boolean of whether the property existed before being deleted.

### escapePath(path)

Escape special characters in a path. Useful for sanitizing user input.

```js
import {getProperty, escapePath} from 'dot-prop';

const object = {
	foo: {
		bar: '👸🏻 You found me Mario!',
	},
	'foo.bar' : '🍄 The princess is in another castle!',
};
const escapedPath = escapePath('foo.bar');

console.log(getProperty(object, escapedPath));
//=> '🍄 The princess is in another castle!'
```

### deepKeys(object)

Returns an array of every path. Non-empty plain objects and arrays are deeply recursed and are not themselves included.

This can be useful to help flatten an object for an API that only accepts key-value pairs or for a tagged template literal.

```js
import {getProperty, deepKeys} from 'dot-prop';

const user = {
	name: {
		first: 'Richie',
		last: 'Bendall',
	},
	activeTasks: [],
	currentProject: null
};

for (const property of deepKeys(user)) {
	console.log(`${property}: ${getProperty(user, property)}`);
	//=> name.first: Richie
	//=> name.last: Bendall
	//=> activeTasks: []
	//=> currentProject: null
}
```

Sparse arrays are supported. In general, [avoid using sparse arrays](https://github.com/sindresorhus/dot-prop/issues/109#issuecomment-1614819869).

#### object

Type: `object | array`

Object or array to get, set, or delete the `path` value.

You are allowed to pass in `undefined` as the object to the `get` and `has` functions.

#### path

Type: `string`

Path of the property in the object, using `.` to separate each nested key.

Use `\\.` if you have a `.` in the key.

The following path components are invalid and results in `undefined` being returned: `__proto__`, `prototype`, `constructor`.

#### value

Type: `unknown`

Value to set at `path`.

#### defaultValue

Type: `unknown`

Default value.
