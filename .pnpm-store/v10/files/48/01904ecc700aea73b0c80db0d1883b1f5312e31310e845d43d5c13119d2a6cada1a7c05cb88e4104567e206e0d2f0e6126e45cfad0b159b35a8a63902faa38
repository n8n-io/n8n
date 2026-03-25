# JSON Schema $Ref Parser

#### Parse, Resolve, and Dereference JSON Schema $ref pointers

[![Build Status](https://github.com/APIDevTools/json-schema-ref-parser/workflows/CI-CD/badge.svg?branch=master)](https://github.com/APIDevTools/json-schema-ref-parser/actions)
[![Coverage Status](https://coveralls.io/repos/github/APIDevTools/json-schema-ref-parser/badge.svg?branch=master)](https://coveralls.io/github/APIDevTools/json-schema-ref-parser)

[![npm](https://img.shields.io/npm/v/@apidevtools/json-schema-ref-parser.svg)](https://www.npmjs.com/package/@apidevtools/json-schema-ref-parser)
[![License](https://img.shields.io/npm/l/@apidevtools/json-schema-ref-parser.svg)](LICENSE)
[![Buy us a tree](https://img.shields.io/badge/Treeware-%F0%9F%8C%B3-lightgreen)](https://plant.treeware.earth/APIDevTools/json-schema-ref-parser)

## Installation

Install using [npm](https://docs.npmjs.com/about-npm/):

```bash
npm install @apidevtools/json-schema-ref-parser
yarn add @apidevtools/json-schema-ref-parser
bun add @apidevtools/json-schema-ref-parser
```

## The Problem:

You've got a JSON Schema with `$ref` pointers to other files and/or URLs. Maybe you know all the referenced files ahead
of time. Maybe you don't. Maybe some are local files, and others are remote URLs. Maybe they are a mix of JSON and YAML
format. Maybe some of the files contain cross-references to each other.

```json
{
  "definitions": {
    "person": {
      // references an external file
      "$ref": "schemas/people/Bruce-Wayne.json"
    },
    "place": {
      // references a sub-schema in an external file
      "$ref": "schemas/places.yaml#/definitions/Gotham-City"
    },
    "thing": {
      // references a URL
      "$ref": "http://wayne-enterprises.com/things/batmobile"
    },
    "color": {
      // references a value in an external file via an internal reference
      "$ref": "#/definitions/thing/properties/colors/black-as-the-night"
    }
  }
}
```

## The Solution:

JSON Schema $Ref Parser is a full [JSON Reference](https://tools.ietf.org/html/draft-pbryan-zyp-json-ref-03)
and [JSON Pointer](https://tools.ietf.org/html/rfc6901) implementation that crawls even the most
complex [JSON Schemas](http://json-schema.org/latest/json-schema-core.html) and gives you simple, straightforward
JavaScript objects.

- Use **JSON** or **YAML** schemas &mdash; or even a mix of both!
- Supports `$ref` pointers to external files and URLs, as well
  as [custom sources](https://apidevtools.com/json-schema-ref-parser/docs/plugins/resolvers.html) such as databases
- Can [bundle](https://apidevtools.com/json-schema-ref-parser/docs/ref-parser.html#bundlepath-options-callback) multiple
  files into a single schema that only has _internal_ `$ref` pointers
- Can [dereference](https://apidevtools.com/json-schema-ref-parser/docs/ref-parser.html#dereferencepath-options-callback)
  your schema, producing a plain-old JavaScript object that's easy to work with
- Supports [circular references](https://apidevtools.com/json-schema-ref-parser/docs/#circular-refs), nested references,
  back-references, and cross-references between files
- Maintains object reference equality &mdash; `$ref` pointers to the same value always resolve to the same object
  instance
- Compatible with Node LTS and beyond, and all major web browsers on Windows, Mac, and Linux

## Example

```javascript
import $RefParser from "@apidevtools/json-schema-ref-parser";

try {
  await $RefParser.dereference(mySchema);
  // note - by default, mySchema is modified in place, and the returned value is a reference to the same object
  console.log(mySchema.definitions.person.properties.firstName);

  // if you want to avoid modifying the original schema, you can disable the `mutateInputSchema` option
  let clonedSchema = await $RefParser.dereference(mySchema, { mutateInputSchema: false });
  console.log(clonedSchema.definitions.person.properties.firstName);
} catch (err) {
  console.error(err);
}
```

For more detailed examples, please see the [API Documentation](https://apidevtools.com/json-schema-ref-parser/docs/)

## Polyfills

If you are using Node.js < 18, you'll need a polyfill for `fetch`,
like [node-fetch](https://github.com/node-fetch/node-fetch):

```javascript
import fetch from "node-fetch";

globalThis.fetch = fetch;
```

## Browser support

JSON Schema $Ref Parser supports recent versions of every major web browser. Older browsers may
require [Babel](https://babeljs.io/) and/or [polyfills](https://babeljs.io/docs/en/next/babel-polyfill).

To use JSON Schema $Ref Parser in a browser, you'll need to use a bundling tool such
as [Webpack](https://webpack.js.org/), [Rollup](https://rollupjs.org/), [Parcel](https://parceljs.org/),
or [Browserify](http://browserify.org/). Some bundlers may require a bit of configuration, such as
setting `browser: true` in [rollup-plugin-resolve](https://github.com/rollup/rollup-plugin-node-resolve).

#### Webpack 5

Webpack 5 has dropped the default export of node core modules in favour of polyfills, you'll need to set them up
yourself ( after npm-installing them )
Edit your `webpack.config.js` :

```js
config.resolve.fallback = {
  path: require.resolve("path-browserify"),
  fs: require.resolve("browserify-fs"),
};

config.plugins.push(
  new webpack.ProvidePlugin({
    Buffer: ["buffer", "Buffer"],
  }),
);
```

## API Documentation

Full API documentation is available [right here](https://apidevtools.com/json-schema-ref-parser/docs/)

## Contributing

I welcome any contributions, enhancements, and
bug-fixes. [Open an issue](https://github.com/APIDevTools/json-schema-ref-parser/issues) on GitHub
and [submit a pull request](https://github.com/APIDevTools/json-schema-ref-parser/pulls).

#### Building/Testing

To build/test the project locally on your computer:

1. **Clone this repo**<br>
   `git clone https://github.com/APIDevTools/json-schema-ref-parser.git`

2. **Install dependencies**<br>
   `yarn install`

3. **Run the tests**<br>
   `yarn test`

## License

JSON Schema $Ref Parser is 100% free and open-source, under the [MIT license](LICENSE). Use it however you want.

## Thanks

Thanks to these awesome contributors for their major support of this open-source project.

- [JonLuca De Caro](https://jonlu.ca)
- [Phil Sturgeon](https://philsturgeon.com)
- [Stoplight](https://stoplight.io/?utm_source=github&utm_medium=readme&utm_campaign=json_schema_ref_parser)
