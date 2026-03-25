NPM License Checker
===================

[![Build Status](https://www.travis-ci.org/davglass/license-checker.svg?branch=master)](https://www.travis-ci.org/davglass/license-checker)

*As of v17.0.0 the `failOn` and `onlyAllow` arguments take semicolons as delimeters instead of commas. Some license names contain
commas and it messed with the parsing*

Ever needed to see all the license info for a module and its dependencies?

It's this easy:

```shell
npm install -g license-checker

mkdir foo
cd foo
npm install yui-lint
license-checker
```

You should see something like this:

```
├─ cli@0.4.3
│  ├─ repository: http://github.com/chriso/cli
│  └─ licenses: MIT
├─ glob@3.1.14
│  ├─ repository: https://github.com/isaacs/node-glob
│  └─ licenses: UNKNOWN
├─ graceful-fs@1.1.14
│  ├─ repository: https://github.com/isaacs/node-graceful-fs
│  └─ licenses: UNKNOWN
├─ inherits@1.0.0
│  ├─ repository: https://github.com/isaacs/inherits
│  └─ licenses: UNKNOWN
├─ jshint@0.9.1
│  └─ licenses: MIT
├─ lru-cache@1.0.6
│  ├─ repository: https://github.com/isaacs/node-lru-cache
│  └─ licenses: MIT
├─ lru-cache@2.0.4
│  ├─ repository: https://github.com/isaacs/node-lru-cache
│  └─ licenses: MIT
├─ minimatch@0.0.5
│  ├─ repository: https://github.com/isaacs/minimatch
│  └─ licenses: MIT
├─ minimatch@0.2.9
│  ├─ repository: https://github.com/isaacs/minimatch
│  └─ licenses: MIT
├─ sigmund@1.0.0
│  ├─ repository: https://github.com/isaacs/sigmund
│  └─ licenses: UNKNOWN
└─ yui-lint@0.1.1
   ├─ licenses: BSD
      └─ repository: http://github.com/yui/yui-lint
```

An asterisk next to a license name means that it was deduced from
an other file than package.json (README, LICENSE, COPYING, ...)
You could see something like this:

```
└─ debug@2.0.0
   ├─ repository: https://github.com/visionmedia/debug
   └─ licenses: MIT*
```

Options
-------

* `--production` only show production dependencies.
* `--development` only show development dependencies.
* `--start [path of the initial json to look for]`
* `--unknown` report guessed licenses as unknown licenses.
* `--onlyunknown` only list packages with unknown or guessed licenses.
* `--json` output in json format.
* `--csv` output in csv format.
* `--csvComponentPrefix` prefix column for component in csv format.
* `--out [filepath]` write the data to a specific file.
* `--customPath` to add a custom Format file in JSON
* `--exclude [list]` exclude modules which licenses are in the comma-separated list from the output
* `--relativeLicensePath` output the location of the license files as relative paths
* `--summary` output a summary of the license usage',
* `--failOn [list]` fail (exit with code 1) on the first occurrence of the licenses of the semicolon-separated list
* `--onlyAllow [list]` fail (exit with code 1) on the first occurrence of the licenses not in the semicolon-seperated list
* `--packages [list]` restrict output to the packages (package@version) in the semicolon-seperated list
* `--excludePackages [list]` restrict output to the packages (package@version) not in the semicolon-seperated list
* `--excludePrivatePackages` restrict output to not include any package marked as private
* `--direct look for direct dependencies only`

Exclusions
----------
A list of licenses is the simplest way to describe what you want to exclude.

You can use valid [SPDX identifiers](https://spdx.org/licenses/).
You can use valid SPDX expressions like `MIT OR X11`.
You can use non-valid SPDX identifiers, like `Public Domain`, since `npm` does
support some license strings that are not SPDX identifiers.

Examples
--------

```
license-checker --json > /path/to/licenses.json
license-checker --csv --out /path/to/licenses.csv
license-checker --unknown
license-checker --customPath customFormatExample.json
license-checker --exclude 'MIT, MIT OR X11, BSD, ISC'
license-checker --packages 'react@16.3.0;react-dom@16.3.0;lodash@4.3.1'
license-checker --excludePackages 'internal-1;internal-2'
license-checker --onlyunknown
```

Custom format
-------------

The `--customPath` option can be used with CSV to specify the columns. Note that
the first column, `module_name`, will always be used.

When used with JSON format, it will add the specified items to the usual ones.

The available items are the following:
- name
- version
- description
- repository
- publisher
- email
- url
- licenses
- licenseFile
- licenseText
- licenseModified

You can also give default values for each item.
See an example in [customFormatExample.json](customFormatExample.json).

Requiring
---------


```js
var checker = require('license-checker');

checker.init({
    start: '/path/to/start/looking'
}, function(err, packages) {
    if (err) {
        //Handle error
    } else {
        //The sorted package data
        //as an Object
    }
});
```

Debugging
---------

license-checker uses [debug](https://www.npmjs.com/package/debug) for internal logging. There’s two internal markers:

* `license-checker:error` for errors
* `license-checker:log` for non-errors

Set the `DEBUG` environment variable to one of these to see debug output:

```shell
$ export DEBUG=license-checker*; license-checker
scanning ./yui-lint
├─ cli@0.4.3
│  ├─ repository: http://github.com/chriso/cli
│  └─ licenses: MIT
# ...
```

How Licenses are Found
----------------------

We walk through the `node_modules` directory with the [`read-installed`](https://www.npmjs.org/package/read-installed) module. Once we gathered a list of modules we walk through them and look at all of their `package.json`'s, We try to identify the license with the [`spdx`](https://www.npmjs.com/package/spdx) module to see if it has a valid SPDX license attached. If that fails, we then look into the module for the following files: `LICENSE`, `LICENCE`, `COPYING`, & `README`.

If one of the those files are found (in that order) we will attempt to parse the license data from it with a list of known license texts. This will be shown with the `*` next to the name of the license to show that we "guessed" at it.
