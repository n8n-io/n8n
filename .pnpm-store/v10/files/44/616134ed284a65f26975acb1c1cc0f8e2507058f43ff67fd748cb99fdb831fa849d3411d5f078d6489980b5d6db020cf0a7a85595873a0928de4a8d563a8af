# <img src="docs_app/src/assets/images/logos/Rx_Logo_S.png" alt="RxJS Logo" width="86" height="86"> RxJS: Reactive Extensions For JavaScript

![CI](https://github.com/reactivex/rxjs/workflows/CI/badge.svg)
[![npm version](https://badge.fury.io/js/rxjs.svg)](http://badge.fury.io/js/rxjs)
[![Join the chat at https://gitter.im/Reactive-Extensions/RxJS](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/Reactive-Extensions/RxJS?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# The Roadmap from RxJS 7 to 8

Curious what's next for RxJS? Follow along with [Issue 6367](https://github.com/ReactiveX/rxjs/issues/6367).

# RxJS 7

### FOR 6.X PLEASE GO TO [THE 6.x BRANCH](https://github.com/ReactiveX/rxjs/tree/6.x)

Reactive Extensions Library for JavaScript. This is a rewrite of [Reactive-Extensions/RxJS](https://github.com/Reactive-Extensions/RxJS) and is the latest production-ready version of RxJS. This rewrite is meant to have better performance, better modularity, better debuggable call stacks, while staying mostly backwards compatible, with some breaking changes that reduce the API surface.

[Apache 2.0 License](LICENSE.txt)

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Contribution Guidelines](CONTRIBUTING.md)
- [Maintainer Guidelines](docs_app/content/maintainer-guidelines.md)
- [API Documentation](https://rxjs.dev/)

## Versions In This Repository

- [master](https://github.com/ReactiveX/rxjs/commits/master) - This is all of the current work, which is against v7 of RxJS right now
- [6.x](https://github.com/ReactiveX/rxjs/tree/6.x) - This is the branch for version 6.X

Most PRs should be made to **master**.

## Important

By contributing or commenting on issues in this repository, whether you've read them or not, you're agreeing to the [Contributor Code of Conduct](CODE_OF_CONDUCT.md). Much like traffic laws, ignorance doesn't grant you immunity.

## Installation and Usage

### ES6 via npm

```shell
npm install rxjs
```

It's recommended to pull in the Observable creation methods you need directly from `'rxjs'` as shown below with `range`.
If you're using RxJS version 7.2 or above, you can pull in any operator you need from the same spot, `'rxjs'`.

```ts
import { range, filter, map } from 'rxjs';

range(1, 200)
  .pipe(
    filter(x => x % 2 === 1),
    map(x => x + x)
  )
  .subscribe(x => console.log(x));
```

If you're using RxJS version below 7.2, you can pull in any operator you need from one spot, under `'rxjs/operators'`.

```ts
import { range } from 'rxjs';
import { filter, map } from 'rxjs/operators';

range(1, 200)
  .pipe(
    filter(x => x % 2 === 1),
    map(x => x + x)
  )
  .subscribe(x => console.log(x));
```

### CDN

For CDN, you can use [unpkg](https://unpkg.com/):

[https://unpkg.com/rxjs@^7/dist/bundles/rxjs.umd.min.js](https://unpkg.com/rxjs@%5E7/dist/bundles/rxjs.umd.min.js)

The global namespace for rxjs is `rxjs`:

```js
const { range } = rxjs;
const { filter, map } = rxjs.operators;

range(1, 200)
  .pipe(
    filter(x => x % 2 === 1),
    map(x => x + x)
  )
  .subscribe(x => console.log(x));
```

## Goals

- Smaller overall bundles sizes
- Provide better performance than preceding versions of RxJS
- To model/follow the [Observable Spec Proposal](https://github.com/zenparsing/es-observable) to the observable
- Provide more modular file structure in a variety of formats
- Provide more debuggable call stacks than preceding versions of RxJS

## Building/Testing

- `npm run compile` build everything
- `npm test` run tests
- `npm run dtslint` run dtslint tests

## Adding documentation

We appreciate all contributions to the documentation of any type. All of the information needed to get the docs app up and running locally as well as how to contribute can be found in the [documentation directory](./docs_app).
