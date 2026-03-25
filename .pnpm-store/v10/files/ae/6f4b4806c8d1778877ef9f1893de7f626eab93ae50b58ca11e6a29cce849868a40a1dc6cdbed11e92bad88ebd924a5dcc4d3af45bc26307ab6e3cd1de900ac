# Generate Schemas

Convert JSON Objects to MySQL Table Schema, JSON Schema, Mongoose Schema, ClickHouse Schema, Google BigQuery, or a Generic template for documentation, code generation, and more.

[![Build Status][travis-image]][travis-url]
[![version][npm-version]][npm-url]
[![License][npm-license]][license-url]
[![Downloads][npm-downloads]][npm-url]

## Table of Contents

- [Installation](#installation)
- [CLI](#cli)
  * [Options](#options)
  * [REPL Mode](#repl-interactive-mode)
    + [Example](#example)
- [Usage](#usage)
  + [Example](#example-1)
  + [Methods](#methods)
    - [`g.generic(Object object)`](#ggenericobject-object)
    - [`g.mysql([String tableName,] Mixed object)`](#gmysqlstring-tablename-mixed-object)
    - [`g.json([String title,] Mixed object)`](#gjsonstring-title-mixed-object)
    - [`g.mongoose(Object object)`](#gmongooseobject-object)
    - [`g.bigquery(Object object)`](#gbigqueryobject-object)
    - [`g.clickhouse([String tableName,] Mixed object, String dateField)`](#gclickhousestring-tablename-mixed-object)
- [License](#license)

# Installation

Install with [npm](https://www.npmjs.com/):

```bash
$ npm i --save generate-schema
```

Optionally, add `-g` to the above if you want the `generate-schema` [command line](#cli) executable.

# <abbr title="Command Line Interface">CLI</abbr>

```
  Usage: generate-schema [options ...] [file]

  Common Options:

    -h, --help         output usage information
    -V, --version      output the version number
    -q, --quiet        Skip help message in program output

  Mode Options:
    -g, --generic      Generic JSON Primitives schema output
    -j, --json-schema  JSON Schema output
    -s, --mysql        MySQL Table Schema output
    -m, --mongoose     Mongoose Schema output
    -b, --big-query    Google BigQuery Schema output
    -c, --clickhouse   Clickhouse Table Schema output
```

## <abbr title="Read Eval Print Loop">REPL</abbr> Mode

When no file is specified, `generate-schema` enters a <abbr title="Read Eval Print Loop">REPL</abbr> mode.

### Example

```
$ generate-schema -b
generate-schema v2.5.1 (bigquery)
Type "exit" to quit.
Type {a:"b"} to see an example.
> {a:"b"}
[
  {
    "name": "a",
    "type": "STRING",
    "mode": "NULLABLE"
  }
]
```

# Usage

```js
var GenerateSchema = require('generate-schema')
```

## Example

```
// Capture Schema Output
var schema = GenerateSchema.json('Product', [
    {
        "id": 2,
        "name": "An ice sculpture",
        "price": 12.50,
        "tags": ["cold", "ice"],
        "dimensions": {
            "length": 7.0,
            "width": 12.0,
            "height": 9.5
        },
        "warehouseLocation": {
            "latitude": -78.75,
            "longitude": 20.4
        }
    },
    {
        "id": 3,
        "name": "A blue mouse",
        "price": 25.50,
        "dimensions": {
            "length": 3.1,
            "width": 1.0,
            "height": 1.0
        },
        "warehouseLocation": {
            "latitude": 54.4,
            "longitude": -32.7
        }
    }
])
```

Outputs:

```json
{
  "$schema": "http://json-schema.org/draft-04/schema#",
  "title": "Product Set",
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": {
        "type": "number"
      },
      "name": {
        "type": "string"
      },
      "price": {
        "type": "number"
      },
      "tags": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "dimensions": {
        "type": "object",
        "properties": {
          "length": {
            "type": "number"
          },
          "width": {
            "type": "number"
          },
          "height": {
            "type": "number"
          }
        }
      },
      "warehouseLocation": {
        "type": "object",
        "properties": {
          "latitude": {
            "type": "number"
          },
          "longitude": {
            "type": "number"
          }
        }
      }
    },
    "required": [
      "id",
      "name",
      "price",
      "dimensions",
      "warehouseLocation"
    ],
    "title": "Product"
  }
}
```


## Methods

#### `g.generic(Object object)`

Generates a generic schema from `object`. Property types are described using primitives.

#### `g.mysql([String tableName,] Mixed object)`

Generates MySQL Table Schema from `object`.

- `tableName` is optional, defaults to `generic`
- `object` must be of type `Object` or `Array`

#### `g.json([String title,] Mixed object)`

Generates JSON Schema from `object`.

- `title` is optional
- `object` must be of type `Object` or `Array`

#### `g.mongoose(Object object)`

Generates a [Mongoose Schema][mongoose-schema] from `object`.

#### `g.bigquery(Object object)`

Generates a [Google BigQuery][bigquery-schema] schema from  `object`.

#### `g.clickhouse([String tableName,] Mixed object, String dateField)`

Generates [ClickHouse Table Schema][clickhouse-schema] from `object`.

- `tableName` is optional, defaults to `generic`
- `object` must be of type `Object` or `Array`
- `dateField` Date field for ENGINE, must be of type `Date`

# License

[MIT][license-url]


<!-- links -->

[license-url]: https://github.com/Nijikokun/generate-schema/blob/master/LICENSE
[travis-url]: https://travis-ci.org/nijikokun/generate-schema
[travis-image]: https://travis-ci.org/nijikokun/generate-schema.svg?branch=master
[npm-url]: https://www.npmjs.com/package/generate-schema
[npm-license]: https://img.shields.io/npm/l/generate-schema.svg?style=flat
[npm-version]: https://badge.fury.io/js/generate-schema.svg
[npm-downloads]: https://img.shields.io/npm/dm/generate-schema.svg?style=flat

[json-schema]: http://json-schema.org
[mongoose-schema]: http://mongoosejs.com
[bigquery-schema]: https://cloud.google.com/bigquery/
[clickhouse-schema]: https://clickhouse.yandex/
