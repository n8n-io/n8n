# is-network-error

> Check if a value is a [Fetch network error](https://developer.mozilla.org/en-US/docs/Web/API/fetch#exceptions)

This can be useful when you want to do something specific when a network error happens without catching other Fetch-related errors.

Unfortunately, Fetch network errors are [not standardized](https://github.com/whatwg/fetch/issues/526) and differ among implementations. This package handles the differences across Node.js, Bun, Deno, and browsers.

For instance, [`p-retry`](https://github.com/sindresorhus/p-retry) uses this package to retry on network errors.

## Install

```sh
npm install is-network-error
```

## Usage

```js
import isNetworkError from 'is-network-error';

async function getUnicorns() {
	try {
		const response = await fetch('unicorns.json');
		return await response.json();
	} catch (error) {
		if (isNetworkError(error)) {
			return localStorage.getItem('…');
		}

		throw error;
	}
}

console.log(await getUnicorns());
```

## API

### `isNetworkError(value: unknown): value is TypeError`

Returns `true` if the given value is a Fetch network error, otherwise `false`.

This function acts as a type guard, narrowing the type to `TypeError` when it returns `true`.
