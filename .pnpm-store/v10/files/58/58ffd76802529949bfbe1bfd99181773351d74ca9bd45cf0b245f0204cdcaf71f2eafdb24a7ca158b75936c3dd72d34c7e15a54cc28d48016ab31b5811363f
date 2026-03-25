# Promise-Queue

Promise queue with a nice API.

### Installation

```
npm install --save sb-promise-queue
```

## API

```js
interface Options {
  concurrency?: number
}

class PromiseQueue {
  constructor(options: Options = {concurrency: 1});

  clear()
  onIdle(callback: Function): Function
  // call the return value function to remove listener
  waitTillIdle(): Promise<void>
  add(callback: Function)
}

export { PromiseQueue }
```

## License

The contents of this repository/package are licensed under the terms of The MIT License. See the LICENSE file for more info.
