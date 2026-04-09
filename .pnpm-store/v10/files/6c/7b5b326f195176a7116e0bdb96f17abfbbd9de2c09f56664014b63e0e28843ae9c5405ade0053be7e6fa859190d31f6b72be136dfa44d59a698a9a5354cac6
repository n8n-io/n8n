Based on Arnout Kazemier's https://github.com/3rd-Eden/colorspace, only difference is updated packages to remove security vulnerbilities.
All credit goes to him.

# colorspace

Colorspace is a simple module which generates HEX color codes for namespaces.
The base color is decided by the first part of the namespace. All other parts of
the namespace alters the color tone. This way you can visually see which
namespaces belong together and which does not.

## Installation

The module is released in the public npm registry and can be installed by
running:

```
npm install --save @so-ric/colorspace
```

## Usage

We assume that you've already required the module using the following code:

```js
'use strict';

var colorspace = require('@so-ric/colorspace');
```

The returned function accepts 2 arguments:

1. `namespace` **string**, The namespace that needs to have a HEX color
   generated.
2. `delimiter`, **string**, **optional**, Delimiter to find the different
   sections of the namespace. Defaults to `:`

#### Example

```js
console.log(colorspace('color')) // #6b4b3a
console.log(colorspace('color:space')) // #796B67
```

## License

MIT
