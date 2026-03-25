# `@actions/http-client`

A lightweight HTTP client optimized for building actions.

## Features

  - HTTP client with TypeScript generics and async/await/Promises
  - Typings included!
  - [Proxy support](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/about-self-hosted-runners#using-a-proxy-server-with-self-hosted-runners) just works with actions and the runner
  - Targets ES2019 (runner runs actions with node 12+).  Only supported on node 12+.
  - Basic, Bearer and PAT Support out of the box.  Extensible handlers for others.
  - Redirects supported

Features and releases [here](./RELEASES.md)

## Install

```
npm install @actions/http-client --save
```

## Samples

See the [tests](./__tests__) for detailed examples.

## Errors

### HTTP

The HTTP client does not throw unless truly exceptional.

* A request that successfully executes resulting in a 404, 500 etc... will return a response object with a status code and a body.
* Redirects (3xx) will be followed by default.

See the [tests](./__tests__) for detailed examples.

## Debugging

To enable detailed console logging of all HTTP requests and responses, set the NODE_DEBUG environment varible:

```shell
export NODE_DEBUG=http
```

## Node support

The http-client is built using the latest LTS version of Node 12. It may work on previous node LTS versions but it's tested and officially supported on Node12+.

## Support and Versioning

We follow semver and will hold compatibility between major versions and increment the minor version with new features and capabilities (while holding compat).

## Contributing

We welcome PRs.  Please create an issue and if applicable, a design before proceeding with code.

once:

```
npm install
```

To build:

```
npm run build
```

To run all tests:

```
npm test
```
