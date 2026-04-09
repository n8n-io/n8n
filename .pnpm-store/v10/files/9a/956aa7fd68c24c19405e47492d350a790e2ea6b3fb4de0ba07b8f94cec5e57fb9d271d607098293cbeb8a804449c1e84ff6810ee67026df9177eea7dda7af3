![get-port-please](https://user-images.githubusercontent.com/904724/101664848-9bc16380-3a4c-11eb-9e3a-faad60c86b2e.png)

# get-port-please

> Get an available TCP port to listen

[![npm](https://img.shields.io/npm/dt/get-port-please.svg?style=flat-square)](https://npmjs.com/package/get-port-please)
[![npm (scoped with tag)](https://img.shields.io/npm/v/get-port-please/latest.svg?style=flat-square)](https://npmjs.com/package/get-port-please)

## Usage

Install package:

```bash
yarn add get-port-please
# or
npm install get-port-please
```

```js
// ESM
import { getPort, checkPort, getRandomPort, waitForPort } from 'get-port-please'

// CommonJS
const { getPort, checkPort, getRandomPort, waitForPort } = require('get-port-please')
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
  name?: string

  random?: boolean
  port?: number
  portRange?: [from: number, to: number]
  ports?: number[]
  host?: string

  memoDir?: string
  memoName?: string
}
```

### `name`

Unique name for port memorizing. Default is `default`.

### `random`

If enabled, `port` and `ports` will be ignored. Default is `false`.

### `port`

First port to check. Default is `process.env.PORT || 3000`

### `ports`

Alternative ports to check.

### `portRange`

Alternative port range to check. Default is `[3000, 3100]`

### `host`

The host to check. Default is `process.env.HOST` otherwise all available hosts will be checked.

## License

MIT
