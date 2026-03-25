# stringify-object [![Build Status](https://secure.travis-ci.org/yeoman/stringify-object.svg?branch=master)](http://travis-ci.org/yeoman/stringify-object)

> Stringify an object/array like JSON.stringify just without all the double-quotes

Useful for when you want to get the string representation of an object in a formatted way.

It also handles circular references and lets you specify quote type.


## Install

```
$ npm install stringify-object
```


## Usage

```js
const stringifyObject = require('stringify-object');

const obj = {
	foo: 'bar',
	'arr': [1, 2, 3],
	nested: { hello: "world" }
};

const pretty = stringifyObject(obj, {
	indent: '  ',
	singleQuotes: false
});

console.log(pretty);
/*
{
	foo: "bar",
	arr: [
		1,
		2,
		3
	],
	nested: {
		hello: "world"
	}
}
*/
```


## API

### stringifyObject(input, [options])

Circular references will be replaced with `"[Circular]"`.

#### input

Type: `Object` `Array`

#### options

##### indent

Type: `string`<br>
Default: `\t`

Preferred indentation.

##### singleQuotes

Type: `boolean`<br>
Default: `true`

Set to false to get double-quoted strings.

##### filter(obj, prop)

Type: `Function`

Expected to return a `boolean` of whether to include the property `prop` of the object `obj` in the output.

##### transform(obj, prop, originalResult)

Type: `Function`<br>
Default: `undefined`

Expected to return a `string` that transforms the string that resulted from stringifying `obj[prop]`. This can be used to detect special types of objects that need to be stringified in a particular way. The `transform` function might return an alternate string in this case, otherwise returning the `originalResult`.

Here's an example that uses the `transform` option to mask fields named "password":

```js
const obj = {
	user: 'becky',
	password: 'secret'
}

const pretty = stringifyObject(obj, {
	transform: (obj, prop, originalResult) => {
		if (prop === 'password') {
			return originalResult.replace(/\w/g, '*');
		} else {
			return originalResult;
		}
	}
});

console.log(pretty);
/*
{
	user: 'becky',
	password: '******'
}
*/
```


##### inlineCharacterLimit

Type: `number`

When set, will inline values up to `inlineCharacterLimit` length for the sake of more terse output.

For example, given the example at the top of the README:

```js
const obj = {
	foo: 'bar',
	'arr': [1, 2, 3],
	nested: { hello: "world" }
};

const pretty = stringifyObject(obj, {
	indent: '  ',
	singleQuotes: false,
	inlineCharacterLimit: 12
});

console.log(pretty);
/*
{
	foo: "bar",
	arr: [1, 2, 3],
	nested: {
		hello: "world"
	}
}
*/
```

As you can see, `arr` was printed as a one-liner because its string was shorter than 12 characters.


## License

BSD-2-Clause © Yeoman team
