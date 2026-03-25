<!-- Coppied from root directory -->

<a href="https://pugjs.org"><img src="https://cdn.rawgit.com/pugjs/pug-logo/eec436cee8fd9d1726d7839cbe99d1f694692c0c/SVG/pug-final-logo-_-colour-128.svg" height="200" align="right"></a>
# Pug

Full documentation is at [pugjs.org](https://pugjs.org/)

 Pug is a high performance template engine heavily influenced by [Haml](http://haml.info/)
 and implemented with JavaScript for [Node.js](http://nodejs.org) and browsers. For bug reports,
 feature requests and questions, [open an issue](https://github.com/pugjs/pug/issues/new).
 For discussion join the [chat room](https://gitter.im/pugjs/pug).

 You can test drive Pug online [here](https://pugjs.org/).

 [![Build Status](https://img.shields.io/travis/pugjs/pug/master.svg?style=flat)](https://travis-ci.org/pugjs/pug)
 [![Coverage Status](https://img.shields.io/coveralls/pugjs/pug/master.svg?style=flat)](https://coveralls.io/r/pugjs/pug?branch=master)
 [![Dependency Status](https://david-dm.org/pugjs/pug/status.svg?path=packages/pug)](https://david-dm.org/pugjs/pug?path=packages/pug)
 [![DevDependencies Status](https://david-dm.org/pugjs/pug/dev-status.svg?path=packages/pug)](https://david-dm.org/pugjs/pug?path=packages/pug&type=dev)
 [![NPM version](https://img.shields.io/npm/v/pug.svg?style=flat)](https://www.npmjs.com/package/pug)
 [![Join Gitter Chat](https://img.shields.io/badge/gitter-join%20chat%20%E2%86%92-brightgreen.svg?style=flat)](https://gitter.im/pugjs/pug?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

## Rename from "Jade"

This project was formerly known as "Jade." However, it has been revealed to us that "Jade" is a registered trademark, and as a result a rename is needed. After some discussion among the maintainers, **"Pug"** has been chosen as the new name for this project. The next major version will carry "pug" as the package name.

If your package or app currently uses `jade`, don't worry: we have secured permissions to continue to occupy that package name, although all new versions will be released under `pug`.

Before the renaming, we had already begun working on an incompatible Jade 2.0.0. We have then made it so that this new major version bump will coincide with the rename to Pug. Therefore, upgrading from Jade to Pug will be the same process as upgrading any other package with a major version bump. Currently, Pug 2.0.0 is still under beta stage, and there are several syntactic differences we have deprecated and removed. Such differences are documented at [#2305](https://github.com/pugjs/pug/issues/2305).

The website and documentation for Pug are still being updated, but if you are new to Pug, you should get started with the new syntax and install the Pug package on npm.

## Installation

### Package

via npm:

```bash
$ npm install pug
```

### Command Line

After installing the latest version of [Node.js](http://nodejs.org/), install with:

```bash
$ npm install pug-cli -g
```

and run with

```bash
$ pug --help
```

## Syntax

Pug is a clean, whitespace sensitive syntax for writing html.  Here is a simple example:

```pug
doctype html
html(lang="en")
  head
    title= pageTitle
    script(type='text/javascript').
      if (foo) bar(1 + 5)
  body
    h1 Pug - node template engine
    #container.col
      if youAreUsingPug
        p You are amazing
      else
        p Get on it!
      p.
        Pug is a terse and simple templating language with a
        strong focus on performance and powerful features.
```

becomes


```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <title>Pug</title>
    <script type="text/javascript">
      if (foo) bar(1 + 5)
    </script>
  </head>
  <body>
    <h1>Pug - node template engine</h1>
    <div id="container" class="col">
      <p>You are amazing</p>
      <p>Pug is a terse and simple templating language with a strong focus on performance and powerful features.</p>
    </div>
  </body>
</html>
```

## API

For full API, see [pugjs.org/api/reference.html](https://pugjs.org/api/reference.html)

```js
var pug = require('pug');

// compile
var fn = pug.compile('string of pug', options);
var html = fn(locals);

// render
var html = pug.render('string of pug', merge(options, locals));

// renderFile
var html = pug.renderFile('filename.pug', merge(options, locals));
```

### Options

 - `filename`  Used in exceptions, and required when using includes
 - `compileDebug`  When `false` no debug instrumentation is compiled
 - `pretty`    Add pretty-indentation whitespace to output _(false by default)_

## Browser Support

 The latest version of pug can be download for the browser in standalone form from [here](https://pugjs.org/js/pug.js).  It only supports the very latest browsers though, and is a large file.  It is recommended that you pre-compile your pug templates to JavaScript.

 To compile a template for use on the client using the command line, do:

```bash
$ pug --client --no-debug filename.pug
```

which will produce `filename.js` containing the compiled template.

## Additional Resources

Tutorials:

  - cssdeck interactive [Pug syntax tutorial](http://cssdeck.com/labs/learning-the-jade-templating-engine-syntax)
  - cssdeck interactive [Pug logic tutorial](http://cssdeck.com/labs/jade-templating-tutorial-codecast-part-2)
  - [Pug について。](https://gist.github.com/japboy/5402844) (A Japanese Tutorial)

Implementations in other languages:

  - [Larpug - Pug for Laravel](https://github.com/acidjazz/larpug)
  - [php](https://github.com/pug-php/pug)
  - [scala](https://scalate.github.io/scalate/documentation/scaml-reference.html)
  - [ruby](https://github.com/slim-template/slim)
  - [python](https://github.com/SyrusAkbary/pyjade)
  - [java](https://github.com/neuland/jade4j)

Other:

  - [Emacs Mode](https://github.com/brianc/jade-mode)
  - [Vim Syntax](https://github.com/digitaltoad/vim-pug)
  - [TextMate Bundle](http://github.com/miksago/jade-tmbundle)
  - [Coda/SubEtha syntax Mode](https://github.com/aaronmccall/jade.mode)
  - [html2pug](https://github.com/donpark/html2jade) converter
  - [pug2php](https://github.com/SE7ENSKY/jade2php) converter
  - [Pug Server](https://github.com/ded/jade-server)  Ideal for building local prototypes apart from any application
  - [pug-ruby](https://github.com/yivo/pug-ruby) gem: Allows to invoke Pug and Jade from Ruby
  - [pug-rails](https://github.com/yivo/pug-rails) gem: Integrates Pug and Jade into your Rails application

## License

MIT
