# yaml-ast-parser

[![Build Status](https://travis-ci.org/mulesoft-labs/yaml-ast-parser.svg?branch=master)](https://travis-ci.org/mulesoft-labs/yaml-ast-parser)

This is a fork of JS-YAML which supports parsing of YAML into AST.

In additional to parsing YAML to AST, it has following features:

* restoration after the errors and reporting errors as a part of AST nodes.
* built-in support for `!include` tag used in RAML

## Usage
The type information below is relevant when using TypeScript, if using from JavaScript only the field/method information is relevant.

`load` method can be used to load the tree and returns a `YAMLNode`.

### YAMLNode
`YAMLNode` class is an ancestor for all node kinds.
It's `kind` field determine node kind, one of `Kind` enum:
  * `SCALAR`, `MAPPING`, `MAP`, `SEQ`, `ANCHOR_REF` or `INCLUDE_REF`.
 
After node kind is determined, it can be cast to one of the `YAMLNode` descendants types:
 * `YAMLScalar`, `YAMLMapping`, `YamlMap`, `YAMLSequence` or `YAMLAnchorReference`.

| class | important members |
|-------|-------------------|
| `YAMLNode` | `startPosition` and `endPosition` provide node range.|
| `YAMLScalar` | `string` `value` field |
| `YAMLMapping` |`YAMLScalar` `key` and `YAMLNode` `value` fields | 
| `YAMLSequence` | `YAMLNode[]` `items` field|
| `YamlMap` | `YAMLMapping[]` `mappings` field|
| `YAMLAnchorReference` | `string` `referencesAnchor` and `YAMLNode` `value`|

### YAMLScalar

Scalars are [one of the three main node types defined by YAML](http://www.yaml.org/spec/1.2/spec.html#scalar//) and are effectively leaf nodes.

There are many factors that can influence the type of datum represent in scalar node (context, schema, tag, etc.).

To help inspection of a `YAMLScalar` to determine its datatype when a document uses the [Core Schema](http://www.yaml.org/spec/1.2/spec.html#id2804923), you can pass the `YAMLScalar` to the `determineScalarType` function.  It will return an enum value indicating `null`, `bool`, `int`, `float`, or `string`.

Once you know the type, there are also some helper functions to help read the value by passing them the string, `value`: `parseYamlBoolean`, `parseYamlFloat`, and `parseYamlInteger`.