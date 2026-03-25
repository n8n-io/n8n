# 🔌 get-port-please

Get an available TCP port to listen

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![JSDocs][jsdocs-src]][jsdocs-href]

## Usage

Install package:

```bash
npm i get-port-please
```

```js
// ESM
import {
  getPort,
  checkPort,
  getRandomPort,
  waitForPort,
} from "get-port-please";

// CommonJS
const {
  getPort,
  checkPort,
  getRandomPort,
  waitForPort,
} = require("get-port-please");
```

```ts
getPort(options?: GetPortOptions): Promise<number>
checkPort(port: number, host?: string): Promise<number | false>
waitForPort(port: number, options): Promise<number | false>
```

Try sequence is: port > ports > random

## Options

```ts
interface GetPortOptions {
  name?: string;

  random?: boolean;
  port?: number;
  portRange?: [fromInclusive: number, toInclusive: number];
  ports?: number[];
  host?: string;

  memoDir?: string;
  memoName?: string;
}
```

### `name`

Unique name for port memorizing. Default is `default`.

### `random`

If enabled, `port` and `ports` will be ignored. Default is `false`.

### `port`

First port to check. Default is `process.env.PORT || 3000`

### `ports`

Extended ports to check.

### `portRange`

Extended port range to check.

The range's start and end are **inclusive**, i.e. it is `[start, end]` in the mathematical notion.
Reversed port ranges are not supported. If `start > end`, then an empty range will be returned.

### `alternativePortRange`

Alternative port range to check as fallback when none of the ports are available.

The range's start and end are **inclusive**, i.e. it is `[start, end]` in the mathematical notion.
Reversed port ranges are not supported. If `start > end`, then an empty range will be returned.

The default range is `[3000, 3100]` (only when `port` is unspecified).

### `host`

The host to check. Default is `process.env.HOST` otherwise all available hosts will be checked.

## License

MIT

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/get-port-please?style=flat&colorA=18181B&colorB=F0DB4F
[npm-version-href]: https://npmjs.com/package/get-port-please
[npm-downloads-src]: https://img.shields.io/npm/dm/get-port-please?style=flat&colorA=18181B&colorB=F0DB4F
[npm-downloads-href]: https://npmjs.com/package/get-port-please
[codecov-src]: https://img.shields.io/codecov/c/gh/unjs/get-port-please/main?style=flat&colorA=18181B&colorB=F0DB4F
[codecov-href]: https://codecov.io/gh/unjs/get-port-please
[license-src]: https://img.shields.io/github/license/unjs/get-port-please.svg?style=flat&colorA=18181B&colorB=F0DB4F
[license-href]: https://github.com/unjs/get-port-please/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsDocs.io-reference-18181B?style=flat&colorA=18181B&colorB=F0DB4F
[jsdocs-href]: https://www.jsdocs.io/package/get-port-please
