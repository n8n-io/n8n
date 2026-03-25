# @microsoft/tsdoc-config

**TSDoc** is a proposal to standardize the doc comments used in [TypeScript](http://www.typescriptlang.org/)
source files.  The main package [`@microsoft/tsdoc`](https://www.npmjs.com/package/@microsoft/tsdoc) implements
the TSDoc parser.  The `@microsoft/tsdoc-config` package is an optional add-on for loading the **tsdoc.json**
file format that enables users to define custom TSDoc tags.  (This functionality was moved to its own package
because it requires external dependencies such as NodeJS and `ajv`, whereas the main package is fully self-contained.)

For more information about TSDoc, please visit the project website:

https://tsdoc.org


## Creating config files

The **tsdoc.json** file is optional.  When used, it is expected to be found in the same folder as
the **tsconfig.json** file for a project.  The loader looks for it by walking upwards in the directory tree
until it finds a folder containing **tsconfig.json** or **package.json**, and then it attempts to load
**tsdoc.json** from that location.

The **tsdoc.json** file conforms to the [tsdoc.schema.json](
https://developer.microsoft.com/json-schemas/tsdoc/v0/tsdoc.schema.json) JSON schema.  It defines tags using
similar fields as the
[TSDocTagDefinition](https://github.com/microsoft/tsdoc/blob/main/tsdoc/src/configuration/TSDocTagDefinition.ts)
API used by `TSDocParser` from `@microsoft/tsdoc`.

Here's a simple example:

**tsdoc.json**
```js
{
  "$schema": "https://developer.microsoft.com/json-schemas/tsdoc/v0/tsdoc.schema.json",
  "tagDefinitions": [
    {
      "tagName": "@myTag",
      "syntaxKind": "modifier"
    }
  ]
}
```

If you want to define custom tags in one place and share them across multiple projects, the `extends` field specifies
a list of paths that will be mixed in with the current file:

**tsdoc.json**
```js
{
  "$schema": "https://developer.microsoft.com/json-schemas/tsdoc/v0/tsdoc.schema.json",
  "extends": [
    "my-package/dist/tsdoc-base.json",
    "./path/to/local/file/tsdoc-local.json"
  ]
}
```

> NOTE: The `extends` paths are resolved using NodeJS module resolution, so local paths must begin with `./` to avoid
> being interpreted as an NPM package name.


## API Usage

The code sample below illustrates how to invoke the `@microsoft/tsdoc-config` API to load a
**tsdoc.json** file:

```ts
import * as path from 'path';
import { TSDocParser, TSDocConfiguration } from '@microsoft/tsdoc';
import { TSDocConfigFile } from '@microsoft/tsdoc-config';

// Sample source file to be parsed
const mySourceFile: string = 'my-project/src/example.ts';

// Load the nearest config file, for example `my-project/tsdoc.json`
const tsdocConfigFile: TSDocConfigFile = TSDocConfigFile.loadForFolder(path.dirname(mySourceFile));
if (tsdocConfigFile.hasErrors) {
  // Report any errors
  console.log(tsdocConfigFile.getErrorSummary());
}

// Use the TSDocConfigFile to configure the parser
const tsdocConfiguration: TSDocConfiguration = new TSDocConfiguration();
tsdocConfigFile.configureParser(tsdocConfiguration);
const tsdocParser: TSDocParser = new TSDocParser(tsdocConfiguration);
```

