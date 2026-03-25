# async-retry

Retrying made simple, easy, and async.

## Usage

```js
// Packages
const retry = require('async-retry');
const fetch = require('node-fetch');

await retry(
  async (bail) => {
    // if anything throws, we retry
    const res = await fetch('https://google.com');

    if (403 === res.status) {
      // don't retry upon 403
      bail(new Error('Unauthorized'));
      return;
    }

    const data = await res.text();
    return data.substr(0, 500);
  },
  {
    retries: 5,
  }
);
```

### API

```js
retry(retrier : Function, opts : Object) => Promise
```

- The supplied function can be `async` or not. In other words, it can be a function that returns a `Promise` or a value.
- The supplied function receives two parameters
  1. A `Function` you can invoke to abort the retrying (bail)
  2. A `Number` identifying the attempt. The absolute first attempt (before any retries) is `1`.
- The `opts` are passed to `node-retry`. Read [its docs](https://github.com/tim-kos/node-retry)
  - `retries`: The maximum amount of times to retry the operation. Default is `10`.
  - `factor`: The exponential factor to use. Default is `2`.
  - `minTimeout`: The number of milliseconds before starting the first retry. Default is `1000`.
  - `maxTimeout`: The maximum number of milliseconds between two retries. Default is `Infinity`.
  - `randomize`: Randomizes the timeouts by multiplying with a factor between `1` to `2`. Default is `true`.
  - `onRetry`: an optional `Function` that is invoked after a new retry is performed. It's passed the `Error` that triggered it as a parameter.

## Authors

- Guillermo Rauch ([@rauchg](https://twitter.com/rauchg)) - [Vercel](https://vercel.com)
- Leo Lamprecht ([@notquiteleo](https://twitter.com/notquiteleo)) - [Vercel](https://vercel.com)
