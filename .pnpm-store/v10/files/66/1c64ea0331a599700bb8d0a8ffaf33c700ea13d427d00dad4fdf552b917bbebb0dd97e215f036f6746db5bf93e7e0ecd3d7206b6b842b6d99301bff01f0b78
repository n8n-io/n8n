import process from 'node:process';
import {promisify} from 'node:util';
import {execFile, execFileSync} from 'node:child_process';

const execFileAsync = promisify(execFile);

export async function runAppleScript(script, {humanReadableOutput = true, signal} = {}) {
	if (process.platform !== 'darwin') {
		throw new Error('macOS only');
	}

	const outputArguments = humanReadableOutput ? [] : ['-ss'];

	const execOptions = {};
	if (signal) {
		execOptions.signal = signal;
	}

	const {stdout} = await execFileAsync('osascript', ['-e', script, outputArguments], execOptions);
	return stdout.trim();
}

export function runAppleScriptSync(script, {humanReadableOutput = true} = {}) {
	if (process.platform !== 'darwin') {
		throw new Error('macOS only');
	}

	const outputArguments = humanReadableOutput ? [] : ['-ss'];

	const stdout = execFileSync('osascript', ['-e', script, ...outputArguments], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'ignore'],
		timeout: 500,
	});

	return stdout.trim();
}
