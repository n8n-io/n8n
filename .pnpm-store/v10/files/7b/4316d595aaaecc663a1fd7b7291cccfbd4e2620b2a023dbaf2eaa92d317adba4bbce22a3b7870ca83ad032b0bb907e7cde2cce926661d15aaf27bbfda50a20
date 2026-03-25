/**
Check if an error is a [Fetch network error](https://developer.mozilla.org/en-US/docs/Web/API/fetch#exceptions)

@return Returns `true` if the given value is a Fetch network error, otherwise `false`.

@example
```
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
*/
export default function isNetworkError(value: unknown): value is TypeError;
