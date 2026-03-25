# make-error

[![Package Version](https://badgen.net/npm/v/make-error)](https://npmjs.org/package/make-error) [![Build Status](https://travis-ci.org/JsCommunity/make-error.png?branch=master)](https://travis-ci.org/JsCommunity/make-error) [![PackagePhobia](https://badgen.net/packagephobia/install/make-error)](https://packagephobia.now.sh/result?p=make-error) [![Latest Commit](https://badgen.net/github/last-commit/JsCommunity/make-error)](https://github.com/JsCommunity/make-error/commits/master)

> Make your own error types!

## Features

- Compatible Node & browsers
- `instanceof` support
- `error.name` & `error.stack` support
- compatible with [CSP](https://en.wikipedia.org/wiki/Content_Security_Policy) (i.e. no `eval()`)

## Installation

### Node & [Browserify](http://browserify.org/)/[Webpack](https://webpack.js.org/)

Installation of the [npm package](https://npmjs.org/package/make-error):

```
> npm install --save make-error
```

Then require the package:

```javascript
var makeError = require("make-error");
```

### Browser

You can directly use the build provided at [unpkg.com](https://unpkg.com):

```html
<script src="https://unpkg.com/make-error@1/dist/make-error.js"></script>
```

## Usage

### Basic named error

```javascript
var CustomError = makeError("CustomError");

// Parameters are forwarded to the super class (here Error).
throw new CustomError("a message");
```

### Advanced error class

```javascript
function CustomError(customValue) {
  CustomError.super.call(this, "custom error message");

  this.customValue = customValue;
}
makeError(CustomError);

// Feel free to extend the prototype.
CustomError.prototype.myMethod = function CustomError$myMethod() {
  console.log("CustomError.myMethod (%s, %s)", this.code, this.message);
};

//-----

try {
  throw new CustomError(42);
} catch (error) {
  error.myMethod();
}
```

### Specialized error

```javascript
var SpecializedError = makeError("SpecializedError", CustomError);

throw new SpecializedError(42);
```

### Inheritance

> Best for ES2015+.

```javascript
import { BaseError } from "make-error";

class CustomError extends BaseError {
  constructor() {
    super("custom error message");
  }
}
```

## Related

- [make-error-cause](https://www.npmjs.com/package/make-error-cause): Make your own error types, with a cause!

## Contributions

Contributions are _very_ welcomed, either on the documentation or on
the code.

You may:

- report any [issue](https://github.com/JsCommunity/make-error/issues)
  you've encountered;
- fork and create a pull request.

## License

ISC © [Julien Fontanet](http://julien.isonoe.net)
