<p align="center">
  <img alt="madge" src="http://pahen.github.io/madge/logo.svg" width="320">
</p>

<p align="center">
  <img alt="Last version" src="https://img.shields.io/github/tag/pahen/madge.svg?style=flat-square" />
  <a href="https://www.npmjs.org/package/madge">
    <img alg="NPM Status" src="http://img.shields.io/npm/dm/madge.svg?style=flat-square" />
  </a>
  <a href="https://paypal.me/pahen" target="_blank">
    <img alt="Donate" src="https://img.shields.io/badge/donate-paypal-blue.svg?style=flat-square" />
  </a>
</p>

**Madge** is a developer tool for generating a visual graph of your module dependencies, finding circular dependencies, and giving you other useful info. Joel Kemp's awesome [dependency-tree](https://github.com/mrjoelkemp/node-dependency-tree) is used for extracting the dependency tree.

* Works for JavaScript (AMD, CommonJS, and ES6 modules)
* Also works for CSS preprocessors (Sass, Stylus, and Less)
* NPM installed dependencies are excluded by default (can be enabled)
* All core Node.js modules (assert, path, fs, etc) are excluded
* Will traverse child dependencies automatically

Read the [changelog](CHANGELOG.md) for latest changes.

> I've worked with Madge on my free time for the last couple of years and it's been a great experience. It started as an experiment but turned out to be a very useful tool for many developers. I have many ideas for the project and it would definitely be easier to dedicate more time to it with some [financial support](#donations-%EF%B8%8F) 🙏
>
> Regardless of your contribution, thanks for your support!

## Examples

> Graph generated from madge's own code and dependencies.

<a href="http://pahen.github.io/madge/madge.svg">
  <img alt="graph" src="http://pahen.github.io/madge/madge.svg" width="888"/>
</a>

> A graph with circular dependencies. Blue has dependencies, green has no dependencies, and red has circular dependencies.

<a href="http://pahen.github.io/madge/simple.svg">
  <img alt="graph-circular" src="http://pahen.github.io/madge/simple.svg" width="300"/>
</a>

## See it in action

<a href="https://asciinema.org/a/l9tM7lIraCpmzH0rdWw2KLrMc?autoplay=1">
  <img alt="in-action" src="https://asciinema.org/a/l9tM7lIraCpmzH0rdWw2KLrMc.png" width="590"/>
</a>

# Installation

```sh
npm -g install madge
```

## Graphviz (optional)

> [Graphviz](http://www.graphviz.org/) is only required if you want to generate visual graphs (e.g. in SVG or DOT format).

### Mac OS X

```sh
brew install graphviz || port install graphviz
```

### Ubuntu

```sh
apt-get install graphviz
```

# API

## madge(path: string|array|object, config: object)

> `path` is a single file or directory, or an array of files/directories to read. A predefined tree can also be passed in as an object.

> `config` is optional and should be the [configuration](#configuration) to use.

> Returns a `Promise` resolved with the Madge instance object.

## Functions

#### .obj()

> Returns an `Object` with all dependencies.

```javascript
const madge = require('madge');

madge('path/to/app.js').then((res) => {
	console.log(res.obj());
});
```

#### .warnings()

> Returns an `Object` of warnings.

```javascript
const madge = require('madge');

madge('path/to/app.js').then((res) => {
	console.log(res.warnings());
});
```

#### .circular()

> Returns an `Array` of all modules that have circular dependencies.

```javascript
const madge = require('madge');

madge('path/to/app.js').then((res) => {
	console.log(res.circular());
});
```

#### .circularGraph()

> Returns an `Object` with only circular dependencies.

```javascript
const madge = require('madge');

madge('path/to/app.js').then((res) => {
	console.log(res.circularGraph());
});
```

#### .depends()

> Returns an `Array` of all modules that depend on a given module.

```javascript
const madge = require('madge');

madge('path/to/app.js').then((res) => {
	console.log(res.depends('lib/log.js'));
});
```

#### .orphans()

> Return an `Array` of all modules that no one is depending on.

```javascript
const madge = require('madge');

madge('path/to/app.js').then((res) => {
	console.log(res.orphans());
});
```

#### .leaves()

> Return an `Array` of all modules that have no dependencies.

```javascript
const madge = require('madge');

madge('path/to/app.js').then((res) => {
	console.log(res.leaves());
});
```

#### .dot([circularOnly: boolean])

> Returns a `Promise` resolved with a DOT representation of the module dependency graph. Set `circularOnly` to only include circular dependencies.

```javascript
const madge = require('madge');

madge('path/to/app.js')
	.then((res) => res.dot())
	.then((output) => {
		console.log(output);
	});
```

#### .image(imagePath: string, [circularOnly: boolean])

> Write the graph as an image to the given image path. Set `circularOnly` to only include circular dependencies. The [image format](http://www.graphviz.org/content/output-formats) to use is determined from the file extension. Returns a `Promise` resolved with a full path to the written image.

```javascript
const madge = require('madge');

madge('path/to/app.js')
	.then((res) => res.image('path/to/image.svg'))
	.then((writtenImagePath) => {
		console.log('Image written to ' + writtenImagePath);
	});
```

#### .svg()

> Return a `Promise` resolved with the XML SVG representation of the dependency graph as a `Buffer`.

```javascript
const madge = require('madge');

madge('path/to/app.js')
	.then((res) => res.svg())
	.then((output) => {
		console.log(output.toString());
	});
```

# Configuration

Property | Type | Default | Description
--- | --- | --- | ---
`baseDir` | String | null | Base directory to use instead of the default
`includeNpm` | Boolean | false | If shallow NPM modules should be included
`fileExtensions` | Array | ['js'] | Valid file extensions used to find files in directories
`excludeRegExp` | Array | false | An array of RegExp for excluding modules
`requireConfig` | String | null | RequireJS config for resolving aliased modules
`webpackConfig` | String | null | Webpack config for resolving aliased modules
`tsConfig` | String\|Object | null | TypeScript config for resolving aliased modules - Either a path to a tsconfig file or an object containing the config
`layout` | String | dot | Layout to use in the graph
`rankdir` | String | LR | Sets the [direction](https://graphviz.gitlab.io/_pages/doc/info/attrs.html#d:rankdir) of the graph layout
`fontName` | String | Arial | Font name to use in the graph
`fontSize` | String | 14px | Font size to use in the graph
`backgroundColor` | String | #000000 | Background color for the graph
`nodeShape` | String | box | A string specifying the [shape](https://graphviz.gitlab.io/_pages/doc/info/attrs.html#k:shape) of a node in the graph
`nodeStyle` | String | rounded | A string specifying the [style](https://graphviz.gitlab.io/_pages/doc/info/attrs.html#k:style) of a node in the graph
`nodeColor` | String | #c6c5fe | Default node color to use in the graph
`noDependencyColor` | String | #cfffac | Color to use for nodes with no dependencies
`cyclicNodeColor` | String | #ff6c60 | Color to use for circular dependencies
`edgeColor` | String | #757575 | Edge color to use in the graph
`graphVizOptions` | Object | false | Custom Graphviz [options](https://graphviz.gitlab.io/_pages/doc/info/attrs.html)
`graphVizPath` | String | null | Custom Graphviz path
`detectiveOptions` | Object | false | Custom `detective` options for [dependency-tree](https://github.com/dependents/node-dependency-tree) and [precinct](https://github.com/dependents/node-precinct#usage)
`dependencyFilter` | Function | false | Function called with a dependency filepath (exclude subtrees by returning false)

You can use configuration file either in `.madgerc` in your project or home folder or directly in `package.json`. Look [here](https://github.com/dominictarr/rc#standards) for alternative locations for the file.

> .madgerc

```json
{
  "fontSize": "10px",
  "graphVizOptions": {
    "G": {
      "rankdir": "LR"
    }
  }
}
```

> package.json

```json
{
  "name": "foo",
  "version": "0.0.1",
  ...
  "madge": {
    "fontSize": "10px",
    "graphVizOptions": {
      "G": {
        "rankdir": "LR"
      }
    }
  }
}
```

# CLI

## Examples

> List dependencies from a single file

```sh
madge path/src/app.js
```

> List dependencies from multiple files

```sh
madge path/src/foo.js path/src/bar.js
```

> List dependencies from all *.js files found in a directory

```sh
madge path/src
```

> List dependencies from multiple directories

```sh
madge path/src/foo path/src/bar
```

> List dependencies from all \*.js and \*.jsx files found in a directory

```sh
madge --extensions js,jsx path/src
```

> Finding circular dependencies

```sh
madge --circular path/src/app.js
```

> Show modules that depends on a given module

```sh
madge --depends wheels.js path/src/app.js
```

> Show modules that no one is depending on

```sh
madge --orphans path/src/
```

> Show modules that have no dependencies

```sh
madge --leaves path/src/
```

> Excluding modules

```sh
madge --exclude '^(foo|bar)\.js$' path/src/app.js
```

> Save graph as a SVG image (requires [Graphviz](#graphviz-optional))

```sh
madge --image graph.svg path/src/app.js
```

> Save graph with only circular dependencies

```sh
madge --circular --image graph.svg path/src/app.js
```

> Save graph as a [DOT](http://en.wikipedia.org/wiki/DOT_language) file for further processing (requires [Graphviz](#graphviz-optional))

```sh
madge --dot path/src/app.js > graph.gv
```

> Using pipe to transform tree (this example will uppercase all paths)

```sh
madge --json path/src/app.js | tr '[a-z]' '[A-Z]' | madge --stdin
```

# Debugging

> To enable debugging output if you encounter problems, run madge with the `--debug` option then throw the result in a gist when creating issues on GitHub.

```sh
madge --debug path/src/app.js
```

# Running tests

```sh
npm install
npm test
```

# Creating a release

```sh
npm run release
```

# FAQ

## Missing dependencies?

It could happen that the files you're not seeing have been skipped due to errors or that they can't be resolved. Run madge with the `--warning` option to see skipped files. If you need even more info run with the `--debug` option.

## Using both Javascript and Typescript in your project?

Madge uses [dependency-tree](https://www.npmjs.com/package/dependency-tree) which uses [filing-cabinet](https://www.npmjs.com/package/filing-cabinet) to resolve modules. However it requires configurations for each file type (js/jsx) and (ts/tsx). So provide both `webpackConfig` and `tsConfig` options to madge.

## Using mixed import syntax in the same file?

Only one syntax is used by default. You can use both though if you're willing to take the degraded performance. Put this in your madge config to enable mixed imports.

For ES6 + CommonJS:

```json
{
  "detectiveOptions": {
    "es6": {
      "mixedImports": true
    }
  }
}
```

For TypeScript + CommonJS:

```json
{
  "detectiveOptions": {
    "ts": {
      "mixedImports": true
    }
  }
}
```

## How to ignore `import type` statements in ES6 + Flow?

Put this in your madge config.

```json
{
  "detectiveOptions": {
    "es6": {
      "skipTypeImports": true
    }
  }
}
```

## How to ignore `import` in type annotations in TypeScript?

Put this in your madge config.

```json
{
  "detectiveOptions": {
    "ts": {
      "skipTypeImports": true
    }
  }
}
```

## How to ignore dynamic imports in Typescript?

Put this in your madge config.

```json
{
  "detectiveOptions": {
    "ts": {
      "skipAsyncImports": true
    },
    "tsx": {
      "skipAsyncImports": true
    }
  }
}
```

Note: `tsx` is optional, use this when working with JSX.

## Mixing TypesScript and Javascript imports?

Ensure you have this in your `.tsconfig` file.

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "allowJs": true
  }
}
```

## What's the "Error: write EPIPE" when exporting graph to image?

Ensure you have [installed Graphviz](#graphviz-optional). If you're running Windows, note that Graphviz is not added to the `PATH` variable during install. You should add the folder of `gvpr.exe` (typically `%Graphviz_folder%/bin`) to the `PATH` variable manually.

## How do I fix the "Graphviz not built with triangulation library" error when using sfdp layout?

Homebrew doesn't include GTS by default. Fix this by doing:

```sh
brew uninstall graphviz
brew install gts
brew install graphviz
```

## The image produced by madge is very hard to read, what's wrong?

Try running madge with a different layout, here's a list of the ones you can try:

* **dot** "hierarchical" or layered drawings of directed graphs. This is the default tool to use if edges have directionality.

* **neato** "spring model'' layouts.  This is the default tool to use if the graph is not too large (about 100 nodes) and you don't know anything else about it. Neato attempts to
minimize a global energy function, which is equivalent to statistical multi-dimensional scaling.

* **fdp** "spring model'' layouts similar to those of neato, but does this by reducing forces rather than working with energy.

* **sfdp** multiscale version of fdp for the layout of large graphs.

* **twopi** radial layouts, after Graham Wills 97. Nodes are placed on concentric circles depending their distance from a given root node.

* **circo** circular layout, after Six and Tollis 99, Kauffman and Wiese 02. This is suitable for certain diagrams of multiple cyclic structures, such as certain telecommunications networks.

# Credits

## Contributors

This project exists thanks to all the people who contribute.
<a href="https://github.com/pahen/madge/graphs/contributors">
  <img src="https://opencollective.com/madge/contributors.svg?width=890&button=false" alt="Contributors"/>
</a>

## Donations ❤️

Thanks to the awesome people below for making donations! 🙏[Donate](https://paypal.me/pahen)

<p>
  <a href="https://github.com/BeroBurny" target="_blank">
    <div><b>Bernard Stojanović</b> (24 Mars, 2021)</div>
    <img alt="BeroBurny" src="https://github.com/BeroBurny.png" width="64"/>
  </a>
</p>

<p>
  <a href="https://github.com/olejorgenb" target="_blank">
    <div><b>Ole Jørgen Brønner</b> (Oct 8, 2020)</div>
    <img alt="olejorgenb" src="https://github.com/olejorgenb.png" width="64"/>
  </a>
</p>

<p>
  <a href="https://github.com/pubkey/rxdb" target="_blank">
    <div><b>RxDB</b> (Apr 1, 2020)</div>
    <img alt="RxDB" src="https://cdn.rawgit.com/pubkey/rxdb/ba7c9b80/docs/files/logo/logo_text.svg" width="128" style="margin: -4px -10px"/>
  </a>
</p>

<p>
  <a href="https://github.com/Ziriax" target="_blank">
    <div><b>Peter Verswyvelen</b> (Feb 24, 2020)</div>
    <img alt="Ziriax" src="https://github.com/Ziriax.png" width="64"/>
  </a>
</p>

<p>
  <a href="https://github.com/landonalder" target="_blank">
    <div><b>Landon Alder</b> (Mar 19, 2019)</div>
    <img alt="landonalder" src="https://github.com/landonalder.png" width="64"/>
  </a>
</p>

# License

MIT License
