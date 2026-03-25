import {serialize} from 'node:v8';

// Validate the `ipcInput` option
export const validateIpcInputOption = ({ipcInput, ipc, serialization}) => {
	if (ipcInput === undefined) {
		return;
	}

	if (!ipc) {
		throw new Error('The `ipcInput` option cannot be set unless the `ipc` option is `true`.');
	}

	validateIpcInput[serialization](ipcInput);
};

const validateAdvancedInput = ipcInput => {
	try {
		serialize(ipcInput);
	} catch (error) {
		throw new Error('The `ipcInput` option is not serializable with a structured clone.', {cause: error});
	}
};

const validateJsonInput = ipcInput => {
	try {
		JSON.stringify(ipcInput);
	} catch (error) {
		throw new Error('The `ipcInput` option is not serializable with JSON.', {cause: error});
	}
};

const validateIpcInput = {
	advanced: validateAdvancedInput,
	json: validateJsonInput,
};

// When the `ipcInput` option is set, it is sent as an initial IPC message to the subprocess
export const sendIpcInput = async (subprocess, ipcInput) => {
	if (ipcInput === undefined) {
		return;
	}

	await subprocess.sendMessage(ipcInput);
};
