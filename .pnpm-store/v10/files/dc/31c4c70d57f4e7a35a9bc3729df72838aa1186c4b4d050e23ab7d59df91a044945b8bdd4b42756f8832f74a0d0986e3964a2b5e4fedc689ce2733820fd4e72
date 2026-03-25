[![Build Status](https://secure.travis-ci.org/tdegrunt/jsonschema.svg)](http://travis-ci.org/tdegrunt/jsonschema)

# jsonschema

[JSON schema](http://json-schema.org/) validator, which is designed to be fast and simple to use. JSON Schema versions through draft-07 are fully supported.

## Contributing & bugs

Please fork the repository, make the changes in your fork and include tests. Once you're done making changes, send in a pull request.

### Bug reports

Please include a test which shows why the code fails.

## Usage

### Simple

Simple object validation using JSON schemas.

```javascript
var Validator = require('jsonschema').Validator;
var v = new Validator();
var instance = 4;
var schema = {"type": "number"};
console.log(v.validate(instance, schema));
```

### Even simpler

```javascript
var validate = require('jsonschema').validate;
console.log(validate(4, {"type": "number"}));
```

### Complex example, with split schemas and references

```javascript
var Validator = require('jsonschema').Validator;
var v = new Validator();

// Address, to be embedded on Person
var addressSchema = {
  "id": "/SimpleAddress",
  "type": "object",
  "properties": {
    "lines": {
      "type": "array",
      "items": {"type": "string"}
    },
    "zip": {"type": "string"},
    "city": {"type": "string"},
    "country": {"type": "string"}
  },
  "required": ["country"]
};

// Person
var schema = {
  "id": "/SimplePerson",
  "type": "object",
  "properties": {
    "name": {"type": "string"},
    "address": {"$ref": "/SimpleAddress"},
    "votes": {"type": "integer", "minimum": 1}
  }
};

var p = {
  "name": "Barack Obama",
  "address": {
    "lines": [ "1600 Pennsylvania Avenue Northwest" ],
    "zip": "DC 20500",
    "city": "Washington",
    "country": "USA"
  },
  "votes": "lots"
};

v.addSchema(addressSchema, '/SimpleAddress');
console.log(v.validate(p, schema));
```
### Example for Array schema

```json
var arraySchema = {
        "type": "array",
        "items": {
            "properties": {
                "name": { "type": "string" },
                "lastname": { "type": "string" }
            },
            "required": ["name", "lastname"]
        }
    }
```
For a comprehensive, annotated example illustrating all possible validation options, see [examples/all.js](./examples/all.js)

## Features

### Definitions

All schema definitions are supported, $schema is ignored.

### Types

All types are supported

### Handling `undefined`

`undefined` is not a value known to JSON, and by default, the validator treats it as if it is not invalid. i.e., it will return valid.

```javascript
var res = validate(undefined, {type: 'string'});
res.valid // true
```

This behavior may be changed with the "required" option:

```javascript
var res = validate(undefined, {type: 'string'}, {required: true});
res.valid // false
```

### Formats

#### Disabling the format keyword.

You may disable format validation by providing `disableFormat: true` to the validator
options.

#### String Formats

All formats are supported, phone numbers are expected to follow the [E.123](http://en.wikipedia.org/wiki/E.123) standard.

#### Custom Formats

You may add your own custom format functions.  Format functions accept the input
being validated and return a boolean value.  If the returned value is `true`, then
validation succeeds.  If the returned value is `false`, then validation fails.

* Formats added to `Validator.prototype.customFormats` do not affect previously instantiated
Validators.  This is to prevent validator instances from being altered once created.
It is conceivable that multiple validators may be created to handle multiple schemas
with different formats in a program.
* Formats added to `validator.customFormats` affect only that Validator instance.

Here is an example that uses custom formats:

```javascript
Validator.prototype.customFormats.myFormat = function(input) {
  return input === 'myFormat';
};

var validator = new Validator();
validator.validate('myFormat', {type: 'string', format: 'myFormat'}).valid; // true
validator.validate('foo', {type: 'string', format: 'myFormat'}).valid; // false
```

### Results

By default, results will be returned in a `ValidatorResult` object with the following properties:

* `instance`: any.
* `schema`: Schema.
* `errors`: ValidationError[].
* `valid`: boolean.

Each item in `errors` is a `ValidationError` with the following properties:

* path: array. An array of property keys or array offsets, indicating where inside objects or arrays the instance was found.
* property: string. Describes the property path. Starts with `instance`, and is delimited with a dot (`.`).
* message: string. A human-readable message for debugging use. Provided in English and subject to change.
* schema: object. The schema containing the keyword that failed
* instance: any. The instance that failed
* name: string. The keyword within the schema that failed.
* argument: any. Provides information about the keyword that failed.

The validator can be configured to throw in the event of a validation error:

* If the `throwFirst` option is set, the validator will terminate validation at the first encountered error and throw a `ValidatorResultError` object.

* If the `throwAll` option is set, the validator will throw a `ValidatorResultError` object after the entire instance has been validated.

* If the `throwError` option is set, it will throw at the first encountered validation error (like `throwFirst`), but the `ValidationError` object itself will be thrown. Note that, despite the name, this does not inherit from Error like `ValidatorResultError` does.

The `ValidatorResultError` object has the same properties as `ValidatorResult` and additionally inherits from Error.

#### "nestedErrors" option

When `oneOf` or `anyOf` validations fail, errors that caused any of the sub-schemas referenced therein to fail are normally suppressed, because it is not necessary to fix all of them. And in the case of `oneOf`, it would itself be an error to fix all of the listed errors.

This behavior may be configured with `options.nestedErrors`. If truthy, it will emit all the errors from the subschemas. This option may be useful when troubleshooting validation errors in complex schemas:

```javascript
var schema = {
  oneOf: [
    { type: 'string', minLength: 32, maxLength: 32 },
    { type: 'string', maxLength: 16 },
    { type: 'number' },
  ]
};
var validator = new Validator();
var result = validator.validate('This string is 28 chars long', schema, {nestedErrors: true});

// result.toString() reads out:
// 0: instance does not meet minimum length of 32
// 1: instance does not meet maximum length of 16
// 2: instance is not of a type(s) number
// 3: instance is not exactly one from [subschema 0],[subschema 1],[subschema 2]
```

#### Localizing Error Messages

To provide localized, human-readable errors, use the `name` string as a translation key. Feel free to open an issue for support relating to localizing error messages. For example:

```
var localized = result.errors.map(function(err){
  return localeService.translate(err.name);
});
```

### Custom keywords

Specify your own JSON Schema keywords with the validator.attributes property:

```javascript
validator.attributes.contains = function validateContains(instance, schema, options, ctx) {
  if(typeof instance !== 'string') return;
  if(typeof schema.contains !== 'string') throw new jsonschema.SchemaError('"contains" expects a string', schema);
  if(instance.indexOf(schema.contains)<0){
    return 'does not contain the string ' + JSON.stringify(schema.contains);
  }
}
var result = validator.validate("I am an instance", { type:"string", contains: "I am" });
// result.valid === true;
```

The instance passes validation if the function returns nothing. A single validation error is produced
if the function returns a string. Any number of errors (maybe none at all) may be returned by passing a
`ValidatorResult` object, which may be used like so:

```javascript
  var result = new ValidatorResult(instance, schema, options, ctx);
  while(someErrorCondition()){
    result.addError('fails some validation test');
  }
  return result;
```

### Dereferencing schemas

Sometimes you may want to download schemas from remote sources, like a database, or over HTTP. When importing a schema,
unknown references are inserted into the `validator.unresolvedRefs` Array. Asynchronously shift elements off this array and import
them:

```javascript
var Validator = require('jsonschema').Validator;
var v = new Validator();
v.addSchema(initialSchema);
function importNextSchema(){
  var nextSchema = v.unresolvedRefs.shift();
  if(!nextSchema){ done(); return; }
  databaseGet(nextSchema, function(schema){
    v.addSchema(schema);
    importNextSchema();
  });
}
importNextSchema();
```

### Default base URI

Schemas should typically have an `id` with an absolute, full URI. However if the schema you are using contains only relative URI references, the `base` option will be used to resolve these.

This following example would throw a `SchemaError` if the `base` option were unset:

```javascript
var result = validate(["Name"], {
  id: "/schema.json",
  type: "array",
  items: { $ref: "http://example.com/schema.json#/definitions/item" },
  definitions: {
    item: { type: "string" },
  },
}, { base: 'http://example.com/' });
```

### Rewrite Hook

The `rewrite` option lets you change the value of an instance after it has successfully been validated. This will mutate the `instance` passed to the validate function. This can be useful for unmarshalling data and parsing it into native instances, such as changing a string to a `Date` instance.

The `rewrite` option accepts a function with the following arguments:

* instance: any
* schema: object
* options: object
* ctx: object
* return value: any new value for the instance

The value may be removed by returning `undefined`.
If you don't want to change the value, call `return instance`.

Here is an example that can convert a property expecting a date into a Date instance:

```javascript
const schema = {
  properties: {
    date: {id: 'http://example.com/date', type: 'string'},
  },
};

const value = {
  date: '2020-09-30T23:39:27.060Z',
};

function unmarshall(instance, schema){
  if(schema.id === 'http://example.com/date'){
    return new Date(instance);
  }
  return instance;
}

const v = new Validator();
const res = v.validate(value, schema, {rewrite: unmarshall});

assert(res.instance.date instanceof Date);
```


### Pre-Property Validation Hook

If some processing of properties is required prior to validation a function may be passed via the options parameter of the validate function. For example, say you needed to perform type coercion for some properties:

```javascript
// See examples/coercion.js
function preValidateProperty(object, key, schema, options, ctx) {
  var value = object[key];
  if (typeof value === 'undefined') return;

  // Test if the schema declares a type, but the type keyword fails validation
  if (schema.type && validator.attributes.type.call(validator, value, schema, options, ctx.makeChild(schema, key))) {
    // If the type is "number" but the instance is not a number, cast it
    if(schema.type==='number' && typeof value!=='number'){
      object[key] = parseFloat(value);
      return;
    }
    // If the type is "string" but the instance is not a string, cast it
    if(schema.type==='string' && typeof value!=='string'){
      object[key] = String(value).toString();
      return;
    }
  }
};

// And now, to actually perform validation with the coercion hook!
v.validate(instance, schema, { preValidateProperty });
```

### Skip validation of certain keywords

Use the "skipAttributes" option to skip validation of certain keywords. Provide an array of keywords to ignore.

For skipping the "format" keyword, see the disableFormat option.

### Fail on unknown keywords

By default, JSON Schema is supposed to ignore unknown schema keywords.

You can change this behavior to require that all keywords used in a schema have a defined behavior, by using setting the "allowUnknownAttributes" option to false.

This example will throw a `SchemaError`:

```javascript
var schema = {
  type: "string",
  format: "email",
  example: "foo",
};
var result = validate("Name", schema, { allowUnknownAttributes: false });
```

## Tests

Uses [JSON Schema Test Suite](https://github.com/json-schema/JSON-Schema-Test-Suite) as well as our own tests.
You'll need to update and init the git submodules:

    git submodule update --init
    npm test

## Contributions

This library would not be possible without the valuable contributions by:

- Austin Wright

... and many others!

## License

    jsonschema is licensed under MIT license.

    Copyright (C) 2012-2019 Tom de Grunt <tom@degrunt.nl>

    Permission is hereby granted, free of charge, to any person obtaining a copy of
    this software and associated documentation files (the "Software"), to deal in
    the Software without restriction, including without limitation the rights to
    use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
    of the Software, and to permit persons to whom the Software is furnished to do
    so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
