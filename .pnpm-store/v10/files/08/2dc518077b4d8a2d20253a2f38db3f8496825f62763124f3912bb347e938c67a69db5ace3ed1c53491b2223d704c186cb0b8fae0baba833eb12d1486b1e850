import {type Get} from 'type-fest';

/**
Get the value of the property at the given path.

@param object - Object or array to get the `path` value.
@param path - Path of the property in the object, using `.` to separate each nested key. Use `\\.` if you have a `.` in the key.
@param defaultValue - Default value.

@example
```
import {getProperty} from 'dot-prop';

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
```
*/
export function getProperty<ObjectType, PathType extends string, DefaultValue = undefined>(
	object: ObjectType,
	path: PathType,
	defaultValue?: DefaultValue
): ObjectType extends Record<string, unknown> | unknown[] ? (unknown extends Get<ObjectType, PathType> ? DefaultValue : Get<ObjectType, PathType>) : undefined;

/**
Set the property at the given path to the given value.

@param object - Object or array to set the `path` value.
@param path - Path of the property in the object, using `.` to separate each nested key. Use `\\.` if you have a `.` in the key.
@param value - Value to set at `path`.
@returns The object.

@example
```
import {setProperty} from 'dot-prop';

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
```
*/
export function setProperty<ObjectType extends Record<string, any>>(
	object: ObjectType,
	path: string,
	value: unknown
): ObjectType;

/**
Check whether the property at the given path exists.

@param object - Object or array to test the `path` value.
@param path - Path of the property in the object, using `.` to separate each nested key. Use `\\.` if you have a `.` in the key.

@example
```
import {hasProperty} from 'dot-prop';

hasProperty({foo: {bar: 'unicorn'}}, 'foo.bar');
//=> true
```
*/
export function hasProperty(object: Record<string, any> | undefined, path: string): boolean;

/**
Delete the property at the given path.

@param object - Object or array to delete the `path` value.
@param path - Path of the property in the object, using `.` to separate each nested key. Use `\\.` if you have a `.` in the key.
@returns A boolean of whether the property existed before being deleted.

@example
```
import {deleteProperty} from 'dot-prop';

const object = {foo: {bar: 'a'}};
deleteProperty(object, 'foo.bar');
console.log(object);
//=> {foo: {}}

object.foo.bar = {x: 'y', y: 'x'};
deleteProperty(object, 'foo.bar.x');
console.log(object);
//=> {foo: {bar: {y: 'x'}}}
```
*/
export function deleteProperty(object: Record<string, any>, path: string): boolean;

/**
Escape special characters in a path. Useful for sanitizing user input.

@param path - The dot path to sanitize.

@example
```
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
*/
export function escapePath(path: string): string;

/**
Returns an array of every path. Non-empty plain objects and arrays are deeply recursed and are not themselves included.

This can be useful to help flatten an object for an API that only accepts key-value pairs or for a tagged template literal.

@param object - The object to iterate through.

@example
```
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
*/
export function deepKeys(object: unknown): string[];
