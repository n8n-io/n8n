import {OptionsWithUri} from 'request';

import {
	IExecuteFunctions,
	IExecuteSingleFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-core';

import {v4 as uuid} from 'uuid';

import {IDataObject, NodeApiError,} from 'n8n-workflow';

const TRACE_LINE_REGEXPs = [
	/    at (?<raw_function>.*) \((?<abs_path>.*):(?<lineno>[0-9]+):(?<colno>[0-9]+)\)/,
	/    at (?<abs_path>.*):(?<lineno>[0-9]+):(?<colno>[0-9]+)/
];

export async function sentryIoErrorApiRequest(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	uri: string, method: string, body: any = {}, qs: IDataObject = {}, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any

	const options: OptionsWithUri = {
		headers: {},
		method,
		qs,
		body,
		uri: uri,
		json: true,
	};
	if (!Object.keys(body).length) {
		delete options.body;
	}

	if (Object.keys(option).length !== 0) {
		Object.assign(options, option);
	}

	let credentialName;
	const credentials = await this.getCredentials('sentryErrorApi') as IDataObject;
	options.headers = {
		"X-Sentry-Auth": buildXauthHeaderValue(credentials),
	};

	try {
		//@ts-ignore
		return this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}

function buildXauthHeaderValue(credentials: IDataObject) {
	const timestamp = Date.now().valueOf();
	return `Sentry sentry_version=7,sentry_timestamp=${timestamp},sentry_key=${credentials.sentry_key},sentry_client=sentry-javascript/1.0`;
}


export async function reportToSentry(
	this: IHookFunctions | IExecuteFunctions | IExecuteSingleFunctions | ILoadOptionsFunctions | IWebhookFunctions,
	errorInfo: IDataObject): Promise<IDataObject> {
	const errorPaylaod = convertToErrorPayload(errorInfo);
	const credentials = await this.getCredentials('sentryErrorApi') as IDataObject;
	const endpoint = `${credentials.url}/api/${credentials.project_id}/store/`;
	return sentryIoErrorApiRequest.call(this, endpoint, 'POST', errorPaylaod);
}


function guessErrorType(errorStack: string) {
	const tokens = errorStack.split(":", 1);
	return (tokens.length) ? tokens[0] : "UnknownError";
}


export function parseStacktraceLine(traceLine: string) {
	let groups;
	for (const regex of TRACE_LINE_REGEXPs) {
		groups = traceLine.match(regex);
		if (groups) {
			break;
		}
	}

	if (groups === null) {
		return {};
	}
	// @ts-ignore
	const result = groups.groups as IDataObject;
	result.colno = parseInt(result.colno as string);
	result.lineno = parseInt(result.lineno as string);
	if (result.raw_function) {
		result.raw_function = (result.raw_function as string).trim();
		result.function = result.raw_function;
	}
	return result;
}

export function extractStacktrace(errorInfo: IDataObject) {
	const stackString = errorInfo.stack as string;
	const traceLines = stackString.split('\n');
	const frames: IDataObject[] = [];
	traceLines.map((line, index) => {
		if (index === 0) {
			return;
		}
		// @ts-ignore
		frames.unshift(parseStacktraceLine(line));
	});
	return {frames};
}

function convertToErrorPayload(errorInfo: IDataObject) {
	// @ts-ignore
	const errorType = guessErrorType(errorInfo.execution.error.stack || '');
	// @ts-ignore
	const workflowName: string = errorInfo.workflow.name as string;
	// @ts-ignore
	const faultyNodeName: string = errorInfo.execution.lastNodeExecuted as string;
	// @ts-ignore
	const errorMessage = errorInfo.execution.error.message as string || '';
	let result = {
		event_id: uuid(),
		platform: "node",
		transaction: `${workflowName}/${faultyNodeName}`,
		culprit: `${faultyNodeName}:${workflowName}`,
		timestamp: (new Date()).toISOString(),
		message: errorMessage,
		level: "error",
		exception: {
			values: [{
				value: errorMessage,
				type: errorType,
				workflow: workflowName,
				module: faultyNodeName,// @ts-ignore
				stacktrace: extractStacktrace(errorInfo.execution.error),
			}]
		},
	};
	return result;
}
