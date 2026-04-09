import process from 'node:process';
import os from 'node:os';
import fs from 'node:fs';
import isInsideContainer from 'is-inside-container';

const isWsl = () => {
	if (process.platform !== 'linux') {
		return false;
	}

	if (os.release().toLowerCase().includes('microsoft')) {
		if (isInsideContainer()) {
			return false;
		}

		return true;
	}

	try {
		if (fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft')) {
			return !isInsideContainer();
		}
	} catch {}

	// Fallback for custom kernels: check WSL-specific paths.
	if (
		fs.existsSync('/proc/sys/fs/binfmt_misc/WSLInterop')
		|| fs.existsSync('/run/WSL')
	) {
		return !isInsideContainer();
	}

	return false;
};

export default process.env.__IS_WSL_TEST__ ? isWsl : isWsl();
