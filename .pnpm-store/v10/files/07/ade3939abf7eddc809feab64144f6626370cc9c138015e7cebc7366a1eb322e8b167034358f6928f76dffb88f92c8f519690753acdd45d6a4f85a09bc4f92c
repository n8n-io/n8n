# babel-plugin-transform-import-meta

Transforms `import.meta` for nodejs environments. This plugin supports transforming the following apis:

- `import.meta.dirname`
- `import.meta.filename`
- `import.meta.resolve(specifier)`
- `import.meta.url`

## `import.meta.dirname`

```js
console.log(import.meta.dirname);
```

Is replaced with

```js
console.log(__dirname);
```

## `import.meta.filename`

```js
console.log(import.meta.filename);
```

Is replaced with

```js
console.log(__filename);
```

## `import.meta.resolve(specifier)`

```js
console.log(import.meta.resolve(myCustomFunction('path', 'file')));
```

Is replaced with

```js
console.log(require('url').pathToFileURL(require.resolve(myCustomFunction('path', 'file'))).toString());
```

## `import.meta.url`

```js
console.log(import.meta.url);
```

Is replaced with

```js
console.log(require('url').pathToFileURL(__filename).toString());
```

## Installation

Install this package

```sh
npm install --save-dev babel-plugin-transform-import-meta
```

and add it to your babel plugins in `babel.config.json`

```json
{
  "plugins": [
    "babel-plugin-transform-import-meta"
  ]
}
```

## Settings

### ES6 modules

It's possible to use ES6 modules for the output. Useful to delegate module transformation to other plugins.

```json
{
  "plugins": [
    ["babel-plugin-transform-import-meta", { "module": "ES6" }]
  ]
}
```

## Credits

Based on a previous project "babel-plugin-import-meta" by The Polymer Authors
