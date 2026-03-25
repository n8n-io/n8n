import {promisify} from 'node:util';
import process from 'node:process';
import {execFile} from 'node:child_process';

const execFileAsync = promisify(execFile);

export default async function defaultBrowserId() {
	if (process.platform !== 'darwin') {
		throw new Error('macOS only');
	}

	const {stdout} = await execFileAsync('defaults', ['read', 'com.apple.LaunchServices/com.apple.launchservices.secure', 'LSHandlers']);

	// `(?!-)` is to prevent matching `LSHandlerRoleAll = "-";`.
	const match = /LSHandlerRoleAll = "(?!-)(?<id>[^"]+?)";\s+?LSHandlerURLScheme = (?:http|https);/.exec(stdout);

	const browserId = match?.groups.id ?? 'com.apple.Safari';

	// Correct the case for Safari's bundle identifier
	if (browserId === 'com.apple.safari') {
		return 'com.apple.Safari';
	}

	return browserId;
}
