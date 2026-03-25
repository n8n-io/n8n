# is-retry-allowed

> Check whether a request can be retried based on the `error.code`

## Install

```
$ npm install --save is-retry-allowed
```

## Usage

```js
const isRetryAllowed = require('is-retry-allowed');

isRetryAllowed({code: 'ETIMEDOUT'});
//=> true

isRetryAllowed({code: 'ENOTFOUND'});
//=> false

isRetryAllowed({});
//=> true
```

## API

### isRetryAllowed(error)

#### error

Type: `Error | object`

The `.code` property, if it exists, will be used to determine whether retry is allowed.

---

<div align="center">
	<b>
		<a href="https://tidelift.com/subscription/pkg/npm-is-retry-allowed?utm_source=npm-is-retry-allowed&utm_medium=referral&utm_campaign=readme">Get professional support for this package with a Tidelift subscription</a>
	</b>
	<br>
	<sub>
		Tidelift helps make open source sustainable for maintainers while giving companies<br>assurances about security, maintenance, and licensing for their dependencies.
	</sub>
</div>
