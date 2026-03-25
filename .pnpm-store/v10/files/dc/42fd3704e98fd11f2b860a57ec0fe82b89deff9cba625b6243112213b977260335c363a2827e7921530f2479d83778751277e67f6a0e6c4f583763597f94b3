# swagger2openapi

![logo](https://github.com/Mermade/oas-kit/blob/master/docs/logo.png?raw=true)

[![OpenAPI Validation](https://mermade.org.uk/openapi-converter/api/v1/badge?url=https://mermade.org.uk/openapi-converter/examples/openapi.json)](https://mermade.org.uk/openapi-converter/api/v1/validate?url=https://mermade.org.uk/openapi-converter/examples/openapi.json)
![Build](https://img.shields.io/travis/Mermade/oas-kit/master.svg)
[![Tested on APIs.guru](https://api.apis.guru/badges/tested_on.svg)](https://APIs.guru)
[![Tested on Mermade OpenAPIs](https://img.shields.io/badge/Additional%20Docs-74426-brightgreen.svg)](https://github.com/mermade/openapi-definitions)
[![Coverage Status](https://coveralls.io/repos/github/Mermade/swagger2openapi/badge.svg?branch=master)](https://coveralls.io/github/Mermade/swagger2openapi?branch=master)
[![Known Vulnerabilities](https://snyk.io/test/npm/swagger2openapi/badge.svg)](https://snyk.io/test/npm/swagger2openapi)
[![Greenkeeper badge](https://badges.greenkeeper.io/Mermade/oas-kit.svg)](https://greenkeeper.io/)

Convert Swagger 2.0 definitions into OpenApi 3.0.x

The online version of the converter/validator runs on a [Linode](https://www.linode.com/?r=5734be467cc501b23267cf66d451bc339042ddfa) VPS. If you are considering a hosted server, please sign up through this link so we both receive free credit.

Currently tracking [v3.0.x](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.2.md)

## Installation:
This is a node.js module, which you can run on the command line. First ensure you have npm installed (tested on version 6.1+), and then install as follows:
```bash
npm install -g swagger2openapi
```
Or, add it to your node.js projects as shown below in option B.

## Usage:
### A. Command line:

```text
swagger2openapi [options] [filename|url]
Options:
  --refSiblings        mode to handle $ref's with sibling properties
                                        [choices: "remove", "preserve", "allOf"]
  --resolveInternal    resolve internal references also                [boolean]
  --warnProperty       Property name to use for warning extensions
                                             [string] [default: "x-s2o-warning"]
  --version            Show version number                             [boolean]
  -c, --components     output information to unresolve a definition    [boolean]
  -d, --debug          enable debug mode, adds specification-extensions[boolean]
  -e, --encoding       encoding for input/output files[string] [default: "utf8"]
  -f, --fatal          make resolution errors fatal                    [boolean]
  -h, --help           Show help                                       [boolean]
  -i, --indent         JSON indent to use, defaults to 4 spaces         [string]
  -o, --outfile        the output file to write to                      [string]
  -p, --patch          fix up small errors in the source definition    [boolean]
  -r, --resolve        resolve external references                     [boolean]
  -t, --targetVersion  override default target version of 3.0.0         [string]
  -u, --url            url of original spec, creates x-origin entry     [string]
  -v, --verbose        increase verbosity                                [count]
  -w, --warnOnly       Do not throw on non-patchable errors, add warning
                       extensions                                      [boolean]
  -y, --yaml           write YAML, default JSON (overridden by --outfile
                       filepath extension)                             [boolean]
  -b, --rbname         Extension to use to preserve body parameter names in
                       converted operations ("" == disabled)
                                                          [string] [default: ""]
```

### B. Node.js API:

```javascript
const converter = require('swagger2openapi');
let options = {};
//options.patch = true; // fix up small errors in the source definition
//options.warnOnly = true; // Do not throw on non-patchable errors
converter.convertObj(swagger, options, function(err, options){
  // options.openapi contains the converted definition
});
// also available are asynchronous convertFile, convertUrl, convertStr and convertStream functions
// if you omit the callback parameter, you will instead receive a Promise
```

Note that the `options` object passed in is modified/extended by the `convert*` functions.

See the [boast command-line tool](/packages/swagger2openapi/boast.js) for a fuller CLI tool for converting, validating and linting.

See here for complete [documentation](/docs/options.md) of the `options` object.

### C. Browser:

Or use the [online version](https://mermade.org.uk/openapi-converter) which also includes its own [API](http://petstore.swagger.io/?url=https://mermade.org.uk/openapi-converter/contract/swagger.json).

#### Browser Support

See [initial documentation](/docs/browser.md).

## Features

### OpenAPI 3.0.x validation

`oas-validate` can be used as a validator if given one or more existing OpenAPI 3.x definitions. The validator (however it is called) uses [WHATWG](https://whatwg.org/) URL parsing if available (node 7.x and above). The validator can have a linting mode enabled with the `--lint` option. Rules are defined [here](/packages/oas-linter/rules.yaml). Contributions of rules and rule actions for the linter are very much appreciated.

```text
oas-validate.js [options] {path-to-docs}...

Options:
  --lint            lint the definition                                [boolean]
  --validateSchema  Run schema validation step: first, last* or never   [string]
  --warnOnly        Do not throw on non-patchable errors               [boolean]
  -h, --help        Show help                                          [boolean]
  --version         Show version number                                [boolean]
  -e, --encoding    encoding for input/output files   [string] [default: "utf8"]
  -f, --fail        path to docs expected to fail                       [string]
  -j, --jsonschema  path to alternative JSON schema                     [string]
  -l, --laxurls     lax checking of empty urls                         [boolean]
  -m, --mediatype   check media-types against RFC pattern              [boolean]
  -n, --nopatch     do not patch minor errors in the source definition [boolean]
  -o, --output      output conversion result  [string] [default: "openapi.yaml"]
  -q, --quiet       do not show test passes on console, for CI         [boolean]
  -r, --resolve     resolve external references                        [boolean]
  -s, --stop        stop on first error                                [boolean]
  -v, --verbose     increase verbosity                                   [count]
  -w, --whatwg      enable WHATWG URL parsing                          [boolean]
  -y, --yaml        skip YAML-safe test                                [boolean]
```

### Reference preservation

`swagger2openapi` by default preserves almost all `$ref` JSON references in your API definition, and does not dereference
every item, as with some model-based parsers. The exception is internal references within externally referenced documents. To enable internal `$ref` resolution across the whole document, use the `--resolveInternal` option, which also disables creation of `$ref`s for shared `requestBodies`.

### Schema transformations

`swagger2openapi` will automatically 'repair' a number of problems where non-compliant Swagger 2.0 schemas have been used. It will attempt to transform JSON schemas (used incorrectly) into OpenAPI 3.0.x Schema objects.

### Specification extensions

`swagger2openapi` has support for a limited number of real-world [specification extensions](/docs/extensions.md) which have a direct bearing on the conversion. All other specification extensions are left untouched. swagger2openapi is [swaggerplusplus](https://github.com/mermade/swaggerplusplus)-compatible.

It is expected to be able to configure the process of specification-extension modification using options or a plugin mechanism in a future release.

## Tests

To run a test-suite:

```shell
node oas-validate [-f {path-to-expected-failures}]... [{path-to-APIs|single-file...}]
```

The test harness currently expects files with a `.json` or `.yaml` extension, or a single named file, and has been tested on LTS Node.js versions against

* [APIs.guru](https://github.com/APIs-guru/openapi-directory)
* [Mermade OpenApi specifications collection](https://github.com/mermade/openapi_specifications)
* [OpenAPI3-Examples (pass/fail)](https://github.com/mermade/openapi3-examples)
* [SOM-Research collection](https://github.com/SOM-Research/hapi)

Additionally `swagger2openapi` has been tested on a corpus of 74,426 real-world valid Swagger 2.0 definitions from GitHub and [SwaggerHub](https://swaggerhub.com/). However, if you have a definition which causes errors in the converter or does not pass validation, please do not hesitate to [raise an issue](https://github.com/Mermade/swagger2openapi/issues).

### Regression tests

Regression tests (thanks [@domharrington](https://github.com/domharrington)) live in the `/test` directory and can be run with `npx mocha`. Each sub-directory of `s2o-test` should contain an input `swagger.yaml` file, an expected output `openapi.yaml` file and an optional `options.yaml` file. You can put private test cases in sub-directories starting with an underscore character. In the `resolver` sub-directory, each directory should contain an `input.yaml`, an `output.yaml` and an optional `options.yaml` file.

### Version history

* [Change-Log](https://github.com/Mermade/oas-kit/blob/master/CHANGELOG.md#change-log)

## License

[BSD-3-Clause](LICENSE) except the `openapi-3.0.json` schema, which is taken from the [OpenAPI-Specification](https://github.com/OAI/OpenAPI-Specification/blob/master/schemas/v3.0/schema.yaml) which is licensed under the [Apache-2](http://www.apache.org/licenses/LICENSE-2.0) license.
