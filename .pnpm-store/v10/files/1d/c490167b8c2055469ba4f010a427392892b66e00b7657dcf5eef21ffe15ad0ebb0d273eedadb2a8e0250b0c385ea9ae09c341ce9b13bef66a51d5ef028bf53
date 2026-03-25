# @rushstack/rig-package

The **config/rig.json** file is a system that Node.js build tools can adopt, in order to eliminate
duplication of config files when many projects share a common configuration. This is particularly valuable
in a setup where hundreds of projects may be built using a small set of reusable recipes.

## Motivation

For a concrete example, consider the [API Extractor](https://api-extractor.com/) tool which reads its
configuration from **\<projectFolder\>/config/api-extractor.json**. Suppose that we have three separate projects
that all share the exact same configuration:

```
project1/package.json
project1/config/api-extractor.json
project1/config/other-tool2.json
project1/config/other-tool3.json
project1/src/index.ts

project2/package.json
project2/config/api-extractor.json
project2/config/other-tool2.json
project2/config/other-tool3.json
project2/src/index.ts

project3/package.json
project3/config/api-extractor.json
project3/config/other-tool2.json
project3/config/other-tool3.json
project3/src/index.ts
```

It seems wasteful to copy and paste the **api-extractor.json** file with all those settings. If we later need
to tune the configuration, we'd have to find and update each file. For a large organization, there could be
hundreds of such projects.

The `"extends"` setting provides a basic way to centralize the configuration in a "rig package". For this example,
we'll call our NPM package **example-rig**:

```
example-rig/package.json
example-rig/profile/node-library/config/api-extractor.json
example-rig/profile/web-library/config/api-extractor.json

project1/package.json
project1/config/api-extractor.json
project1/config/other-tool2.json
project1/config/other-tool3.json
project1/src/index.ts

project2/package.json
project2/config/api-extractor.json
project2/config/other-tool2.json
project2/config/other-tool3.json
project2/src/index.ts

project3/package.json
project3/config/api-extractor.json
project3/config/other-tool2.json
project3/config/other-tool3.json
project3/src/index.ts
```

To make things interesting, above we've introduced two "profiles":

- `node-library` is for libraries that target the Node.js runtime
- `web-library` is for libraries that target a web browser

> **NOTE:** The `node-library` and `web-library` names are hypothetical examples. The names and purposes of
> rig profiles are user-defined. If you only need one profile, then call it `default`.

If **project1** and **project2** are Node.js libraries, then their **api-extractor.json** now reduces to this:

**project1/config/api-extractor.json**

```js
{
  "$schema": "https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json",
  "extends": "example-rig/profile/node-library/config/api-extractor.json"
}
```

Whereas if **project3** is a web browser library, then it might look like this:

**project3/config/api-extractor.json**

```js
{
  "$schema": "https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json",
  "extends": "example-rig/profile/web-library/config/api-extractor.json"
}
```

Using `"extends"` definitely made the config file shorter! But imagine that we have a large monorepo with 100 projects.
And each project has 5 config files like **api-extactor.json**. We still have to copy+paste 100 x 5 = 500 config files
across all our project folders.

Can we do better?

## rig.json eliminates files entirely

The idea is to replace `config/api-extractor.json` and `config/other-tool2.json` (and any other such files)
with a single file `config/rig.json` that delegates everything to the rig package:

**project3/config/rig.json**

```js
{
  "$schema": "https://developer.microsoft.com/json-schemas/rig-package/rig.schema.json",

  /**
   * (Required) The name of the rig package to inherit from.
   * It should be an NPM package name with the "-rig" suffix.
   */
  "rigPackageName": "example-rig",

  /**
   * (Optional) Selects a config profile from the rig package.  The name must consist of
   * lowercase alphanumeric words separated by hyphens, for example "sample-profile".
   * If omitted, then the "default" profile will be used."
   */
  "rigProfile": "web-library"
}
```

Using **rig.json** eliminates the `"extends"` stub files entirely. A tool that implements the **rig.json** system
would probe for its config file (`<targetFile>.json`) using the following procedure:

1. First check for `config/<targetFile>.json` in the project folder; if found, use that file. OTHERWISE...
2. Check for `config/rig.json`; if found, then this project is using a rig package. Read the `<rigPackageName>`
   and `<rigProfile>` settings from that file.
3. Use Node.js module resolution to find the `<rigPackageName>` package folder (let's call that `<rigPackageFolder>`)
4. Check for `<rigPackageFolder>/profile/<rigProfile>/<targetFile>.json`; if found, use that file. OTHERWISE...
5. If the `<targetFile>.json` cannot be found in either of these places, the behavior is left to the tool.
   For example, it could report an error, or proceed using defaults.

In cases where we need a project-specific customization, the `"extends"` field is still supported. For example,
**project1** can still add a local override like this:

**project1/config/api-extractor.json**

```js
{
  "$schema": "https://developer.microsoft.com/json-schemas/api-extractor/v7/api-extractor.schema.json",
  "extends": "example-rig/profile/node-library/config/api-extractor.json",

  // Local override:
  "mainEntryPointFilePath": "<projectFolder>/lib/custom.d.ts",
}
```

The result is a much shorter inventory of files:

```
example-rig/package.json

example-rig/profile/node-library/config/api-extractor.json
example-rig/profile/node-library/config/other-tool2.json
example-rig/profile/node-library/config/other-tool3.json

example-rig/profile/web-library/config/api-extractor.json
example-rig/profile/web-library/config/other-tool2.json
example-rig/profile/web-library/config/other-tool3.json

project1/package.json
project1/config/rig.json
project1/config/api-extractor.json  <-- local override shown above
project1/src/index.ts

project2/package.json
project2/config/rig.json
project2/src/index.ts

project3/package.json
project3/config/rig.json
project3/src/index.ts
```

## The `@rushstack/rig-package` API

The `@rushstack/rig-package` library provides an API for loading the **rig.json** file and performing lookups.
It is a lightweight NPM package, intended to be easy for tool projects to accept as a dependency. The package
also includes the JSON schema file **rig.schema.json**.

Example usage of the API:

```ts
import { RigConfig } from '@rushstack/rig-package';

// Probe for the rig.json file and load it if found
const rigConfig: RigConfig = RigConfig.loadForProjectFolder({
  // Specify a  project folder (i.e. where its package.json file is located)
  projectFolderPath: testProjectFolder
});

if (rigConfig.rigFound) {
  // We found a config/rig.json file
  //
  // Prints "/path/to/project3/config/rig.json"
  console.log('Found rig.json: ' + rigConfig.filePath);

  // Prints "example-rig"
  console.log('The rig package is: ' + rigConfig.rigPackageName);

  // Resolve the rig package
  //
  // Prints "/path/to/project3/node_modules/example-rig/profile/web-library"
  console.log('Profile folder: ' + rigConfig.getResolvedProfileFolder());

  // Look up a config file.  These file paths will be tested:
  //
  //   /path/to/project3/folder/file.json
  //   /path/to/project3/node_modules/example-rig/profile/web-library/folder/file.json
  //
  // The result will be the first path that exists, or undefined if the config file was not found.
  console.log('Resolved config file: ' + rigConfig.tryResolveConfigFilePath('folder/file.json'));
}
```

Note that there are also async variants of the functions that access the filesystem.

## Links

- [CHANGELOG.md](
  https://github.com/microsoft/rushstack/blob/main/libraries/rig-package/CHANGELOG.md) - Find
  out what's new in the latest version
- [API Reference](https://api.rushstack.io/pages/rig-package/)

`@rushstack/rig-package` is part of the [Rush Stack](https://rushstack.io/) family of projects.
