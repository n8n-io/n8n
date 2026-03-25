import {once, on} from 'node:events';
import {
	validateIpcMethod,
	throwOnEarlyDisconnect,
	disconnect,
	getStrictResponseError,
} from './validation.js';
import {getIpcEmitter, isConnected} from './forward.js';
import {addReference, removeReference} from './reference.js';

// Like `[sub]process.once('message')` but promise-based
export const getOneMessage = ({anyProcess, channel, isSubprocess, ipc}, {reference = true, filter} = {}) => {
	validateIpcMethod({
		methodName: 'getOneMessage',
		isSubprocess,
		ipc,
		isConnected: isConnected(anyProcess),
	});

	return getOneMessageAsync({
		anyProcess,
		channel,
		isSubprocess,
		filter,
		reference,
	});
};

const getOneMessageAsync = async ({anyProcess, channel, isSubprocess, filter, reference}) => {
	addReference(channel, reference);
	const ipcEmitter = getIpcEmitter(anyProcess, channel, isSubprocess);
	const controller = new AbortController();
	try {
		return await Promise.race([
			getMessage(ipcEmitter, filter, controller),
			throwOnDisconnect(ipcEmitter, isSubprocess, controller),
			throwOnStrictError(ipcEmitter, isSubprocess, controller),
		]);
	} catch (error) {
		disconnect(anyProcess);
		throw error;
	} finally {
		controller.abort();
		removeReference(channel, reference);
	}
};

const getMessage = async (ipcEmitter, filter, {signal}) => {
	if (filter === undefined) {
		const [message] = await once(ipcEmitter, 'message', {signal});
		return message;
	}

	for await (const [message] of on(ipcEmitter, 'message', {signal})) {
		if (filter(message)) {
			return message;
		}
	}
};

const throwOnDisconnect = async (ipcEmitter, isSubprocess, {signal}) => {
	await once(ipcEmitter, 'disconnect', {signal});
	throwOnEarlyDisconnect(isSubprocess);
};

const throwOnStrictError = async (ipcEmitter, isSubprocess, {signal}) => {
	const [error] = await once(ipcEmitter, 'strict:error', {signal});
	throw getStrictResponseError(error, isSubprocess);
};
