# tsc-alias

Replace alias paths with relative paths after typescript compilation. You can add aliases that reference other projects outside your tsconfig.json project by providing a relative path to the baseUrl.

[![npm version](https://badge.fury.io/js/tsc-alias.svg)](https://badge.fury.io/js/tsc-alias)
[![License](https://img.shields.io/:license-mit-blue.svg)](http://doge.mit-license.org)
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/donate/?hosted_button_id=FPRE4VERGHZ3E)

## Comparison to [tsconfig-paths](https://github.com/dividab/tsconfig-paths)

\+ Compile time (no runtime dependencies)

## Getting Started

First, install tsc-alias as devDependency using npm.

```sh
npm install -g tsc-alias
```

```
npm install --save-dev tsc-alias
```

## Add it to your build scripts in package.json

```json
"scripts": {
  "build": "tsc --project tsconfig.json && tsc-alias -p tsconfig.json",
}

================ OR ===================

"scripts": {
  "build": "tsc && tsc-alias",
  "build:watch": "tsc && (concurrently \"tsc -w\" \"tsc-alias -w\")"
}
```

## Issues
If you have an issue, please create one. But, before:

- try to check the [FAQ.](https://github.com/justkey007/tsc-alias/discussions/110) 
- try to check if there exits alike issues.
- try to run with `--debug` and check if config is correctly loaded and all sourcefiles are found.

## API

### Installation

```sh
npm install tsc-alias
```

### Usage

```typescript
import { replaceTscAliasPaths } from 'tsc-alias';

replaceTscAliasPaths(options?);
```

Here are all the available options:

<table>
  <thead>
  <tr>
    <th>Option</th>
    <th>Description</th>
    <th>Default Value</th>
  </tr>
  </thead>
  <tbody>
    <tr>
      <td>project, p</td>
      <td>path to tsconfig.json</td>
      <td><code>'tsconfig.json'</code></td>
    </tr>
    <tr>
      <td>watch</td>
      <td>Observe file changes</td>
      <td><code>false</code></td>
    </tr>
    <tr>
      <td>outDir</td>
      <td>Run in a folder leaving the "outDir" of the tsconfig.json (relative path to tsconfig)</td>
      <td><code>tsconfig.compilerOptions.outDir</code></td>
    </tr>
    <tr>
      <td>declarationDir</td>
      <td>Works the same as outDir but for declarationDir</td>
      <td><code>tsconfig.compilerOptions.declarationDir</code></td>
    </tr>
    <tr>
      <td>resolveFullPaths</td>
      <td>Attempt to replace incomplete import paths (those not ending in <code>.js</code>) with fully resolved paths (for ECMAScript Modules compatibility)</td>
      <td><code>false</code></td>
    </tr>
    <tr>
      <td>resolveFullExtension</td>
      <td>Allows you to specify the extension of incomplete import paths, works with <code>resolveFullPaths</code></td>
      <td><code>'.js' | '.mjs' | '.cjs'</code></td>
    </tr>
    <tr>
      <td>silent</td>
      <td>Reduced terminal output. This is a deprecated option and no longer has any effect.</td>
      <td><code>true</code></td>
    </tr>
    <tr>
      <td>verbose</td>
      <td>Additional information is output to the terminal</td>
      <td><code>false</code></td>
    </tr>
    <tr>
      <td>debug</td>
      <td>Debug information is send to the terminal</td>
      <td><code>false</code></td>
    </tr>
    <tr>
      <td>replacers</td>
      <td>Files to import as extra replacers <a href="https://github.com/justkey007/tsc-alias/discussions/73">More info</a></td>
      <td><code>[]</code></td>
    </tr>
    <tr>
      <td>output</td>
      <td>The output object tsc-alias will send logs to.</td>
      <td><code>new Output(options.verbose)</code></td>
    </tr>
    <tr>
      <td>fileExtensions</td>
      <td>Overwrite file extensions tsc-alias will use to scan and resolve files.</td>
      <td><code>undefined</code></td>
    </tr>
  </tbody>
</table>

### Configuration via `tsconfig.json` Example

```json
{
  "compilerOptions": {
    ...
  },
  "tsc-alias": {
    "verbose": false,
    "resolveFullPaths": true,
    "replacers": {
      "exampleReplacer": {
        "enabled": true,
        "file": "./exampleReplacer.js"
      },
      "otherReplacer": {
        "enabled": true,
        "file": "./otherReplacer.js"
      }
    },
    "fileExtensions": {
      "inputGlob": "{js,jsx,mjs}",
      "outputCheck": ["js", "json", "jsx", "mjs"]
    }
  }
}
```

### Single file replacer

We can use tsc-alias in a single file, with a function that returns the modified contents.

We prepare the replacer with `prepareSingleFileReplaceTscAliasPaths()`, passing the same options that we would pass to `replaceTscAliasPaths()`. That will return a promise of a function that receives the file contents and path, and returns the transformed contents, synchronously.

```typescript
import { prepareSingleFileReplaceTscAliasPaths } from 'tsc-alias';

const runFile: SingleFileReplacer = await prepareSingleFileReplaceTscAliasPaths(options?);

function treatFile(filePath: string) {
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const newContents = runFile({fileContents, filePath});
  // do stuff with newContents
}
```
