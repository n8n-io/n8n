# @istanbuljs/load-nyc-config

The utility function which NYC uses to load configuration.
This can be used by outside programs to calculate the configuration.
Command-line arguments are not considered by this function.

```js
const {loadNycConfig} = require('@istanbuljs/load-nyc-config');

(async () {
  console.log(await loadNycConfig());
})();
```

## loadNycConfig([options])

### options.cwd

Type: `string`
Default: `cwd` from parent nyc process or `process.cwd()`

### options.nycrcPath

Type: `string`
Default: `undefined`

Name of the file containing nyc configuration.
This can be a relative or absolute path.
Relative paths can exist at `options.cwd` or any parent directory.
If an nycrc is specified but cannot be found an exception is thrown.

If no nycrc option is provided the default priority of config files are:

* .nycrc
* .nycrc.json
* .nycrc.yml
* .nycrc.yaml
* nyc.config.js
* nyc.config.cjs
* nyc.config.mjs

## Configuration merging

Configuration is first loaded from `package.json` if found, this serves as the package
defaults.  These options can be overridden by an nycrc if found.  Arrays are not merged,
so if `package.json` sets `"require": ["@babel/register"]` and `.nycrc` sets `"require": ["esm"]`
the effective require setting will only include `"esm"`.

## isLoading

```js
const {isLoading} = require('@istanbuljs/load-nyc-config');

console.log(isLoading());
```

In some cases source transformation hooks can get installed before the configuration is
loaded.  This allows hooks to ignore source loads that occur during configuration load.

## `@istanbuljs/load-nyc-config` for enterprise

Available as part of the Tidelift Subscription.

The maintainers of `@istanbuljs/load-nyc-config` and thousands of other packages are working with Tidelift to deliver commercial support and maintenance for the open source dependencies you use to build your applications. Save time, reduce risk, and improve code health, while paying the maintainers of the exact dependencies you use. [Learn more.](https://tidelift.com/subscription/pkg/npm-istanbuljs-load-nyc-config?utm_source=npm-istanbuljs-load-nyc-config&utm_medium=referral&utm_campaign=enterprise)
