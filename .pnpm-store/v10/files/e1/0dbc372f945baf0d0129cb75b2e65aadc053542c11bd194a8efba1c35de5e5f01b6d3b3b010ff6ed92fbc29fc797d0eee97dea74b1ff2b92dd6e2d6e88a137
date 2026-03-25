import {promisify} from 'node:util';
import process from 'node:process';
import {execFile} from 'node:child_process';
import defaultBrowserId from 'default-browser-id';
import bundleName from 'bundle-name';
import windows from './windows.js';

export {_windowsBrowserProgIdMap} from './windows.js';

const execFileAsync = promisify(execFile);

// Inlined: https://github.com/sindresorhus/titleize/blob/main/index.js
const titleize = string => string.toLowerCase().replaceAll(/(?:^|\s|-)\S/g, x => x.toUpperCase());

export default async function defaultBrowser() {
	if (process.platform === 'darwin') {
		const id = await defaultBrowserId();
		const name = await bundleName(id);
		return {name, id};
	}

	if (process.platform === 'linux') {
		const {stdout} = await execFileAsync('xdg-mime', ['query', 'default', 'x-scheme-handler/http']);
		const id = stdout.trim();
		const name = titleize(id.replace(/.desktop$/, '').replace('-', ' '));
		return {name, id};
	}

	if (process.platform === 'win32') {
		return windows();
	}

	throw new Error('Only macOS, Linux, and Windows are supported');
}
