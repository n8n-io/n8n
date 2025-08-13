// @ts-nocheck

// https://github.com/yjs/y-websocket-server/blob/main/src/callback.js
import http from 'http';
import * as number from 'lib0/number';

const CALLBACK_URL = process.env.CALLBACK_URL ? new URL(process.env.CALLBACK_URL) : null;
const CALLBACK_TIMEOUT = number.parseInt(process.env.CALLBACK_TIMEOUT || '5000');
const CALLBACK_OBJECTS: Record<string, string> = process.env.CALLBACK_OBJECTS
	? JSON.parse(process.env.CALLBACK_OBJECTS)
	: {};

export const isCallbackSet = !!CALLBACK_URL;

/**
 * @param doc The WSSharedDoc instance
 */
export const callbackHandler = (doc: any) => {
	const room = doc.name;
	const dataToSend = {
		room,
		data: {},
	};
	const sharedObjectList = Object.keys(CALLBACK_OBJECTS);
	sharedObjectList.forEach((sharedObjectName) => {
		const sharedObjectType = CALLBACK_OBJECTS[sharedObjectName];
		dataToSend.data[sharedObjectName] = {
			type: sharedObjectType,
			content: getContent(sharedObjectName, sharedObjectType, doc).toJSON(),
		};
	});
	CALLBACK_URL && callbackRequest(CALLBACK_URL, CALLBACK_TIMEOUT, dataToSend);
};

/**
 * @param url The callback URL
 * @param timeout Request timeout
 * @param data Data to send
 */
const callbackRequest = (url: URL, timeout: number, data: any) => {
	data = JSON.stringify(data);
	const options = {
		hostname: url.hostname,
		port: url.port,
		path: url.pathname,
		timeout,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(data),
		},
	};
	const req = http.request(options);
	req.on('timeout', () => {
		console.warn('Callback request timed out.');
		req.abort();
	});
	req.on('error', (e) => {
		console.error('Callback request error.', e);
		req.abort();
	});
	req.write(data);
	req.end();
};

/**
 * @param objName Object name
 * @param objType Object type
 * @param doc WSSharedDoc instance
 */
const getContent = (objName: string, objType: string, doc: any) => {
	switch (objType) {
		case 'Array':
			return doc.getArray(objName);
		case 'Map':
			return doc.getMap(objName);
		case 'Text':
			return doc.getText(objName);
		case 'XmlFragment':
			return doc.getXmlFragment(objName);
		case 'XmlElement':
			return doc.getXmlElement(objName);
		default:
			return {};
	}
};
