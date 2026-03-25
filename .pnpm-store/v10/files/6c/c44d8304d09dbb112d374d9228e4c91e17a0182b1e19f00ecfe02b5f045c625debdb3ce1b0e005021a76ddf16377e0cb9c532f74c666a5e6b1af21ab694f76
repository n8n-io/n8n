import {type ChildProcess} from 'node:child_process';

export type Options = {
	/**
	Wait for the opened app to exit before fulfilling the promise. If `false` it's fulfilled immediately when opening the app.

	Note that it waits for the app to exit, not just for the window to close.

	On Windows, you have to explicitly specify an app for it to be able to wait.

	@default false
	*/
	readonly wait?: boolean;

	/**
	__macOS only__

	Do not bring the app to the foreground.

	@default false
	*/
	readonly background?: boolean;

	/**
	__macOS only__

	Open a new instance of the app even it's already running.

	A new instance is always opened on other platforms.

	@default false
	*/
	readonly newInstance?: boolean;

	/**
	Specify the `name` of the app to open the `target` with, and optionally, app `arguments`. `app` can be an array of apps to try to open and `name` can be an array of app names to try. If each app fails, the last error will be thrown.

	The app name is platform dependent. Don't hard code it in reusable modules. For example, Chrome is `google chrome` on macOS, `google-chrome` on Linux and `chrome` on Windows. If possible, use `apps` which auto-detects the correct binary to use.

	You may also pass in the app's full path. For example on WSL, this can be `/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe` for the Windows installation of Chrome.

	The app `arguments` are app dependent. Check the app's documentation for what arguments it accepts.
	*/
	readonly app?: App | readonly App[];

	/**
	Allow the opened app to exit with nonzero exit code when the `wait` option is `true`.

	We do not recommend setting this option. The convention for success is exit code zero.

	@default false
	*/
	readonly allowNonzeroExitCode?: boolean;
};

export type OpenAppOptions = {
	/**
	Arguments passed to the app.

	These arguments are app dependent. Check the app's documentation for what arguments it accepts.
	*/
	readonly arguments?: readonly string[];
} & Omit<Options, 'app'>;

export type AppName =
	| 'chrome'
	| 'brave'
	| 'firefox'
	| 'edge'
	| 'browser'
	| 'browserPrivate';

export type App = {
	name: string | readonly string[];
	arguments?: readonly string[];
};

/**
An object containing auto-detected binary names for common apps. Useful to work around cross-platform differences.

@example
```
import open, {apps} from 'open';

await open('https://google.com', {
	app: {
		name: apps.chrome
	}
});
```
*/
export const apps: Record<AppName, string | readonly string[]>;

/**
Open stuff like URLs, files, executables. Cross-platform.

Uses the command `open` on macOS, `start` on Windows and `xdg-open` on other platforms.

There is a caveat for [double-quotes on Windows](https://github.com/sindresorhus/open#double-quotes-on-windows) where all double-quotes are stripped from the `target`.

@param target - The thing you want to open. Can be a URL, file, or executable. Opens in the default app for the file type. For example, URLs open in your default browser.
@returns The [spawned child process](https://nodejs.org/api/child_process.html#child_process_class_childprocess). You would normally not need to use this for anything, but it can be useful if you'd like to attach custom event listeners or perform other operations directly on the spawned process.

@example
```
import open, {apps} from 'open';

// Opens the image in the default image viewer.
await open('unicorn.png', {wait: true});
console.log('The image viewer app quit');

// Opens the URL in the default browser.
await open('https://sindresorhus.com');

// Opens the URL in a specified browser.
await open('https://sindresorhus.com', {app: {name: 'firefox'}});

// Specify app arguments.
await open('https://sindresorhus.com', {app: {name: 'google chrome', arguments: ['--incognito']}});

// Opens the URL in the default browser in incognito mode.
await open('https://sindresorhus.com', {app: {name: apps.browserPrivate}});
```
*/
export default function open(
	target: string,
	options?: Options
): Promise<ChildProcess>;

/**
Open an app. Cross-platform.

Uses the command `open` on macOS, `start` on Windows and `xdg-open` on other platforms.

@param name - The app you want to open. Can be either builtin supported `apps` names or other name supported in platform.
@returns The [spawned child process](https://nodejs.org/api/child_process.html#child_process_class_childprocess). You would normally not need to use this for anything, but it can be useful if you'd like to attach custom event listeners or perform other operations directly on the spawned process.

@example
```
import open, {openApp, apps} from 'open';

// Open Firefox.
await openApp(apps.firefox);

// Open Chrome in incognito mode.
await openApp(apps.chrome, {arguments: ['--incognito']});

// Open default browser.
await openApp(apps.browser);

// Open default browser in incognito mode.
await openApp(apps.browserPrivate);

// Open Xcode.
await openApp('xcode');
```
*/
export function openApp(name: App['name'], options?: OpenAppOptions): Promise<ChildProcess>;
