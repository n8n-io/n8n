# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).


## [3.3.2] - 2025-01-29
## Fixed
Json schema validation return, adds the error message
Fixes docker compose dependency

### Added

## [3.3.0] - 2022-10-04

### Added

- Support [schema references](https://docs.confluent.io/platform/current/schema-registry/serdes-develop/index.html#schema-references) for Avro, Protocol Buffer, and JSON schema [#197](https://github.com/kafkajs/confluent-schema-registry/pull/197)

### Fixed

- Fix Apicurio compatibility with register function [#201](https://github.com/kafkajs/confluent-schema-registry/pull/201)

## [3.2.1] - 2022-01-28

### Fixed

- Don't swallow error message from client-side errors from registry requests [#176](https://github.com/kafkajs/confluent-schema-registry/pull/176)

## [3.2.0] - 2021-11-22

### Added

- Add reader schema option when decoding Avro messages [#166](https://github.com/kafkajs/confluent-schema-registry/pull/166)

## [3.1.1] - 2021-11-03

### Fixed

- Support backwards incompatible changes in Ajv 8 when passing in Ajv instance in JSON Schema options [#163](https://github.com/kafkajs/confluent-schema-registry/pull/163)

## [3.1.0] - 2021-11-03

### Added

- Allow passing in Ajv instance in JSON Schema options [#133](https://github.com/kafkajs/confluent-schema-registry/pull/133)

### Fixed

- Fix backwards compatibility with older Schema Registry versions [#158](https://github.com/kafkajs/confluent-schema-registry/pull/158)

### Fixed

- Fix gateway config for when setting HTTP agent [#127](https://github.com/kafkajs/confluent-schema-registry/pull/127)

## [3.0.1] - 2021-06-11
### Fixed

- Fix gateway config for when setting HTTP agent [#127](https://github.com/kafkajs/confluent-schema-registry/pull/127)

## [3.0.0] - 2021-05-20

This version is non-breaking for the overwhelming majority of users.

When creating an instance of SchemaRegistry for Protobuf without the [`messageName`
parameter](https://kafkajs.github.io/confluent-schema-registry/docs/usage#protobuf-1)
confluent-schema-registry would, under certain circumstances, default
to the wrong message type in the schema. Specifically, instead of defaulting to
the first message type in the schema it would erroneously default to the first
message type that did not define a nested type.

**If you were relying on this behavior may need to either**:

* Start passing [the `messageName` parameter](https://kafkajs.github.io/confluent-schema-registry/docs/usage#protobuf-1) instead of relying on the default behavior
* Update your schemas and re-ingest messages accordingly

See issue [#112](https://github.com/kafkajs/confluent-schema-registry/issues/112) for
more info

### Added

- Allow setting HTTP agent [#108](https://github.com/kafkajs/confluent-schema-registry/pull/108)

### Fixed

- Fix default nested Protobuf type [#113](https://github.com/kafkajs/confluent-schema-registry/pull/113)

## [2.0.1] - 2021-04-02

- Fix export of SchemaType [#100](https://github.com/kafkajs/confluent-schema-registry/pull/100)

## [2.0.0] - 2021-02-28

This version adds support for Protobuf and JSON Schema, in addition to the already
supported Avro format!

See [Migrating to v2](https://kafkajs.github.io/confluent-schema-registry/docs/v2)
for information on how to adapt your application to the new API. For most users,
the change should be rather minor.

Big thanks to @dskatz22 and @Malkiz for their significant contributions!

### Added

- Support Protobuf and JSON Schema [#93](https://github.com/kafkajs/confluent-schema-registry/pull/93)

## [1.0.6] - 2020-07-02

### Added

- Support pre registered schemas by adding method `getRegistryIdBySchema` [#58](https://github.com/kafkajs/confluent-schema-registry/pull/58)

## [1.0.5] - 2020-03-18

### Added

- Prevent Unnecessary Requests on Cache Misses [#48](https://github.com/kafkajs/confluent-schema-registry/pull/48)

## [1.0.4] - 2020-03-07

### Added

- Support ForSchemaOption to call avro.Type.forSchema() [#47](https://github.com/kafkajs/confluent-schema-registry/pull/47)

## [1.0.3] - 2020-02-11

### Added

- Support sharing of types between protocols [#43](https://github.com/kafkajs/confluent-schema-registry/pull/43)

### Fixed

- Fix SchemaRegistry host port [#40](https://github.com/kafkajs/confluent-schema-registry/pull/40)
- Add string as possible type for subject version [#38](https://github.com/kafkajs/confluent-schema-registry/pull/38)

## [1.0.2] - 2019-11-28

### Added

- Allow for specifying subjects explicitly [#19](https://github.com/kafkajs/confluent-schema-registry/pull/19)

### Fixed

- Fix `@types/jest` issue [#29](https://github.com/kafkajs/confluent-schema-registry/pull/29)
- Fix `es-abstract` version issue [28](https://github.com/kafkajs/confluent-schema-registry/pull/28)

## [1.0.1] - 2019-10-25

### Added

- Added the schema compatibility remaining constants [#14](https://github.com/kafkajs/confluent-schema-registry/pull/14)
- Added method to fetch latest schema id by subject [#17](https://github.com/kafkajs/confluent-schema-registry/issues/17)
- Added method to get the schemaID based on subject [#18](https://github.com/kafkajs/confluent-schema-registry/pull/18)
- Support basic auth authentication [#21](https://github.com/kafkajs/confluent-schema-registry/pull/21)

## [1.0.0] - 2019-09-13

### Changed

- See `0.2.0` version

## [0.2.0] - 2019-09-13

### Changed

- Version `0.1.0` didn't transpile the Typescript files

## [0.1.0] - 2019-09-12

### Added

- Encode, decode and sync operations
