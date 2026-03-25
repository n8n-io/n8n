# Classnames

> A simple JavaScript utility for conditionally joining classNames together.

<p>
  <a aria-label="NPM version" href="https://www.npmjs.com/package/classnames">
    <img alt="" src="https://img.shields.io/npm/v/classnames.svg?style=for-the-badge&labelColor=0869B8">
  </a>
  <a aria-label="License" href="#">
    <img alt="" src="https://img.shields.io/npm/l/classnames.svg?style=for-the-badge&labelColor=579805">
  </a>
  <a aria-label="Thinkmill Logo" href="https://www.thinkmill.com.au/open-source?utm_campaign=github-classnames">
    <img src="https://img.shields.io/badge/Sponsored%20BY%20Thinkmill-ed0000.svg?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTg2IiBoZWlnaHQ9IjU4NiIgdmlld0JveD0iMCAwIDU4NiA1ODYiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF8xOTk2XzQwNikiPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTU4NiAyOTNDNTg2IDQ1NC44MTkgNDU0LjgxOSA1ODYgMjkzIDU4NkMxMzEuMTgxIDU4NiAwIDQ1NC44MTkgMCAyOTNDMCAxMzEuMTgxIDEzMS4xODEgMCAyOTMgMEM0NTQuODE5IDAgNTg2IDEzMS4xODEgNTg2IDI5M1pNMjA1Ljc3NiAzNTguOTQ0QzE5MS4zNzYgMzU4Ljk0NCAxODUuOTA0IDM1Mi4zMiAxODUuOTA0IDMzNS45MDRWMjYyLjc1MkgyMTQuNDE2VjIzNy42OTZIMTg1LjkwNFYyMDEuMTJIMTUzLjA3MlYyMzcuNjk2SDEyOC41OTJWMjYyLjc1MkgxNTMuMDcyVjM0MC44QzE1My4wNzIgMzcyLjc2OCAxNjYuNjA4IDM4NS43MjggMTk3LjQyNCAzODUuNzI4QzIwMy40NzIgMzg1LjcyOCAyMTAuOTYgMzg0LjU3NiAyMTUuODU2IDM4My4xMzZWMzU3LjUwNEMyMTMuNTUyIDM1OC4zNjggMjA5LjUyIDM1OC45NDQgMjA1Ljc3NiAzNTguOTQ0Wk00MDcuMzc2IDIzNC4yNEMzODUuMiAyMzQuMjQgMzcxLjA4OCAyNDQuMDMyIDM2MC40MzIgMjYwLjczNkMzNTIuOTQ0IDI0My40NTYgMzM3LjM5MiAyMzQuMjQgMzE3LjIzMiAyMzQuMjRDMjk5Ljk1MiAyMzQuMjQgMjg2Ljk5MiAyNDEuMTUyIDI3Ni42MjQgMjU1LjI2NEgyNzYuMDQ4VjIzNy42OTZIMjQ0LjY1NlYzODRIMjc3LjQ4OFYzMDUuNjY0QzI3Ny40ODggMjc3LjQ0IDI4OC43MiAyNjAuNzM2IDMwOC4zMDQgMjYwLjczNkMzMjUuMjk2IDI2MC43MzYgMzM0LjUxMiAyNzIuODMyIDMzNC41MTIgMjkzLjU2OFYzODRIMzY3LjM0NFYzMDUuMDg4QzM2Ny4zNDQgMjc3LjE1MiAzNzguODY0IDI2MC43MzYgMzk4LjE2IDI2MC43MzZDNDE0LjU3NiAyNjAuNzM2IDQyNC42NTYgMjcxLjEwNCA0MjQuNjU2IDI5Ny4wMjRWMzg0SDQ1Ny40ODhWMjkzLjg1NkM0NTcuNDg4IDI1NC40IDQzOC40OCAyMzQuMjQgNDA3LjM3NiAyMzQuMjRaIiBmaWxsPSJ3aGl0ZSIvPgo8L2c+CjxkZWZzPgo8Y2xpcFBhdGggaWQ9ImNsaXAwXzE5OTZfNDA2Ij4KPHJlY3Qgd2lkdGg9IjU4NiIgaGVpZ2h0PSI1ODYiIGZpbGw9IndoaXRlIi8+CjwvY2xpcFBhdGg+CjwvZGVmcz4KPC9zdmc+Cg==&labelColor=C60200&locoColor=white&logoWidth=0">
  </a>

  </p>

Install from the [npm registry](https://www.npmjs.com/) with your package manager:
```bash
npm install classnames
```

Use with [Node.js](https://nodejs.org/en/), [Browserify](https://browserify.org/), or [webpack](https://webpack.github.io/):

```js
const classNames = require('classnames');
classNames('foo', 'bar'); // => 'foo bar'
```

Alternatively, you can simply include `index.js` on your page with a standalone `<script>` tag and it will export a global `classNames` method, or define the module if you are using RequireJS.

### Project philosophy

We take the stability and performance of this package seriously, because it is run millions of times a day in browsers all around the world. Updates are thoroughly reviewed for performance implications before being released, and we have a comprehensive test suite.

Classnames follows the [SemVer](https://semver.org/) standard for versioning.

There is also a [Changelog](https://github.com/JedWatson/classnames/blob/master/HISTORY.md).

## Usage

The `classNames` function takes any number of arguments which can be a string or object.
The argument `'foo'` is short for `{ foo: true }`. If the value associated with a given key is falsy, that key won't be included in the output.

```js
classNames('foo', 'bar'); // => 'foo bar'
classNames('foo', { bar: true }); // => 'foo bar'
classNames({ 'foo-bar': true }); // => 'foo-bar'
classNames({ 'foo-bar': false }); // => ''
classNames({ foo: true }, { bar: true }); // => 'foo bar'
classNames({ foo: true, bar: true }); // => 'foo bar'

// lots of arguments of various types
classNames('foo', { bar: true, duck: false }, 'baz', { quux: true }); // => 'foo bar baz quux'

// other falsy values are just ignored
classNames(null, false, 'bar', undefined, 0, 1, { baz: null }, ''); // => 'bar 1'
```

Arrays will be recursively flattened as per the rules above:

```js
const arr = ['b', { c: true, d: false }];
classNames('a', arr); // => 'a b c'
```

### Dynamic class names with ES2015

If you're in an environment that supports [computed keys](https://www.ecma-international.org/ecma-262/6.0/#sec-object-initializer) (available in ES2015 and Babel) you can use dynamic class names:

```js
let buttonType = 'primary';
classNames({ [`btn-${buttonType}`]: true });
```

### Usage with React.js

This package is the official replacement for `classSet`, which was originally shipped in the React.js Addons bundle.

One of its primary use cases is to make dynamic and conditional `className` props simpler to work with (especially more so than conditional string manipulation). So where you may have the following code to generate a `className` prop for a `<button>` in React:

```js
import React, { useState } from 'react';

export default function Button (props) {
	const [isPressed, setIsPressed] = useState(false);
	const [isHovered, setIsHovered] = useState(false);

	let btnClass = 'btn';
	if (isPressed) btnClass += ' btn-pressed';
	else if (isHovered) btnClass += ' btn-over';

	return (
		<button
			className={btnClass}
			onMouseDown={() => setIsPressed(true)}
			onMouseUp={() => setIsPressed(false)}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{props.label}
		</button>
	);
}
```

You can express the conditional classes more simply as an object:

```js
import React, { useState } from 'react';
import classNames from 'classnames';

export default function Button (props) {
	const [isPressed, setIsPressed] = useState(false);
	const [isHovered, setIsHovered] = useState(false);

	const btnClass = classNames({
		btn: true,
		'btn-pressed': isPressed,
		'btn-over': !isPressed && isHovered,
	});

	return (
		<button
			className={btnClass}
			onMouseDown={() => setIsPressed(true)}
			onMouseUp={() => setIsPressed(false)}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{props.label}
		</button>
	);
}
```

Because you can mix together object, array and string arguments, supporting optional `className` props is also simpler as only truthy arguments get included in the result:

```js
const btnClass = classNames('btn', this.props.className, {
	'btn-pressed': isPressed,
	'btn-over': !isPressed && isHovered,
});
```

### Alternate `dedupe` version

There is an alternate version of `classNames` available which correctly dedupes classes and ensures that falsy classes specified in later arguments are excluded from the result set.

This version is slower (about 5x) so it is offered as an opt-in.

To use the dedupe version with Node.js, Browserify, or webpack:

```js
const classNames = require('classnames/dedupe');

classNames('foo', 'foo', 'bar'); // => 'foo bar'
classNames('foo', { foo: false, bar: true }); // => 'bar'
```

For standalone (global / AMD) use, include `dedupe.js` in a `<script>` tag on your page.

### Alternate `bind` version (for [css-modules](https://github.com/css-modules/css-modules))

If you are using [css-modules](https://github.com/css-modules/css-modules), or a similar approach to abstract class 'names' and the real `className` values that are actually output to the DOM, you may want to use the `bind` variant.

_Note that in ES2015 environments, it may be better to use the "dynamic class names" approach documented above._

```js
const classNames = require('classnames/bind');

const styles = {
	foo: 'abc',
	bar: 'def',
	baz: 'xyz',
};

const cx = classNames.bind(styles);

const className = cx('foo', ['bar'], { baz: true }); // => 'abc def xyz'
```

Real-world example:

```js
/* components/submit-button.js */
import { useState } from 'react';
import classNames from 'classnames/bind';
import styles from './submit-button.css';

const cx = classNames.bind(styles);

export default function SubmitButton ({ store, form }) {
  const [submissionInProgress, setSubmissionInProgress] = useState(store.submissionInProgress);
  const [errorOccurred, setErrorOccurred] = useState(store.errorOccurred);
  const [valid, setValid] = useState(form.valid);

  const text = submissionInProgress ? 'Processing...' : 'Submit';
  const className = cx({
    base: true,
    inProgress: submissionInProgress,
    error: errorOccurred,
    disabled: valid,
  });

  return <button className={className}>{text}</button>;
}
```

## Polyfills needed to support older browsers

#### `classNames >=2.0.0`

`Array.isArray`: see [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray) for details about unsupported older browsers (e.g. <= IE8) and a simple polyfill.

## LICENSE [MIT](LICENSE)

Copyright (c) 2018 Jed Watson.
Copyright of the Typescript bindings are respective of each contributor listed in the definition file.
