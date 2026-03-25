[npm-image]: https://img.shields.io/npm/v/mysql2.svg
[npm-url]: https://npmjs.com/package/mysql2
[node-version-image]: https://img.shields.io/node/v/mysql2.svg
[node-version-url]: https://nodejs.org/en/download
[downloads-image]: https://img.shields.io/npm/dm/mysql2.svg
[downloads-url]: https://npmjs.com/package/mysql2
[license-url]: https://github.com/sidorares/node-mysql2/blob/master/License
[license-image]: https://img.shields.io/npm/l/mysql2.svg?maxAge=2592000
[node-mysql]: https://github.com/mysqljs/mysql
[mysqljs]: https://github.com/mysqljs
[mysql-native]: https://github.com/sidorares/nodejs-mysql-native
[sidorares]: https://github.com/sidorares
[TooTallNate]: https://gist.github.com/TooTallNate
[starttls.js]: https://gist.github.com/TooTallNate/848444
[node-mariasql]: https://github.com/mscdex/node-mariasql
[contributors]: https://github.com/sidorares/node-mysql2/graphs/contributors
[contributing]: https://github.com/sidorares/node-mysql2/blob/master/Contributing.md
[docs-base]: https://sidorares.github.io/node-mysql2/docs
[docs-base-zh-CN]: https://sidorares.github.io/node-mysql2/zh-CN/docs
[docs-base-pt-BR]: https://sidorares.github.io/node-mysql2/pt-BR/docs
[docs-prepared-statements]: https://sidorares.github.io/node-mysql2/docs/documentation/prepared-statements
[docs-mysql-server]: https://sidorares.github.io/node-mysql2/docs/documentation/mysql-server
[docs-promise-wrapper]: https://sidorares.github.io/node-mysql2/docs/documentation/promise-wrapper
[docs-authentication-switch]: https://sidorares.github.io/node-mysql2/docs/documentation/authentication-switch
[docs-streams]: https://sidorares.github.io/node-mysql2/docs/documentation/extras
[docs-typescript-docs]: https://sidorares.github.io/node-mysql2/docs/documentation/typescript-examples
[docs-qs-pooling]: https://sidorares.github.io/node-mysql2/docs#using-connection-pools
[docs-qs-first-query]: https://sidorares.github.io/node-mysql2/docs#first-query
[docs-qs-using-prepared-statements]: https://sidorares.github.io/node-mysql2/docs#using-prepared-statements
[docs-examples]: https://sidorares.github.io/node-mysql2/docs/examples
[docs-faq]: https://sidorares.github.io/node-mysql2/docs/faq
[docs-documentation]: https://sidorares.github.io/node-mysql2/docs/documentation
[docs-contributing]: https://sidorares.github.io/node-mysql2/docs/contributing/website
[coverage]: https://img.shields.io/codecov/c/github/sidorares/node-mysql2
[coverage-url]: https://app.codecov.io/github/sidorares/node-mysql2
[ci-url]: https://github.com/sidorares/node-mysql2/actions/workflows/ci-coverage.yml?query=branch%3Amaster
[ci-image]: https://img.shields.io/github/actions/workflow/status/sidorares/node-mysql2/ci-coverage.yml?event=push&style=flat&label=CI&branch=master

# MySQL2

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Node.js Version][node-version-image]][node-version-url]
[![GitHub Workflow Status (with event)][ci-image]][ci-url]
[![Codecov][coverage]][coverage-url]
[![License][license-image]][license-url]

[English][docs-base] | [简体中文][docs-base-zh-CN] | [Português (BR)][docs-base-pt-BR]

> MySQL client for Node.js with focus on performance. Supports prepared statements, non-utf8 encodings, binary log protocol, compression, ssl [much more][docs-documentation].

**Table of Contents**

- [History and Why MySQL2](#history-and-why-mysql2)
- [Installation](#installation)
- [Documentation](#documentation)
- [Acknowledgements](#acknowledgements)
- [Contributing](#contributing)

## History and Why MySQL2

MySQL2 project is a continuation of [MySQL-Native][mysql-native]. Protocol parser code was rewritten from scratch and api changed to match popular [Node MySQL][node-mysql]. MySQL2 team is working together with [Node MySQL][node-mysql] team to factor out shared code and move it under [mysqljs][mysqljs] organization.

MySQL2 is mostly API compatible with [Node MySQL][node-mysql] and supports majority of features. MySQL2 also offers these additional features:

- Faster / Better Performance
- [Prepared Statements][docs-prepared-statements]
- MySQL Binary Log Protocol
- [MySQL Server][docs-mysql-server]
- Extended support for Encoding and Collation
- [Promise Wrapper][docs-promise-wrapper]
- Compression
- SSL and [Authentication Switch][docs-authentication-switch]
- [Custom Streams][docs-streams]
- [Pooling][docs-qs-pooling]

## Installation

MySQL2 is free from native bindings and can be installed on Linux, Mac OS or Windows without any issues.

```bash
npm install --save mysql2
```

If you are using TypeScript, you will need to install `@types/node`.

```bash
npm install --save-dev @types/node
```

> For TypeScript documentation and examples, see [here][docs-typescript-docs].

## Documentation

- [Quickstart][docs-base]
  - [First Query][docs-qs-first-query], [Using Prepared Statements][docs-qs-using-prepared-statements], [Using Connection Pools][docs-qs-pooling] and more.
- [Documentation][docs-documentation]
- [Examples][docs-examples]
- [FAQ][docs-faq]

## Acknowledgements

- Internal protocol is written by [@sidorares][sidorares] [MySQL-Native][mysql-native].
- Constants, SQL parameters interpolation, Pooling, `ConnectionConfig` class taken from [Node MySQL][node-mysql].
- SSL upgrade code based on [@TooTallNate][TooTallNate] [code][starttls.js].
- Secure connection / compressed connection api flags compatible to [MariaSQL][node-mariasql] client.
- [Contributors][contributors].

## Contributing

Want to improve something in **MySQL2**?
Please check [Contributing.md][contributing] for detailed instruction on how to get started.

To contribute in **MySQL2 Documentation**, please visit the [Website Contributing Guidelines][docs-contributing] for detailed instruction on how to get started.
