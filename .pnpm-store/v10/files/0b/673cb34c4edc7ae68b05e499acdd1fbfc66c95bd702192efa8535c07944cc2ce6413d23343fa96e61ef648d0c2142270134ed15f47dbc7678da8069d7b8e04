export type Browser = {
	/**
	Human-readadable name of the browser.
	*/
	name: string;

	/**
	The unique identifier for the browser on the current platform:
	- On macOS, it's the app's bundle identifier.
	- On Linux, it's the desktop file identifier (from `xdg-mime`).
	- On Windows, it's an invented identifier, because apps on Windows does not have identifiers.
	*/
	id: string;
};

/**
Get the default browser for the current platform.

@returns A promise for the browser.

@example
```
import defaultBrowser from 'default-browser';

console.log(await defaultBrowser());
//=> {name: 'Safari', id: 'com.apple.Safari'}
```
*/
export default function defaultBrowser(): Promise<Browser>;
