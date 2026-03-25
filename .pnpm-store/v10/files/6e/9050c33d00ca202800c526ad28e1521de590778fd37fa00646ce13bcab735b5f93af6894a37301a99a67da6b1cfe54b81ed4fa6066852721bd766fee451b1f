'use strict'

const knownKeywords = [
  ...['$schema', '$vocabulary'], // version
  ...['id', '$id', '$anchor', '$ref', 'definitions', '$defs'], // pointers
  ...['$recursiveRef', '$recursiveAnchor', '$dynamicAnchor', '$dynamicRef'],
  ...['type', 'required', 'default'], // generic
  ...['enum', 'const'], // constant values
  ...['not', 'allOf', 'anyOf', 'oneOf', 'if', 'then', 'else'], // logical checks
  ...['maximum', 'minimum', 'exclusiveMaximum', 'exclusiveMinimum', 'multipleOf', 'divisibleBy'], // numbers
  ...['items', 'maxItems', 'minItems', 'additionalItems', 'prefixItems'], // arrays, basic
  ...['contains', 'minContains', 'maxContains', 'uniqueItems'], // arrays, complex
  ...['maxLength', 'minLength', 'format', 'pattern'], // strings
  ...['contentEncoding', 'contentMediaType', 'contentSchema'], // strings content
  ...['properties', 'maxProperties', 'minProperties', 'additionalProperties', 'patternProperties'], // objects
  ...['propertyNames'], // objects
  ...['dependencies', 'dependentRequired', 'dependentSchemas', 'propertyDependencies'], // objects (dependencies)
  ...['unevaluatedProperties', 'unevaluatedItems'], // see-through
  // Unused meta keywords not affecting validation (annotations and comments)
  // https://json-schema.org/understanding-json-schema/reference/generic.html
  // https://json-schema.org/draft/2019-09/json-schema-validation.html#rfc.section.9
  ...['title', 'description', 'deprecated', 'readOnly', 'writeOnly', 'examples', '$comment'], // unused meta
  ...['example'], // unused meta, OpenAPI
  'discriminator', // optimization hint and error filtering only, does not affect validation result
  'removeAdditional', // optional keyword for { removeAdditional: 'keyword' } config, to target specific objects
]

// Order is important, newer first!
const schemaDrafts = [
  ...['draft/next'], // not recommended to use, might change / break in an unexpected way
  ...['draft/2020-12', 'draft/2019-09'], // new
  ...['draft-07', 'draft-06', 'draft-04', 'draft-03'], // historic
]
const schemaVersions = schemaDrafts.map((draft) => `https://json-schema.org/${draft}/schema`)

const vocab2019 = ['core', 'applicator', 'validation', 'meta-data', 'format', 'content']
const vocab2020 = [
  ...['core', 'applicator', 'unevaluated', 'validation'],
  ...['meta-data', 'format-annotation', 'format-assertion', 'content'],
]
const knownVocabularies = [
  ...vocab2019.map((v) => `https://json-schema.org/draft/2019-09/vocab/${v}`),
  ...vocab2020.map((v) => `https://json-schema.org/draft/2020-12/vocab/${v}`),
]

module.exports = { knownKeywords, schemaVersions, knownVocabularies }
