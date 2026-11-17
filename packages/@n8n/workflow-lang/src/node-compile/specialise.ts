import ts from 'typescript';

import { CODE_HELPERS } from '../convert/code-native/helpers.ts';
import { RUNS_IN_HOST } from '../convert/helpers.ts';
import { translateCode } from '../convert/code-native/translate.ts';
import { MAX_CREDENTIAL_FLAGS } from '../credentials/flags.ts';
import { MIME_TABLE } from '../generated/mime-table.generated.ts';
import { commonJsToModule, isCommonJs } from './commonjs.ts';
import {
	COST_GLOBALS,
	COST_HELPERS,
	OUT_FAILED,
	OUT_PAIRED,
	foldTextMethod,
	literalKeyCount,
	lowerConstants,
	namesOutsideRequest,
	lowerCost,
	PLAIN_LIST,
	PLAIN_LIST_COLLECTIONS,
	PLAIN_LIST_SAME,
	reachableHelpers,
} from './lower-cost.ts';
import {
	bindMoment,
	MOMENT_HELPER_USES,
	MOMENT_HELPERS,
	MOMENT_PACKAGE,
	momentZoneUse,
} from './moment.ts';

export interface SpecialiseInput {
	type: string;
	version: number;

	entry: string;
	readFile: (path: string) => string | undefined;

	parameters: Record<string, unknown>;

	defaults?: Record<string, unknown>;
	continueOnFail?: boolean;

	instanceId?: string | null;

	credentialFields?: Record<string, Record<string, unknown>>;

	moduleType?: string;

	evaluate?: (code: string) => unknown;

	credentialEntry?: (type: string) => string | undefined;

	timezone?: string;

	aliases?: Record<string, string>;

	parameterKind?: (name: string) => ParameterKind | undefined;

	facts?: PublishFacts;

	deferredParameters?: string[];

	pairedOutput?: boolean;
}

export interface PublishFacts {
	workflow?: { id?: string; name?: string; active?: boolean };
	instanceBaseUrl?: string;
}

export type RandomShape =
	| { kind: 'uuid' }
	| { kind: 'number' }
	| { kind: 'integer'; min?: number; max?: number };

export interface ParameterKind {
	type: string;
	extract: boolean;
	modes?: Record<string, { pattern: string; flags: string } | null>;
}

export interface UnitOrigin {
	unit: string;
	file: string;
	declared: string;
	owner?: string;
}

export interface SpecialiseResult {
	source?: string;
	errors: string[];

	origins?: UnitOrigin[];

	notes: string[];

	linked: string[];

	derivations?: CredentialDerivation[];

	mints?: CredentialMint[];

	randoms?: RandomShape[];
	binary?: boolean;

	storesResponses?: boolean;

	marksFileLimit?: boolean;

	retyped?: (moduleType: string) => string;

	zones?: string[];

	itemParameters?: string[];

	firstItemParameters?: string[];
}

export interface CredentialDerivation {
	name: string;
	code: string;
	kind?: 'flag' | 'guard';
	flags?: string[];
	allowed?: string[];
	node?: string;
}

export interface CredentialMint {
	name: string;
	kind: 'google-service-account';
	service: string;
	scopes: string[];
}

const MINT_GOOGLE = '__MINT_GOOGLE';
const LATER_AUTHENTICATE = '__AUTHENTICATE';
const GOOGLE_TOKEN_FUNCTION = 'getGoogleAccessToken';
const GOOGLE_TOKEN_FILE = '/nodes/Google/GenericFunctions.ts';
const MAX_MINTS = 16;
const SESSION_MARKER = '__SESSION';
const isSessionMarker = (e: ts.Node): e is ts.CallExpression =>
	ts.isCallExpression(e) &&
	ts.isIdentifier(e.expression) &&
	e.expression.text === SESSION_MARKER &&
	e.arguments.length === 1;
const isMintCall = (e: ts.Node): e is ts.CallExpression =>
	ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === MINT_GOOGLE;

const f = ts.factory;

const REQUEST_SOURCE = `async function __request(options, wrapped, legacy) {
	const auth = options.auth;
	const headers = __assign({}, __plain(options.headers ?? {}));
	const parts = legacy ? __formParts(options, headers) : undefined;
	const form = parts === undefined ? options.form : undefined;
	const bytes = legacy ? options.encoding === null : options.encoding === 'arraybuffer';
	if (form !== undefined && form !== null) headers['content-type'] = 'application/x-www-form-urlencoded';
	const response = await ctx.http({
		method: options.method ?? 'GET',
		url: options.uri ?? options.url,
		headers,
		qs: __plain(options.qs ?? {}),
		body: parts !== undefined ? undefined : form !== undefined && form !== null ? __form(__plain(form)) : __plain(__sendBody(options.body)),
		multipart: parts,
		acceptAs: legacy ? 'legacy' : 'request',
		json: options.json,
		responseBinary: bytes ? {} : undefined,
		basicAuth: auth ? { user: auth.user ?? auth.username ?? '', password: auth.pass ?? auth.password ?? '' } : undefined,
		inject: wrapped,
		credential,
	});
	if (response.status >= 400) {
		const failure = __assign(new Error('Request failed with status code ' + response.status), {
			response: { status: response.status, data: response.body, headers: response.headers },
			statusCode: response.status,
		});
		throw wrapped ? __apiError(failure, undefined) : failure;
	}
	if (bytes) {
		const body = __responseBytes(response.body);
		const full = legacy ? options.resolveWithFullResponse === true : options.returnFullResponse === true;
		return full ? { body, headers: response.headers, statusCode: response.status } : body;
	}
	return response.body;
}`;
const FILE_LIMIT = '(limit: binary-max-file)';
const REPEATS = '__repeats';
const REQUEST_SEND = '\tconst response = await ctx.http({';
const REQUEST_SEND_GUARDED = `\tif ((options.method ?? 'GET') !== 'GET') ${REPEATS} = false;
	let response;
	try {
		response = await ctx.http({`;
const REQUEST_SENT = '\t});\n\tif (response.status >= 400';
const REQUEST_SENT_GUARDED = `\t});
	} catch (error) {
		if (${REPEATS} && __isFileLimit(error)) throw new Error(error.message + ' ${RUNS_IN_HOST}');
		throw error;
	}
	if (response.status >= 400`;
const REQUEST_FAILS = 'if (response.status >= 400) {';
const REQUEST_FAILS_UNLESS_LENIENT =
	'if (response.status >= 400 && !(legacy ? options.simple === false : options.ignoreHttpStatusErrors)) {';
const REQUEST_RESULT = '\treturn response.body;\n}';
const REQUEST_RESULT_OR_FULL =
	'\treturn (legacy ? options.resolveWithFullResponse : options.returnFullResponse) ? { body: response.body, headers: response.headers, statusCode: response.status } : response.body;\n}';
const LENIENT_OPTIONS = new Set(['simple', 'ignoreHttpStatusErrors']);

function setsOption(root: ts.Node, names: Set<string>, withoutBytes = false): boolean {
	const keyOf = (n: ts.Node): ts.Node | undefined => {
		if (ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n)) return n.name;
		if (ts.isPropertyAccessExpression(n) && isWritten(n)) return n.name;
		if (ts.isElementAccessExpression(n)) return n.argumentExpression;
		return undefined;
	};
	const asksForBytes = (n: ts.Node) =>
		ts.isObjectLiteralExpression(n.parent) &&
		n.parent.properties.some(
			(p) => p.name !== undefined && ts.isIdentifier(p.name) && p.name.text === 'encoding',
		);
	const find = (n: ts.Node): boolean => {
		const key = keyOf(n);
		const named =
			key !== undefined &&
			(ts.isIdentifier(key) || ts.isStringLiteral(key)) &&
			names.has(key.text) &&
			!(withoutBytes && asksForBytes(n));
		return named || (ts.forEachChild(n, find) ?? false);
	};
	return find(root);
}
const FULL_RESPONSE_OPTIONS = new Set(['resolveWithFullResponse', 'returnFullResponse']);
const FULL_RESPONSE_GAPS = new Set(['statusMessage', 'request']);

const MAX_TIMER_MS = 2147483647;
const RANDOM_STEPS = 9007199254740992;
const RANDOM_INTEGER_LIMIT = 4294967296;
const MAX_RANDOM_SHAPES = 32;

const SESSION_FORM_DATA = 'a request with form data after a new session token has no compiled form';
const SESSION_TYPE =
	'a credential type that gets a session token first has a compiled form only when the request names the type as text';
const SESSION_OPTIONS =
	'token options of a request with a credential type that gets a session token first have no compiled form';

const CONTEXT_HELPERS: Record<string, string> = {
	__requestRenewed: `async function __requestRenewed(options) {
	try {
		return await __request(options, true, true);
	} catch (error) {
		if (options.formData !== undefined && options.formData !== null) throw new Error('${SESSION_FORM_DATA}');
		await ctx.service({ service: 'credentials', op: 'renew', args: { credentialId: credential } });
		return await __request(options, true, true);
	}
}`,
	__storedMetadata: `async function __storedMetadata(id) {
	return await ctx.service({ service: 'binaryData', op: 'metadata', args: { id } });
}`,
	__sleep: `async function __sleep(ms) {
	if (ms !== null && typeof ms === 'object') throw new Error('a pause for a value that is not a number or text has no compiled form');
	const wanted = Number(ms);
	await ctx.wait({ duration: wanted >= 1 && wanted <= ${MAX_TIMER_MS} ? Math.trunc(wanted) : 1 });
}`,
	__randomUUID: `function __randomUUID() {
	const digits = '0123456789abcdef';
	let out = '';
	for (let k = 0; k < 16; k++) {
		let byte = Math.floor(Math.random() * 256);
		if (k === 6) byte = 64 + (byte % 16);
		if (k === 8) byte = 128 + (byte % 64);
		if (k === 4 || k === 6 || k === 8 || k === 10) out += '-';
		out += digits.charAt(Math.floor(byte / 16)) + digits.charAt(byte % 16);
	}
	return out;
}`,
	__randomInt: `function __randomInt(first, second) {
	const min = second === undefined ? 0 : first;
	const max = second === undefined ? first : second;
	if (typeof min !== 'number' || typeof max !== 'number' || Math.floor(min) !== min || Math.floor(max) !== max || Math.abs(min) > ${RANDOM_INTEGER_LIMIT} || Math.abs(max) > ${RANDOM_INTEGER_LIMIT})
		throw new Error('a random integer with a limit that is not an integer between -2^32 and 2^32 has no compiled form');
	if (max <= min) throw new RangeError('The value of "max" is out of range. It must be greater than the value of "min" (' + min + '). Received ' + max);
	const range = max - min;
	const bucket = Math.floor(${RANDOM_STEPS} / range);
	const limit = bucket * range;
	let draw = Math.floor(Math.random() * ${RANDOM_STEPS});
	while (draw >= limit) draw = Math.floor(Math.random() * ${RANDOM_STEPS});
	return min + Math.floor(draw / bucket);
}`,
	__randomIntOf: `function __randomIntOf(first, second) {
	const min = second === undefined ? 0 : first;
	const max = second === undefined ? first : second;
	if (typeof min !== 'number' || typeof max !== 'number' || !(max > min) || max - min > ${RANDOM_INTEGER_LIMIT})
		throw new Error('a random integer with limits that are not in order, or that are more than 2^32 apart, has no compiled form');
	return __randomInt(first, second);
}`,
};

const SLEEP_PACKAGES = new Set(['@n8n/utils/sleep', '@n8n/utils', 'n8n-workflow']);
const CRYPTO_PACKAGES = new Set(['crypto', 'node:crypto']);

function contextHelper(
	imported: { from: string; name: string } | undefined,
	call: ts.CallExpression,
): string | undefined {
	if (!imported || call.arguments.some(ts.isSpreadElement)) return undefined;
	const count = call.arguments.length;
	if (SLEEP_PACKAGES.has(imported.from) && imported.name === 'sleep')
		return count === 1 ? '__sleep' : undefined;
	if (imported.from === 'n8n-workflow' && imported.name === 'randomInt')
		return count === 1 || count === 2 ? '__randomIntOf' : undefined;
	if (imported.from === 'uuid' && imported.name === 'v4' && count === 0) return '__randomUUID';
	if (!CRYPTO_PACKAGES.has(imported.from)) return undefined;
	if (imported.name === 'randomUUID' && count === 0) return '__randomUUID';
	if (imported.name === 'randomInt' && (count === 1 || count === 2)) return '__randomInt';
	return undefined;
}

function isMathRandom(n: ts.Node): boolean {
	return (
		ts.isPropertyAccessExpression(n) &&
		ts.isIdentifier(n.expression) &&
		n.expression.text === 'Math' &&
		n.name.text === 'random'
	);
}

function randomShapes(roots: ts.Node[]): RandomShape[] {
	const shapes = new Map<string, RandomShape>();
	const add = (shape: RandomShape) => {
		if (shapes.size < MAX_RANDOM_SHAPES) shapes.set(JSON.stringify(shape), shape);
		else shapes.set('"number"', { kind: 'number' });
	};
	const bound = (e: ts.Expression | undefined): number | undefined => {
		const value = e === undefined ? undefined : literalOf(e)?.value;
		return typeof value === 'number' ? value : undefined;
	};
	const walk = (n: ts.Node) => {
		if (isMathRandom(n)) add({ kind: 'number' });
		if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
			if (n.expression.text === '__randomUUID') add({ kind: 'uuid' });
			if (n.expression.text === '__randomInt' || n.expression.text === '__randomIntOf') {
				const [first, second] = n.arguments.map(bound);
				const min = n.arguments.length === 1 ? 0 : first;
				const max = n.arguments.length === 1 ? first : second;
				add(
					min === undefined || max === undefined || n.arguments.length > 2
						? { kind: 'integer' }
						: { kind: 'integer', min, max },
				);
			}
		}
		ts.forEachChild(n, walk);
	};
	for (const root of roots) walk(root);
	return [...shapes.values()];
}
const REQUEST_BYTES = "legacy ? options.encoding === null : options.encoding === 'arraybuffer'";
const REQUEST_HEAD = 'async function __request(options, wrapped, legacy) {';
const REQUEST_HEAD_WITH_TOKEN_OPTIONS = `async function __request(options, wrapped, legacy, extra, nested) {
	const oauth2 = extra === undefined || extra === null ? undefined : nested ? extra.oauth2 : extra;
	const tokenOptions = oauth2 === undefined || oauth2 === null ? {} : oauth2;`;
const REQUEST_CREDENTIAL = '\t\tinject: wrapped,\n\t\tcredential,\n';
const REQUEST_CREDENTIAL_WITH_TOKEN_OPTIONS = `${REQUEST_CREDENTIAL}\t\tskipTokenRefresh: tokenOptions.skipTokenRefresh === true ? true : undefined,
		tokenExpiredStatusCode: tokenOptions.tokenExpiredStatusCode,
`;
const TOKEN_OPTION_NAMES = new Set(['skipTokenRefresh', 'tokenExpiredStatusCode']);
const namesTokenOption = (n: ts.Node): boolean =>
	(ts.isIdentifier(n) && TOKEN_OPTION_NAMES.has(n.text)) ||
	(ts.forEachChild(n, namesTokenOption) ?? false);

const GLOBALS = new Set([
	'undefined',
	'NaN',
	'Infinity',
	'Object',
	'JSON',
	'Math',
	'Array',
	'String',
	'Number',
	'Boolean',
	'Date',
	'Error',
	'RegExp',
	'Promise',
	'parseInt',
	'parseFloat',
	'isNaN',
	'encodeURIComponent',
	'decodeURIComponent',
	'encodeURI',
	'btoa',
	'atob',
	'escape',
	'unescape',
	'ctx',
	'parameters',
	'credential',
	'arguments',
	'Set',
	'Map',
	'isFinite',
	'console',
	'Buffer',
]);

const UNSAFE_PROPERTIES = [
	'__proto__',
	'prototype',
	'constructor',
	'getPrototypeOf',
	'setPrototypeOf',
	'getOwnPropertyDescriptor',
	'getOwnPropertyDescriptors',
	'defineProperty',
	'defineProperties',
	'mainModule',
	'binding',
	'_linkedBinding',
	'_load',
	'prepareStackTrace',
	'__lookupGetter__',
	'__lookupSetter__',
	'__defineGetter__',
	'__defineSetter__',
	'caller',
	'callee',
	'arguments',
	'getBuiltinModule',
	'dlopen',
	'execve',
	'loadEnvFile',
];

const HELPERS: Record<string, string> = {
	__apiError: `function __apiError(cause: any, options: any): any {
	if (cause !== null && cause !== undefined && typeof cause === 'object' && cause.name === 'NodeApiError') return cause;
	const text: string = cause !== null && cause !== undefined && typeof cause.message === 'string' ? cause.message : String(cause);
	const prefix = 'Request failed with status code ';
	const code: string = text.startsWith(prefix) ? text.slice(prefix.length) : '';
	const known: any = {
		'400': 'Bad request - please check your parameters',
		'401': 'Authorization failed - please check your credentials',
		'402': 'Payment required - perhaps check your payment details?',
		'403': 'Forbidden - perhaps check your credentials?',
		'404': 'The resource you are requesting could not be found',
		'405': 'Method not allowed - please check you are using the right HTTP method',
		'429': 'The service is receiving too many requests from you',
		'500': 'The service was not able to process your request',
		'502': 'Bad gateway - the service failed to handle your request',
		'503': 'Service unavailable - try again later or consider setting this node to retry automatically (in the node settings)',
		'504': 'Gateway timed out - perhaps try again later?',
	};
	let message: string = text;
	if (options !== null && options !== undefined && typeof options.message === 'string' && options.message !== '') message = options.message;
	else if (known[code] !== undefined) message = known[code];
	else if (code.charAt(0) === '4') message = 'Your request is invalid or could not be processed by the service';
	else if (code.charAt(0) === '5') message = 'The service failed to process your request';
	let description: any = __apiDescription(cause, text, options);
	if (message === '' && code === '') {
		message = description ? description : 'There was an unknown issue while executing the node';
		if (!description) description = 'Double-check the node configuration and the service it connects to. Check the error details below and refer to the <a href="https://docs.n8n.io" target="_blank">n8n documentation</a> to troubleshoot the issue.';
	}
	const failure: any = new Error(message);
	failure.name = 'NodeApiError';
	if (code !== '') failure.httpCode = code;
	if (description && description !== message) failure.description = description;
	return failure;
}`,
	__apiDescription: `function __apiDescription(cause: any, text: string, options: any): any {
	let description: any = options !== null && options !== undefined ? options.description : undefined;
	const isObject = (value: any): boolean => value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
	if (!isObject(cause)) return description;
	const data: any = isObject(cause.response) ? cause.response.data : undefined;
	if (isObject(data)) {
		if (data.message) description = data.message;
		else if (data.error && data.error.message) description = data.error.message;
	}
	if (description || cause.description || cause.reason || cause.cause || cause.error || typeof cause.message !== 'string') return description;
	try {
		const parsed: any = JSON.parse(text);
		return typeof parsed === 'string' ? parsed : undefined;
	} catch (error) {
		return text;
	}
}`,
	__form: `function __form(value: any): any {
	const fields: any = {};
	for (const [key, member] of Object.entries(value)) {
		if (member === undefined) continue;
		if (member !== null && typeof member === 'object') throw new Error('a form body with a nested value has no compiled form');
		fields[key] = member === null ? null : String(member);
	}
	return { $form: fields };
}`,
	__sendBody: `function __sendBody(body: any): any {
	if (body !== null && body !== undefined && typeof body === 'object' && body.$bytes === true) throw new Error('a request body of file bytes has no compiled form');
	return body;
}`,
	__formParts: `function __formParts(options: any, headers: any): any {
	const files: any = options.formData;
	if (files === undefined) return undefined;
	let type: any = undefined;
	let typed: boolean = false;
	for (const key of Object.keys(headers)) {
		if (!typed && String(key).toLowerCase() === 'content-type') {
			type = headers[key];
			typed = true;
		}
	}
	let fields: any = files;
	if (typeof type === 'string' && type.includes('multipart/form-data')) {
		const body: any = options.body;
		if (body !== undefined && body !== null && (typeof body !== 'object' || Array.isArray(body) || body.$bytes === true)) throw new Error('a multipart body from a value that is not an object has no compiled form');
		fields = __assign(__assign({}, body ?? {}), files);
	} else if (options.form !== undefined && options.body === undefined) {
		return undefined;
	}
	if (fields === null || typeof fields !== 'object' || Array.isArray(fields)) throw new Error('a multipart body from a value that is not an object has no compiled form');
	const parts: any[] = [];
	for (const [name, field] of Object.entries(fields)) {
		const values: any[] = Array.isArray(field) ? field : [field];
		for (const given of values) parts.push(__formPart(name, given));
	}
	return parts;
}`,
	__formPart: `function __formPart(name: string, given: any): any {
	let value: any = given;
	let options: any = {};
	if (given !== null && given !== undefined && typeof given === 'object' && !Array.isArray(given) && Object.keys(given).includes('value') && Object.keys(given).includes('options')) {
		value = given.value;
		options = typeof given.options === 'string' ? { filename: given.options } : given.options;
		if (options === undefined || options === null || options === false || options === 0 || options === '') options = {};
		if (typeof options !== 'object' || Array.isArray(options)) throw new Error('a form field with options that are not an object has no compiled form');
	}
	if (typeof value === 'number' || value === null || value === undefined) value = String(value);
	if (options.filepath !== undefined || options.header !== undefined) throw new Error('a form field with a file path or a header has no compiled form');
	const fileName: any = options.filename;
	const contentType: any = options.contentType;
	const named: boolean = fileName !== undefined && fileName !== null && fileName !== '' && fileName !== false && fileName !== 0;
	const typed: boolean = contentType !== undefined && contentType !== null && contentType !== '' && contentType !== false && contentType !== 0;
	if (typeof value === 'string') {
		if (named || typed) throw new Error('a form field of text with a file name or a content type has no compiled form');
		return { name, value };
	}
	if (typeof value !== 'object' || value.$bytes !== true) throw new Error('a form field that is not text, a number or file bytes has no compiled form');
	if ((named && typeof fileName !== 'string') || (typed && typeof contentType !== 'string')) throw new Error('a form file with a name or a content type that is not text has no compiled form');
	if (value.id !== undefined && !(named && typed)) throw new Error('a form file from a file store without a file name and a content type has no compiled form');
	if (named && !typed) throw new Error('a form file with a content type that comes from its file name has no compiled form');
	const binary: any = { data: value.data };
	if (value.id !== undefined) binary.id = value.id;
	binary.mimeType = typed ? contentType : 'application/octet-stream';
	if (named) {
		let end: number = fileName.length;
		while (end > 0 && fileName.charAt(end - 1) === '/') end -= 1;
		const base: string = fileName.slice(0, end).split('/').pop() ?? '';
		if (base !== '') binary.fileName = base;
	}
	return { name, binary };
}`,
	__binaryOf: `function __binaryOf(items: any, index: any, name: any): any {
	if (typeof name !== 'string') throw new Error('binary data from a value that is not a property name has no compiled form');
	const json: any = items[index].json;
	const files: any = json !== null && json !== undefined && typeof json === 'object' ? json.$binary : undefined;
	if (files === undefined) throw __error("This operation expects the node's input data to contain a binary file '" + name + "', but none was found [item " + index + ']', 'NodeOperationError', { description: 'Make sure that the previous node outputs a binary file' });
	if (files === null || typeof files !== 'object' || Array.isArray(files)) throw new Error('binary data that is not an object has no compiled form');
	const file: any = Object.keys(files).includes(name) ? files[name] : undefined;
	if (file === undefined) throw __error("The item has no binary field '" + name + "' [item " + index + ']', 'NodeOperationError', { description: 'Check that the parameter where you specified the input binary field name is correct, and that it matches a field in the binary input' });
	return file;
}`,
	__fileBytes: `function __fileBytes(data: any): any {
	if (typeof data !== 'string') throw new Error('file bytes from a value that is not base64 text has no compiled form');
	if (data.length % 4 !== 0) throw new Error('file bytes from base64 text that is not padded has no compiled form');
	const padding: number = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0;
	return { $bytes: true, data, length: (data.length / 4) * 3 - padding };
}`,
	__storedBytes: `function __storedBytes(id: any): any {
	const mode: string = typeof id === 'string' ? id.split(':')[0] : '';
	if (typeof id !== 'string' || (mode !== 'filesystem-v2' && mode !== 'filesystem') || !id.startsWith(mode + ':')) throw new Error('file bytes that are not in the file system store of n8n has no compiled form');
	return { $bytes: true, data: mode, id };
}`,
	__inputBytes: `function __inputBytes(items: any, index: any, name: any): any {
	if (typeof name !== 'string') throw new Error('binary data from a value that is not a property name has no compiled form');
	const files: any = items[index].json.$binary;
	if (files === null || files === undefined || typeof files !== 'object' || Array.isArray(files) || !Object.keys(files).includes(name)) throw new Error('file bytes of a binary property that the item does not have has no compiled form');
	const file: any = files[name];
	if (file.id === undefined || file.id === null || file.id === '') return __fileBytes(file.data);
	if (typeof file.bytes !== 'number') throw new Error('file bytes in a file store without a size has no compiled form');
	const stored: any = __storedBytes(file.id);
	stored.length = file.bytes;
	return stored;
}`,
	__responseBytes: `function __responseBytes(body: any): any {
	const entry: any = body !== null && body !== undefined && typeof body === 'object' && !Array.isArray(body) ? body.$binary : undefined;
	if (entry === null || entry === undefined || typeof entry !== 'object' || typeof entry.id !== 'string' || typeof entry.data !== 'string' || typeof entry.bytes !== 'number') throw new Error('a response of bytes that the runtime did not store has no compiled form');
	return { $bytes: true, data: entry.data, id: entry.id, length: entry.bytes, response: true };
}`,
	__bytesFrom: `function __bytesFrom(value: any): any {
	if (value === null || value === undefined || typeof value !== 'object' || value.$bytes !== true) throw new Error('a Buffer from a value that is not file bytes has no compiled form');
	return value;
}`,
	__noBytes: `function __noBytes(value: any): any {
	const work: any[] = [value];
	let seen: number = 0;
	while (work.length > 0) {
		const next: any = work.pop();
		if (next === null || next === undefined || typeof next !== 'object') continue;
		seen += 1;
		if (seen > 100000) throw new Error('JSON data of more than 100000 parts in a node that holds file bytes has no compiled form');
		if (Array.isArray(next)) {
			for (const member of next) work.push(member);
			continue;
		}
		if (next.$bytes === true) throw new Error('file bytes inside JSON data has no compiled form');
		for (const member of Object.values(next)) work.push(member);
	}
	return value;
}`,
	__sendBodyChecked: `function __sendBody(body: any): any {
	if (body !== null && body !== undefined && typeof body === 'object' && body.$bytes === true) throw new Error('a request body of file bytes has no compiled form');
	return __noBytes(body);
}`,
	__outChecked: `function __out(result: any): any {
	const out: any[] = [];
	for (const item of result[0] ?? []) out.push(__outItem(item, __noBytes(__plain(item.json))));
	return out;
}`,
	__failedJson: `function __failedJson(error: any): any {
	if (!error) throw new Error('an output item with an error that is not an error has no compiled form');
	return { error: typeof error === 'object' ? error.message : undefined };
}`,
	__outFailedChecked: `function __outFailed(result: any): any {
	const out: any[] = [];
	for (const item of result[0] ?? []) out.push(__outItem(item, item.error === undefined ? __noBytes(__plain(item.json)) : __failedJson(item.error)));
	return out;
}`,
	__outFailed: `function __outFailed(result: any): any {
	const out: any[] = [];
	for (const item of result[0] ?? []) out.push(__outItem(item, item.error === undefined ? __plain(item.json) : __failedJson(item.error)));
	return out;
}`,
	__outPairedChecked: `function __outPaired(result: any): any {
	const items: any[] = [];
	const paired: any[] = [];
	const failed: any[] = [];
	let again: boolean = false;
	for (const item of result[0] ?? []) {
		if (items.length === 0) {
			const error: any = item.json === null || item.json === undefined ? undefined : item.json.error;
			again = error !== undefined && error !== null && error !== false;
		}
		paired.push(__pairOf(item.pairedItem));
		if (item.error === undefined) items.push(__outItem(item, __noBytes(__plain(item.json))));
		else {
			failed.push(items.length);
			items.push(__outItem(item, __failedJson(item.error)));
		}
	}
	return { items, paired, failed, again };
}`,
	__outPaired: `function __outPaired(result: any): any {
	const items: any[] = [];
	const paired: any[] = [];
	const failed: any[] = [];
	let again: boolean = false;
	for (const item of result[0] ?? []) {
		if (items.length === 0) {
			const error: any = item.json === null || item.json === undefined ? undefined : item.json.error;
			again = error !== undefined && error !== null && error !== false;
		}
		paired.push(__pairOf(item.pairedItem));
		if (item.error === undefined) items.push(__outItem(item, __plain(item.json)));
		else {
			failed.push(items.length);
			items.push(__outItem(item, __failedJson(item.error)));
		}
	}
	return { items, paired, failed, again };
}`,
	__entries: `function __entries(list: any): any {
	if (!Array.isArray(list)) throw new Error('the entries of a value that is not an array have no compiled form');
	const out: any[] = [];
	for (let k = 0; k < list.length; k++) out.push([k, list[k]]);
	return out;
}`,
	__pairOf: `function __pairOf(pair: any): any {
	if (pair === undefined) return null;
	if (pair === null) throw new Error('an output item with the paired item null has no compiled form');
	return typeof pair === 'number' ? [pair] : pair;
}`,
	__pairAt: `function __pairAt(index: any): any {
	return typeof index === 'number' ? index : { item: index };
}`,
	__withPaired: `function __withPaired(list: any, options: any): any {
	const out: any[] = [];
	for (const data of list) {
		const item: any = { json: data.json, pairedItem: options.itemData };
		for (const [key, value] of Object.entries(data)) {
			if (key !== 'json') item[key] = value;
		}
		out.push(item);
	}
	return out;
}`,
	__outItem: `function __outItem(item: any, json: any): any {
	const files: any = item.binary;
	if (files === undefined) return json;
	if (files === null || typeof files !== 'object' || Array.isArray(files)) throw new Error('binary data of an output item that is not an object has no compiled form');
	if (json === null || json === undefined || typeof json !== 'object' || Array.isArray(json)) throw new Error('binary data of an output item without a JSON object has no compiled form');
	for (const file of Object.values(files)) {
		const entry: any = file;
		if (entry === null || entry === undefined || typeof entry !== 'object' || Array.isArray(entry) || entry.$bytes === true || typeof entry.data !== 'string') throw new Error('a binary property of an output item that is not binary data has no compiled form');
	}
	if (json.$binary === files) return json;
	return __assign(__assign({}, json), { $binary: files });
}`,
	__extName: `function __extName(base: string): string {
	let dot: number = -1;
	for (let k = 0; k < base.length; k++) {
		if (base.charAt(k) === '.') dot = k;
	}
	if (dot <= 0 || base === '..') return '';
	return base.slice(dot);
}`,
	__pathParts: `function __pathParts(path: string): any {
	if (path === '/') return { dir: '/', base: '', ext: '' };
	let end: number = path.length;
	while (end > 1 && path.charAt(end - 1) === '/') end -= 1;
	let cut: number = -1;
	for (let k = 0; k < end; k++) {
		if (path.charAt(k) === '/') cut = k;
	}
	const base: string = path.slice(cut + 1, end);
	return { dir: cut > 0 ? path.slice(0, cut) : cut === 0 ? '/' : '', base, ext: __extName(base).slice(1) };
}`,
	__mimeLookup: `function __mimeLookup(path: any): any {
	if (path === undefined || path === null || path === '' || path === false || path === 0) return false;
	if (typeof path !== 'string') return false;
	const written: string = __pathParts('x.' + path).ext;
	for (let k = 0; k < written.length; k++) {
		if (written.charCodeAt(k) > 126) throw new Error('the MIME type of a file extension with a character outside ASCII has no compiled form');
	}
	const extension: string = written.toLowerCase();
	if (extension === '' || extension.includes(',') || extension.includes('|')) return false;
	const at: number = __MIME.indexOf(',' + extension + ',');
	if (at < 0) return false;
	let start: number = 0;
	let next: number = __MIME.indexOf('\\n', 0);
	while (next >= 0 && next < at) {
		start = next + 1;
		next = __MIME.indexOf('\\n', start);
	}
	return __MIME.slice(start, __MIME.indexOf('|', start));
}`,
	__mimeExtension: `function __mimeExtension(type: string): string {
	for (let k = 0; k < type.length; k++) {
		const code: number = type.charCodeAt(k);
		if ((code < 32 && code !== 9) || code > 126) throw new Error('a MIME type with a character outside printable ASCII has no compiled form');
	}
	let start: number = 0;
	while (start < type.length && (type.charCodeAt(start) === 32 || type.charCodeAt(start) === 9)) start += 1;
	let end: number = start;
	while (end < type.length && type.charCodeAt(end) !== 32 && type.charCodeAt(end) !== 9 && type.charCodeAt(end) !== 59) end += 1;
	const token: string = type.slice(start, end).toLowerCase();
	if (token === '' || token.includes('|') || token.includes(',')) return '';
	const at: number = __MIME.indexOf('\\n' + token + '|');
	if (at < 0) return '';
	const from: number = at + token.length + 2;
	return __MIME.slice(from, __MIME.indexOf('|', from));
}`,
	__fileType: `function __fileType(type: string): string {
	if (type.startsWith('application/json')) return 'json';
	if (type.startsWith('text/html')) return 'html';
	if (type.startsWith('image/')) return 'image';
	if (type.startsWith('audio/')) return 'audio';
	if (type.startsWith('video/')) return 'video';
	if (type.startsWith('text/') || type.startsWith('application/javascript')) return 'text';
	if (type.startsWith('application/pdf')) return 'pdf';
	return '';
}`,
	__prettyBytes: `function __prettyBytes(count: number): string {
	if (count < 0 || count >= 1000000000000 || Math.floor(count) !== count) throw new Error('the size text of a file of this size has no compiled form');
	if (count < 1) return '0 B';
	const exponent: number = count < 1000 ? 0 : count < 1000000 ? 1 : count < 1000000000 ? 2 : 3;
	const scaled: number = count / [1, 1000, 1000000, 1000000000][exponent];
	const text: string = scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0);
	return String(Number(text)) + ' ' + ['B', 'kB', 'MB', 'GB'][exponent];
}`,
	__prepareBinary: `function __prepareBinary(value: any, filePath: any, mimeType: any): any {
	if (value === null || value === undefined || typeof value !== 'object' || value.$bytes !== true || value.response !== true) throw new Error('binary data from bytes that are not the body of a response has no compiled form');
	const named: boolean = filePath !== undefined && filePath !== null && filePath !== '' && filePath !== false && filePath !== 0;
	const typed: boolean = mimeType !== undefined && mimeType !== null && mimeType !== '' && mimeType !== false && mimeType !== 0;
	if ((named && typeof filePath !== 'string') || (typed && typeof mimeType !== 'string')) throw new Error('binary data with a file name or a MIME type that is not text has no compiled form');
	const found: any = typed ? mimeType : named ? __mimeLookup(filePath) : false;
	if (found === false) throw new Error('binary data with a MIME type that comes from the bytes has no compiled form');
	const type: string = found;
	const out: any = { mimeType: type };
	const kind: string = __fileType(type);
	if (kind !== '') out.fileType = kind;
	const parts: any = named ? __pathParts(filePath) : undefined;
	const extension: string = parts !== undefined && parts.ext !== '' ? parts.ext : __mimeExtension(type);
	if (extension !== '') out.fileExtension = extension;
	out.data = value.data;
	if (parts !== undefined) {
		if (parts.dir !== '') out.directory = parts.dir;
		out.fileName = parts.base;
	}
	out.id = value.id;
	out.fileSize = __prettyBytes(value.length);
	out.bytes = value.length;
	return out;
}`,
	__MIME: 'const __MIME: string = ' + JSON.stringify(MIME_TABLE) + ';',
	__getPath: `function __getPath(value: any, path: any, fallback: any): any {
	if (Array.isArray(path)) return __get(value, path, '', fallback);
	const text: string = String(path);
	if (!text.includes('[') && !text.includes(']')) return __get(value, text.split('.'), text, fallback);
	const keys: string[] = [];
	let key: string = '';
	let inside: boolean = false;
	let closed: boolean = false;
	for (let k = 0; k < text.length; k++) {
		const c: string = text.charAt(k);
		if (inside) {
			if (c === ']' && key !== '') {
				keys.push(key);
				key = '';
				inside = false;
				closed = true;
			} else if ('0123456789'.includes(c)) key += c;
			else throw new Error('a path with a bracket that has no index has no compiled form');
		} else if (c === '[') {
			if (key !== '') keys.push(key);
			else if (!closed && k > 0) throw new Error('a path with a bracket that has no index has no compiled form');
			key = '';
			inside = true;
			closed = false;
		} else if (c === ']') throw new Error('a path with a bracket that has no index has no compiled form');
		else if (c === '.') {
			if (!closed) keys.push(key);
			key = '';
			closed = false;
		} else {
			key += c;
			closed = false;
		}
	}
	if (inside) throw new Error('a path with a bracket that has no index has no compiled form');
	if (!closed) keys.push(key);
	return __get(value, keys, text, fallback);
}`,
	__set: `function __set(target: any, keys: any, value: any): any {
	let current: any = target;
	for (let k = 0; k < keys.length - 1; k++) {
		const next: any = current[keys[k]];
		if (next === null || next === undefined || typeof next !== 'object') current[keys[k]] = {};
		current = current[keys[k]];
	}
	current[keys[keys.length - 1]] = value;
	return target;
}`,
	__omitKeys: `function __omitKeys(value: any, keys: any): any {
	const names: any[] = [];
	for (const key of keys) {
		for (const name of Array.isArray(key) ? key : [key]) {
			if (String(name).includes('.') || String(name).includes('[')) throw new Error('omit with a path has no compiled form');
			names.push(String(name));
		}
	}
	const out: any = {};
	if (value === null || value === undefined) return out;
	for (const [key, member] of Object.entries(value)) {
		if (!names.includes(key)) out[key] = member;
	}
	return out;
}`,
	__toPathSegment: `function __toPathSegment(id: any): string {
	if (id === null || id === undefined) throw new Error('Invalid identifier: a value is required');
	const value: string = String(id);
	if (value === '' || value === '.' || value === '..') throw new Error('Invalid identifier: "' + value + '" is not allowed');
	return encodeURIComponent(value);
}`,
	__plain: '',
	__wrap: `function __wrap(items: any): any {
	const out: any[] = [];
	for (const json of items ?? [{}]) {
		const files: any = json !== null && json !== undefined && typeof json === 'object' ? json.$binary : undefined;
		out.push(files === undefined ? { json } : { json, binary: files });
	}
	return out;
}`,
	__out: `function __out(result: any): any {
	const out: any[] = [];
	for (const item of result[0] ?? []) out.push(__outItem(item, __plain(item.json)));
	return out;
}`,
	__jsonArray: `function __jsonArray(data: any): any {
	const out: any[] = [];
	const list: any = Array.isArray(data) ? data : [data];
	for (const json of list) {
		if (json !== null && json !== undefined && json.json) {
			const kept: any = {};
			for (const [key, value] of Object.entries(json)) kept[key] = value;
			out.push(kept);
		} else out.push({ json });
	}
	return out;
}`,
	__spreadList: `function __spreadList(value: any, name: string): any {
	if (Array.isArray(value) || typeof value === 'string') return value;
	if (value !== null && value !== undefined) {
		if (typeof value === 'object' && value.$coll !== undefined) return value;
		throw new TypeError('Spread syntax requires ...iterable[Symbol.iterator] to be a function');
	}
	if (name === '') throw new Error('the spread of a value that is not there has no compiled form');
	throw new TypeError(name + ' is not iterable (cannot read property ' + value + ')');
}`,
	__iterableOf: `function __iterableOf(value: any, name: string): any {
	if (Array.isArray(value) || typeof value === 'string') return value;
	if (value !== null && value !== undefined && typeof value === 'object' && value.$coll !== undefined) return value;
	throw new TypeError(name + ' is not iterable');
}`,
	__applyList: `function __applyList(value: any): any {
	if (Array.isArray(value)) return value;
	if (value === null || value === undefined) return [];
	if (typeof value !== 'object') throw new Error('a function call with a list of arguments that is not an object has no compiled form');
	const length: any = value.length;
	if (length === undefined || length === null) return [];
	if (typeof length !== 'number' || length > 65536) throw new Error('a function call with a list of arguments of this length has no compiled form');
	const out: any[] = [];
	for (let k = 0; k < length; k++) out.push(value[k]);
	return out;
}`,
	__assign: `function __assign(target: any, source: any): any {
	if (source !== null && source !== undefined) {
		for (const [key, value] of Object.entries(source)) target[key] = value;
	}
	return target;
}`,
	__error: `function __error(cause: any, name: string, options: any): any {
	if (cause !== null && cause !== undefined && typeof cause === 'object' && cause.name === name) return cause;
	let message: string = typeof cause === 'string' ? cause : cause !== null && cause !== undefined && cause.message !== undefined ? String(cause.message) : cause !== null && typeof cause === 'object' ? '' : String(cause);
	if (options !== null && options !== undefined && typeof options.message === 'string' && options.message !== '') message = options.message;
	const failure: any = new Error(message);
	failure.name = name;
	if (options !== null && options !== undefined && options.description !== undefined) failure.description = options.description;
	return failure;
}`,
	__isNamed: `function __isNamed(value: any, names: any): boolean {
	if (value === null || value === undefined || typeof value !== 'object') return false;
	return names.includes(value.name);
}`,
	__isError: `function __isError(value: any): boolean {
	return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value) && typeof value.message === 'string';
}`,
	__uuidValid: `function __uuidValid(value: any): boolean {
	if (typeof value !== 'string' || value.length !== 36) return false;
	for (let k = 0; k < 36; k++) {
		const c: string = value.charAt(k);
		if (k === 8 || k === 13 || k === 18 || k === 23) {
			if (c !== '-') return false;
		} else if (!'0123456789abcdefABCDEF'.includes(c)) return false;
	}
	if ('12345678'.includes(value.charAt(14)) && '89abAB'.includes(value.charAt(19))) return true;
	const lower: string = value.toLowerCase();
	return lower === '00000000-0000-0000-0000-000000000000' || lower === 'ffffffff-ffff-ffff-ffff-ffffffffffff';
}`,
	__isEmpty: `function __isEmpty(value: any): boolean {
	if (value === null || value === undefined) return true;
	if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
	if (typeof value === 'object') return Object.keys(value).length === 0;
	return true;
}`,
	__jsonParse: `function __jsonParse(text: any, options?: any): any {
	try {
		return JSON.parse(text);
	} catch (error) {
		if (options === null || options === undefined) throw error;
		if (options.acceptJSObject || options.repairJSON) throw new Error('jsonParse with a repair of the text has no compiled form');
		if (options.fallbackValue !== undefined) return options.fallbackValue;
		if (options.errorMessage) throw __error(options.errorMessage, 'UserError', undefined);
		throw error;
	}
}`,
	__deepCopy: `function __deepCopy(value: any): any {
	if (typeof value === 'string') return value;
	if (value === undefined || value === null || typeof value === 'boolean') return value;
	if (typeof value === 'number' && value - value === 0) return value === 0 ? 0 : value;
	return JSON.parse(JSON.stringify(value));
}`,
	__parameterValue: `function __parameterValue(entry: any): any {
	if (entry.error !== undefined) {
		const failure: any = new Error(entry.error.message);
		failure.description = entry.error.description;
		throw failure;
	}
	return entry.value;
}`,
	__isLocator: `function __isLocator(value: any): boolean {
	if (value === null || value === undefined || typeof value !== 'object') return false;
	const keys: any = Object.keys(value);
	return keys.includes('mode') && keys.includes('value') && keys.includes('__rl');
}`,
	__setSafe: `function __setSafe(target: any, property: any, value: any): void {
	if (typeof property !== 'string') throw new Error('a safe property name that is not text has no compiled form');
	const unsafe: any = ${JSON.stringify(UNSAFE_PROPERTIES)};
	if (!unsafe.includes(property)) target[property] = value;
}`,
	__assertParam: `function __assertParam(name: any, value: any, type: string): void {
	if (typeof value !== type) throw __error('Parameter "' + name + '" is not ' + type, 'NodeOperationError', undefined);
}`,
	__assertParamTypes: `function __assertParamTypes(name: any, value: any, types: any): void {
	for (const type of types) {
		if (typeof value === type) return;
	}
	throw __error('Parameter "' + name + '" must be ' + types.join(' or '), 'NodeOperationError', undefined);
}`,
	__paramFits: `function __paramFits(value: any, type: any): boolean {
	if (typeof type !== 'string') throw new Error('a parameter type that is not text has no compiled form');
	const isObject: boolean = typeof value === 'object' && value !== null;
	if (type === 'resource-locator') {
		if (!isObject) return false;
		if (!Array.isArray(value)) {
			const keys: any = Object.keys(value);
			return keys.includes('__rl') && keys.includes('mode') && keys.includes('value');
		}
		return false;
	}
	if (type === 'object') return isObject;
	if (type.endsWith('[]')) {
		if (!Array.isArray(value)) return false;
		const base: string = type.slice(0, -2);
		const element: string = base === 'string' || base === 'number' || base === 'boolean' ? base : 'string';
		for (const member of value) {
			if (typeof member !== element) return false;
		}
		return true;
	}
	return typeof value === type;
}`,
	__validateParams: `function __validateParams(value: any, parameters: any): void {
	if (typeof value !== 'object' || value === null) throw __error('Value is not a valid object', 'NodeOperationError', undefined);
	for (const key of Object.keys(parameters)) {
		const param: any = parameters[key];
		const paramValue: any = value[key];
		if (param.required !== undefined && param.required !== null && typeof param.required !== 'boolean') throw new Error('a required mark that is not a boolean has no compiled form');
		const required: boolean = param.required === true;
		if (required && paramValue === undefined) throw __error('Required parameter "' + key + '" is missing', 'NodeOperationError', undefined);
		if (required || paramValue !== undefined) {
			const types: any = Array.isArray(param.type) ? param.type : [param.type];
			let valid: boolean = false;
			for (const type of types) {
				if (!valid && __paramFits(paramValue, type)) valid = true;
			}
			if (!valid) throw __error('Parameter "' + key + '" does not match any of the expected types: ' + types.join(' or '), 'NodeOperationError', undefined);
		}
	}
}`,
	__toNumber: `function __toNumber(value: any): number {
	if (value !== null && typeof value === 'object') throw new Error('a number from an object or an array has no compiled form');
	const parsed: number = Number(value);
	if (isNaN(parsed)) throw __error('Failed to parse value to number', 'UserError', undefined);
	return parsed;
}`,
	__hints: `function __hints(hints: any): void {
	return;
}`,
	__missing: `function __missing(name: string): any {
	throw __error('Could not get parameter "' + name + '"', 'UserError', undefined);
}`,
	__get: `function __get(value: any, keys: any, whole: string, fallback: any): any {
	if (value === null || value === undefined) return fallback;
	if (keys.length > 1 && Object.keys(value).includes(whole)) {
		const direct: any = value[whole];
		return direct === undefined ? fallback : direct;
	}
	let current: any = value;
	for (const key of keys) {
		if (current === null || current === undefined) return fallback;
		current = current[key];
	}
	return current === undefined ? fallback : current;
}`,
	__caseWords: `function __caseWords(input: any): any {
	if (typeof input !== 'string') throw new Error('change-case of a value that is not text has no compiled form');
	const words: string[] = [];
	let word: string = '';
	for (let k = 0; k < input.length; k++) {
		const code: number = input.charCodeAt(k);
		if (code > 127) throw new Error('change-case of text outside ASCII has no compiled form');
		const upper: boolean = code >= 65 && code <= 90;
		const lower: boolean = code >= 97 && code <= 122;
		const digit: boolean = code >= 48 && code <= 57;
		if (!upper && !lower && !digit) {
			if (word !== '') words.push(word);
			word = '';
			continue;
		}
		if (upper && word !== '') {
			const before: number = input.charCodeAt(k - 1);
			const after: number = k + 1 < input.length ? input.charCodeAt(k + 1) : 0;
			if (before < 65 || before > 90 || (after >= 97 && after <= 122)) {
				words.push(word);
				word = '';
			}
		}
		word += input.charAt(k);
	}
	if (word !== '') words.push(word);
	return words;
}`,
	__changeCase: `function __changeCase(input: any, style: string, delimiter: string): string {
	const words: any = __caseWords(input);
	const out: string[] = [];
	for (let k = 0; k < words.length; k++) {
		const word: string = words[k];
		const first: number = word.charCodeAt(0);
		const rest: string = word.slice(1).toLowerCase();
		if (style === 'lower' || (k === 0 && style === 'camel') || (k > 0 && style === 'sentence')) out.push(word.toLowerCase());
		else if (style === 'upper') out.push(word.toUpperCase());
		else if (k > 0 && (style === 'camel' || style === 'pascal') && first >= 48 && first <= 57) out.push('_' + word.charAt(0) + rest);
		else out.push(word.charAt(0).toUpperCase() + rest);
	}
	return out.join(delimiter);
}`,
	__isLimit: `function __isLimit(error: any): boolean {
	return error !== null && error !== undefined && typeof error === 'object' && typeof error.message === 'string' && error.message.endsWith('has no compiled form');
}`,
	__isLimitOrHost: `function __isLimit(error: any): boolean {
	return error !== null && error !== undefined && typeof error === 'object' && typeof error.message === 'string' && (error.message.endsWith('has no compiled form') || error.message.endsWith('${RUNS_IN_HOST}'));
}`,
	__isFileLimit: `function __isFileLimit(error: any): boolean {
	return error !== null && error !== undefined && typeof error === 'object' && typeof error.message === 'string' && error.message.includes('${FILE_LIMIT}');
}`,
	__urlText: `function __urlText(text: string, escaped: any): string {
	let out: string = '';
	for (let k = 0; k < text.length; k++) {
		const code: number = text.charCodeAt(k);
		if (code > 32 && code < 127 && !escaped.includes(code)) out += text.charAt(k);
		else out += '%' + (code < 16 ? '0' : '') + code.toString(16).toUpperCase();
	}
	return out;
}`,
	__url: `function __url(input: any): any {
	if (input !== null && typeof input === 'object') throw new Error('a URL from a value that is not text has no compiled form');
	const raw: string = String(input);
	let from: number = 0;
	let to: number = raw.length;
	while (from < to && raw.charCodeAt(from) <= 32) from++;
	while (to > from && raw.charCodeAt(to - 1) <= 32) to--;
	let text: string = '';
	let ascii: boolean = true;
	for (let k = from; k < to; k++) {
		const code: number = raw.charCodeAt(k);
		if (code > 126) ascii = false;
		if (code !== 9 && code !== 10 && code !== 13) text += raw.charAt(k);
	}
	let colon: number = 0;
	while (colon < text.length) {
		const code: number = text.charCodeAt(colon);
		const letter: boolean = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
		if (!letter && (colon === 0 || !((code >= 48 && code <= 57) || code === 43 || code === 45 || code === 46))) break;
		colon++;
	}
	if (colon === 0 || colon >= text.length || text.charCodeAt(colon) !== 58) throw new TypeError('Invalid URL');
	const scheme: string = text.slice(0, colon).toLowerCase();
	if (scheme !== 'http' && scheme !== 'https') throw new Error('a URL with a scheme other than http and https has no compiled form');
	if (!ascii) throw new Error('a URL with a character outside ASCII has no compiled form');
	let at: number = colon + 1;
	while (at < text.length && (text.charCodeAt(at) === 47 || text.charCodeAt(at) === 92)) at++;
	let stop: number = at;
	while (stop < text.length) {
		const code: number = text.charCodeAt(stop);
		if (code === 47 || code === 92 || code === 63 || code === 35) break;
		stop++;
	}
	const authority: string = text.slice(at, stop);
	if (authority === '') throw new TypeError('Invalid URL');
	if (authority.includes('@') || authority.includes('[') || authority.includes(']') || authority.includes('%')) throw new Error('a URL with a user name, an IPv6 address or an escape in the host has no compiled form');
	const split: number = authority.indexOf(':');
	const host: string = (split < 0 ? authority : authority.slice(0, split)).toLowerCase();
	const digits: string = split < 0 ? '' : authority.slice(split + 1);
	if (host === '') throw new TypeError('Invalid URL');
	let plain: boolean = true;
	for (let k = 0; k < host.length; k++) {
		const code: number = host.charCodeAt(k);
		if (code <= 32 || code === 60 || code === 62 || code === 94 || code === 124) throw new TypeError('Invalid URL');
		if (!((code >= 97 && code <= 122) || (code >= 48 && code <= 57) || code === 45 || code === 46 || code === 95)) plain = false;
	}
	for (let k = 0; k < digits.length; k++) {
		if (digits.charCodeAt(k) < 48 || digits.charCodeAt(k) > 57) throw new TypeError('Invalid URL');
	}
	if (!plain) throw new Error('a URL with a host that has other characters than letters, digits, "-", "_" and "." has no compiled form');
	const labels: string[] = host.split('.');
	let bytes: number = 0;
	let numeric: boolean = false;
	for (const label of labels) {
		if (label === '' || label.startsWith('xn--')) throw new Error('a URL with an empty or encoded host label has no compiled form');
		let decimal: boolean = true;
		let hex: boolean = label.startsWith('0x');
		for (let j = 0; j < label.length; j++) {
			const code: number = label.charCodeAt(j);
			if (code < 48 || code > 57) decimal = false;
			if (j >= 2 && !((code >= 48 && code <= 57) || (code >= 97 && code <= 102))) hex = false;
		}
		if (decimal && (label === '0' || label.charCodeAt(0) !== 48) && label.length <= 3 && Number(label) <= 255) bytes++;
		numeric = decimal || hex;
	}
	if (numeric && (bytes !== 4 || labels.length !== 4)) throw new Error('a URL with a host that ends in a number has no compiled form');
	let port: string = '';
	if (digits !== '') {
		let lead: number = 0;
		while (lead < digits.length - 1 && digits.charCodeAt(lead) === 48) lead++;
		if (digits.length - lead > 5 || Number(digits) > 65535) throw new TypeError('Invalid URL');
		port = digits.slice(lead);
		if ((scheme === 'http' && port === '80') || (scheme === 'https' && port === '443')) port = '';
	}
	let rest: string = text.slice(stop);
	let fragment: any = null;
	let query: any = null;
	const hashAt: number = rest.indexOf('#');
	if (hashAt >= 0) {
		fragment = __urlText(rest.slice(hashAt + 1), [34, 60, 62, 96]);
		rest = rest.slice(0, hashAt);
	}
	const queryAt: number = rest.indexOf('?');
	if (queryAt >= 0) {
		query = __urlText(rest.slice(queryAt + 1), [34, 35, 39, 60, 62]);
		rest = rest.slice(0, queryAt);
	}
	const path: string[] = [];
	let piece: string = '';
	for (let k = 1; k <= rest.length; k++) {
		const code: number = k < rest.length ? rest.charCodeAt(k) : 0;
		if (k < rest.length && code !== 47 && code !== 92) {
			piece += rest.charAt(k);
			continue;
		}
		const lower: string = piece.toLowerCase();
		const end: boolean = k >= rest.length;
		if (lower === '..' || lower === '.%2e' || lower === '%2e.' || lower === '%2e%2e') {
			if (path.length > 0) path.pop();
			if (end) path.push('');
		} else if (lower === '.' || lower === '%2e') {
			if (end) path.push('');
		} else path.push(__urlText(piece, [34, 35, 60, 62, 63, 94, 96, 123, 125]));
		piece = '';
	}
	const hostText: string = port === '' ? host : host + ':' + port;
	const origin: string = scheme + '://' + hostText;
	const pathname: string = '/' + path.join('/');
	return {
		href: origin + pathname + (query === null ? '' : '?' + query) + (fragment === null ? '' : '#' + fragment),
		origin,
		protocol: scheme + ':',
		host: hostText,
		hostname: host,
		port,
		pathname,
		search: query === null || query === '' ? '' : '?' + query,
		hash: fragment === null || fragment === '' ? '' : '#' + fragment,
	};
}`,
	__bufferText: `function __bufferText(value: any, encoding: string): string {
	if (typeof value !== 'string') throw new Error('a Buffer from a value that is not text has no compiled form');
	if (encoding === 'utf8') return value;
	for (let k = 0; k < value.length; k++) {
		if (value.charCodeAt(k) > 127) throw new Error('a Buffer from ' + encoding + ' text with a character outside ASCII has no compiled form');
	}
	return value;
}`,
	__urlCanParse: `function __urlCanParse(input: any): boolean {
	try {
		__url(input);
		return true;
	} catch (error) {
		if (__isLimit(error)) throw error;
		return false;
	}
}`,
	__urlDecode: `function __urlDecode(text: string): string {
	const spaced: string = text.replaceAll('+', ' ');
	if (!spaced.includes('%')) return spaced;
	try {
		return decodeURIComponent(spaced);
	} catch (error) {
		throw new Error('a URL parameter with an escape that is not UTF-8 has no compiled form');
	}
}`,
	__urlParam: `function __urlParam(search: string, key: any): any {
	const wanted: string = String(key);
	for (const part of search.slice(1).split('&')) {
		if (part === '') continue;
		const cut: number = part.indexOf('=');
		if (__urlDecode(cut < 0 ? part : part.slice(0, cut)) === wanted) return cut < 0 ? '' : __urlDecode(part.slice(cut + 1));
	}
	return null;
}`,
	__urlForm: `function __urlForm(value: any): string {
	if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('URL parameters from a value that is not an object has no compiled form');
	const parts: string[] = [];
	for (const [key, member] of Object.entries(value)) {
		if (typeof member !== 'string' && typeof member !== 'number' && typeof member !== 'boolean') throw new Error('a URL parameter that is not text, a number or a boolean has no compiled form');
		parts.push(__urlFormText(key) + '=' + __urlFormText(String(member)));
	}
	return parts.join('&');
}`,
	__urlFormText: `function __urlFormText(text: string): string {
	let encoded: string = '';
	try {
		encoded = encodeURIComponent(text);
	} catch (error) {
		throw new Error('a URL parameter with half of a surrogate pair has no compiled form');
	}
	return encoded
		.replaceAll('%20', '+')
		.replaceAll('!', '%21')
		.replaceAll("'", '%27')
		.replaceAll('(', '%28')
		.replaceAll(')', '%29')
		.replaceAll('~', '%7E');
}`,
	...MOMENT_HELPERS,
};

const PURE_GLOBALS = new Set([
	'undefined',
	'NaN',
	'Infinity',
	'Object',
	'JSON',
	'Math',
	'Array',
	'String',
	'Number',
	'Boolean',
	'parseInt',
	'parseFloat',
	'isNaN',
	'isFinite',
	'encodeURIComponent',
	'decodeURIComponent',
	'encodeURI',
]);
const PURE_CALLS = new Set([
	'encodeURIComponent',
	'decodeURIComponent',
	'encodeURI',
	'String',
	'Number',
	'Boolean',
	'parseInt',
	'parseFloat',
]);

const DERIVED_OPERATORS = new Set<ts.SyntaxKind>([
	ts.SyntaxKind.PlusToken,
	ts.SyntaxKind.EqualsEqualsEqualsToken,
	ts.SyntaxKind.ExclamationEqualsEqualsToken,
	ts.SyntaxKind.AmpersandAmpersandToken,
	ts.SyntaxKind.BarBarToken,
	ts.SyntaxKind.QuestionQuestionToken,
]);
const DERIVED_FUNCTIONS = new Set(['String', 'encodeURIComponent', 'btoa']);
const FLAG_OPERATORS = new Set<ts.SyntaxKind>([
	ts.SyntaxKind.EqualsEqualsEqualsToken,
	ts.SyntaxKind.ExclamationEqualsEqualsToken,
	ts.SyntaxKind.EqualsEqualsToken,
	ts.SyntaxKind.ExclamationEqualsToken,
	ts.SyntaxKind.LessThanToken,
	ts.SyntaxKind.LessThanEqualsToken,
	ts.SyntaxKind.GreaterThanToken,
	ts.SyntaxKind.GreaterThanEqualsToken,
]);
const FLAG_METHODS = new Set(['includes', 'startsWith', 'endsWith']);
const FLAG_MARKER = '__CREDFLAG';

function yieldsBoolean(e: ts.Node): boolean {
	if (ts.isParenthesizedExpression(e)) return yieldsBoolean(e.expression);
	if (ts.isPrefixUnaryExpression(e)) return e.operator === ts.SyntaxKind.ExclamationToken;
	if (ts.isBinaryExpression(e)) {
		const kind = e.operatorToken.kind;
		if (FLAG_OPERATORS.has(kind)) return true;
		const logical =
			kind === ts.SyntaxKind.AmpersandAmpersandToken || kind === ts.SyntaxKind.BarBarToken;
		return logical && yieldsBoolean(e.left) && yieldsBoolean(e.right);
	}
	return (
		ts.isCallExpression(e) &&
		ts.isPropertyAccessExpression(e.expression) &&
		FLAG_METHODS.has(e.expression.name.text)
	);
}
const DERIVED_METHODS = new Set([
	'split',
	'pop',
	'join',
	'slice',
	'substring',
	'replace',
	'replaceAll',
	'trim',
	'toLowerCase',
	'toUpperCase',
	'toString',
	'concat',
	'at',
	'padStart',
	'padEnd',
]);

const ERROR_CLASSES: Record<string, string[]> = {
	NodeApiError: ['NodeApiError'],
	NodeOperationError: ['NodeOperationError'],
	NodeError: ['NodeApiError', 'NodeOperationError'],
	UserError: ['UserError'],
	ApplicationError: ['ApplicationError'],
	OperationalError: ['OperationalError'],
	UnexpectedError: ['UnexpectedError'],
};

const GENERIC_ERRORS = new Set([
	'UserError',
	'ApplicationError',
	'OperationalError',
	'UnexpectedError',
]);

const PACKAGE_HELPERS: Record<string, Record<string, string>> = {
	lodash: { isEmpty: '__isEmpty', get: '__get', set: '__set', omit: '__omitKeys' },
	uuid: { validate: '__uuidValid' },
	'mime-types': { lookup: '__mimeLookup' },
	'n8n-workflow': {
		jsonParse: '__jsonParse',
		deepCopy: '__deepCopy',
		toPathSegment: '__toPathSegment',
		isResourceLocatorValue: '__isLocator',
		setSafeObjectProperty: '__setSafe',
		tryToParseNumber: '__toNumber',
	},
};

const PARAMETER_ASSERTIONS: Record<string, string> = {
	assertParamIsString: 'string',
	assertParamIsNumber: 'number',
	assertParamIsBoolean: 'boolean',
};
function isLuxon(imported: { from: string; name: string } | undefined): boolean {
	return imported?.from === 'luxon' && imported.name === 'DateTime';
}

function packageHelper(imported: { from: string; name: string }): string | undefined {
	const slash = imported.from.indexOf('/');
	const pkg =
		imported.from.startsWith('lodash') && slash > 0 ? imported.from.slice(0, slash) : imported.from;
	const name =
		imported.name === 'default'
			? imported.from.slice(imported.from.lastIndexOf('/') + 1)
			: imported.name;
	const table = PACKAGE_HELPERS[pkg];
	return table && Object.hasOwn(table, name) ? table[name] : undefined;
}

const HELPER_USES: Record<string, string[]> = {
	__randomIntOf: ['__randomInt'],
	__changeCase: ['__caseWords'],
	__url: ['__urlText'],
	__urlCanParse: ['__url', '__urlText', '__isLimit'],
	__urlParam: ['__urlDecode'],
	__urlForm: ['__urlFormText'],
	__assertParam: ['__error'],
	__assertParamTypes: ['__error'],
	__validateParams: ['__error', '__paramFits'],
	__jsonParse: ['__error'],
	__toNumber: ['__error'],
	__missing: ['__error'],
	__binaryOf: ['__error'],
	__inputBytes: ['__fileBytes', '__storedBytes'],
	...MOMENT_HELPER_USES,
	__out: ['__outItem', '__assign'],
	__outPaired: ['__outItem', '__assign', '__failedJson', '__pairOf'],
	__outFailed: ['__outItem', '__assign', '__failedJson'],
	__mimeLookup: ['__pathParts', '__extName', '__MIME'],
	__prepareBinary: [
		'__mimeLookup',
		'__mimeExtension',
		'__pathParts',
		'__extName',
		'__fileType',
		'__prettyBytes',
		'__MIME',
	],
};

const LIMIT_TEXT = 'has no compiled form';
const BYTES_USE =
	'file bytes have a compiled form only as a file of a multipart request and with `length`';

const BUFFER_ENCODINGS: Record<string, string> = {
	utf8: 'utf8',
	'utf-8': 'utf8',
	base64: 'base64',
	base64url: 'base64url',
	hex: 'hex',
};

function bufferEncoding(e: ts.Expression | undefined): string | undefined {
	if (e === undefined) return 'utf8';
	return ts.isStringLiteral(e) && Object.hasOwn(BUFFER_ENCODINGS, e.text)
		? BUFFER_ENCODINGS[e.text]
		: undefined;
}

const BYTES_HELPERS = new Set(['__fileBytes', '__inputBytes', '__storedBytes', '__bytesFrom']);
const INPUT_BYTES_HELPERS = new Set(['__fileBytes', '__inputBytes', '__storedBytes']);
const HOLDS_BYTES = [
	'__fileBytes',
	'__inputBytes',
	'__storedBytes',
	'__bytesFrom',
	'__prepareBinary',
];
const PREPARE_SOURCE =
	'binary data has a compiled form only from the body of a response: file bytes of an input item cannot become new binary data';

function isPlainBuffer(e: ts.Node): e is ts.CallExpression {
	return (
		ts.isCallExpression(e) &&
		ts.isPropertyAccessExpression(e.expression) &&
		ts.isIdentifier(e.expression.expression) &&
		e.expression.expression.text === 'Buffer' &&
		e.expression.name.text === 'from' &&
		(e.arguments.length === 1 || e.arguments.length === 2) &&
		!ts.isSpreadElement(e.arguments[0]) &&
		(e.arguments.length === 1 || bufferEncoding(e.arguments[1]) === 'utf8')
	);
}

function givesInputBytes(e: ts.Expression): boolean {
	const value =
		ts.isAwaitExpression(e) ||
		ts.isParenthesizedExpression(e) ||
		ts.isAsExpression(e) ||
		ts.isNonNullExpression(e)
			? e.expression
			: e;
	if (value !== e) return givesInputBytes(value);
	return (
		isBase64Buffer(value) ||
		(ts.isCallExpression(value) &&
			ts.isIdentifier(value.expression) &&
			INPUT_BYTES_HELPERS.has(value.expression.text))
	);
}

function isBase64Buffer(e: ts.Node): e is ts.CallExpression {
	return (
		ts.isCallExpression(e) &&
		ts.isPropertyAccessExpression(e.expression) &&
		ts.isIdentifier(e.expression.expression) &&
		e.expression.expression.text === 'Buffer' &&
		e.expression.name.text === 'from' &&
		e.arguments.length === 2 &&
		!ts.isSpreadElement(e.arguments[0]) &&
		bufferEncoding(e.arguments[1]) === 'base64'
	);
}

function givesBytes(e: ts.Expression): boolean {
	const value = ts.isAwaitExpression(e) || ts.isParenthesizedExpression(e) ? e.expression : e;
	if (value !== e) return givesBytes(value);
	return (
		isBase64Buffer(value) ||
		(ts.isCallExpression(value) &&
			ts.isIdentifier(value.expression) &&
			BYTES_HELPERS.has(value.expression.text))
	);
}

function uncast(e: ts.Expression): ts.Expression {
	let value = e;
	while (
		ts.isAsExpression(value) ||
		ts.isParenthesizedExpression(value) ||
		ts.isNonNullExpression(value) ||
		ts.isAwaitExpression(value) ||
		ts.isTypeAssertionExpression(value)
	)
		value = value.expression;
	return value;
}

function buffersForBinaryData(root: ts.Node, into: Set<ts.Node>) {
	const held = new Map<string, ts.Node>();
	const other = new Set<string>();
	const walk = (n: ts.Node) => {
		if (
			ts.isCallExpression(n) &&
			ts.isIdentifier(n.expression) &&
			n.expression.text === '__prepareBinary' &&
			n.arguments.length > 0
		) {
			const given = uncast(n.arguments[0]);
			if (isPlainBuffer(given)) into.add(given);
			if (isPlainBuffer(given) || !ts.isIdentifier(given)) walk(given);
			n.arguments.slice(1).forEach(walk);
			return;
		}
		if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
			const made = uncast(n.initializer);
			if (isPlainBuffer(made)) {
				if (held.has(n.name.text)) other.add(n.name.text);
				held.set(n.name.text, made);
			} else other.add(n.name.text);
			walk(n.initializer);
			return;
		}
		if (ts.isIdentifier(n)) other.add(n.text);
		ts.forEachChild(n, walk);
	};
	walk(root);
	for (const [name, made] of held) if (!other.has(name)) into.add(made);
}

const BINARY_HELPERS = [
	'__binaryOf',
	'__inputBytes',
	'__storedBytes',
	'__storedMetadata',
	'__fileBytes',
	'__bytesFrom',
	'__prepareBinary',
];

function mentionsBinary(n: ts.Node): boolean {
	if (
		(ts.isIdentifier(n) || ts.isStringLiteralLike(n)) &&
		(n.text === 'binary' || n.text === '$binary')
	)
		return true;
	return ts.forEachChild(n, mentionsBinary) ?? false;
}

function mentionsEncoding(n: ts.Node): boolean {
	if ((ts.isIdentifier(n) || ts.isStringLiteralLike(n)) && n.text === 'encoding') return true;
	return ts.forEachChild(n, mentionsEncoding) ?? false;
}

function mentionsBuffer(n: ts.Node): boolean {
	if (ts.isIdentifier(n) && n.text === 'Buffer') return true;
	return ts.forEachChild(n, mentionsBuffer) ?? false;
}

const TEXT_HELPERS = new Set([
	'__changeCase',
	'__url',
	'__urlCanParse',
	'__urlParam',
	'__urlForm',
	...Object.keys(MOMENT_HELPERS),
]);

const URL_PROPERTIES = new Set([
	'href',
	'origin',
	'protocol',
	'host',
	'hostname',
	'port',
	'pathname',
	'search',
	'hash',
]);

function isUrlNew(e: ts.Node | undefined): e is ts.NewExpression {
	return (
		e !== undefined &&
		ts.isNewExpression(e) &&
		ts.isIdentifier(e.expression) &&
		e.expression.text === 'URL' &&
		e.arguments?.length === 1 &&
		!ts.isSpreadElement(e.arguments[0])
	);
}

function isGetCall(read: ts.Node): boolean {
	const call = read.parent;
	return (
		ts.isPropertyAccessExpression(read) &&
		read.name.text === 'get' &&
		ts.isCallExpression(call) &&
		call.expression === read &&
		call.arguments.length === 1 &&
		!ts.isSpreadElement(call.arguments[0])
	);
}

function isWritten(read: ts.Node): boolean {
	const p = read.parent;
	if (ts.isBinaryExpression(p))
		return (
			p.left === read &&
			p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
			p.operatorToken.kind <= ts.SyntaxKind.LastAssignment
		);
	return (
		ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p) || ts.isDeleteExpression(p)
	);
}

function urlVariables(
	root: ts.Node,
	counts: Map<string, number>,
): { urls: Set<string>; params: Set<string> } {
	const urls = new Set<string>();
	const params = new Set<string>();
	const collect = (n: ts.Node) => {
		if (ts.isVariableDeclaration(n) && isUrlNew(n.initializer)) {
			if (ts.isIdentifier(n.name)) urls.add(n.name.text);
			else if (ts.isObjectBindingPattern(n.name)) {
				for (const e of n.name.elements) {
					const key = e.propertyName ?? e.name;
					if (ts.isIdentifier(key) && key.text === 'searchParams' && ts.isIdentifier(e.name))
						params.add(e.name.text);
				}
			}
		}
		if (
			ts.isBinaryExpression(n) &&
			n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
			ts.isIdentifier(n.left) &&
			isUrlNew(n.right)
		)
			urls.add(n.left.text);
		ts.forEachChild(n, collect);
	};
	collect(root);
	const check = (n: ts.Node) => {
		if (ts.isIdentifier(n) && (urls.has(n.text) || params.has(n.text))) {
			const p = n.parent;
			const named =
				(ts.isPropertyAccessExpression(p) && p.name === n) ||
				(ts.isPropertyAssignment(p) && p.name === n) ||
				(ts.isBindingElement(p) && p.propertyName === n);
			const read = ts.isPropertyAccessExpression(p) && p.expression === n ? p : undefined;
			const asUrl =
				(ts.isVariableDeclaration(p) &&
					p.name === n &&
					(!p.initializer || isUrlNew(p.initializer))) ||
				(ts.isBinaryExpression(p) &&
					p.left === n &&
					p.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
					isUrlNew(p.right)) ||
				(read !== undefined && URL_PROPERTIES.has(read.name.text) && !isWritten(read)) ||
				(read !== undefined && read.name.text === 'searchParams' && isGetCall(read.parent));
			const asParams =
				(ts.isBindingElement(p) && p.name === n && isUrlNew(p.parent.parent.initializer)) ||
				(read !== undefined && isGetCall(read));
			if (!named && !asUrl) urls.delete(n.text);
			if (!named && !asParams) params.delete(n.text);
		}
		ts.forEachChild(n, check);
	};
	check(root);
	for (const name of [...urls, ...params]) {
		if (counts.get(name) !== 1 || (urls.has(name) && params.has(name))) {
			urls.delete(name);
			params.delete(name);
		}
	}
	return { urls, params };
}

function guardCatches(root: ts.Node): ts.Node {
	const visit = (n: ts.Node): ts.Node => {
		const out = ts.visitEachChild(n, visit, undefined);
		if (!ts.isCatchClause(out)) return out;
		const declared = out.variableDeclaration?.name;
		const caught =
			declared && ts.isIdentifier(declared) ? declared : f.createIdentifier('__caught');
		const unpack =
			declared && !ts.isIdentifier(declared)
				? [
						f.createVariableStatement(
							undefined,
							f.createVariableDeclarationList(
								[f.createVariableDeclaration(declared, undefined, undefined, caught)],
								ts.NodeFlags.Const,
							),
						),
					]
				: [];
		return f.updateCatchClause(
			out,
			f.createVariableDeclaration(caught),
			f.createBlock(
				[
					f.createIfStatement(call('__isLimit', caught), f.createThrowStatement(caught)),
					...unpack,
					...out.block.statements,
				],
				true,
			),
		);
	};
	return ts.visitNode(root, visit);
}

const CHANGE_CASE: Record<string, [style: string, delimiter: string]> = {
	noCase: ['lower', ' '],
	snakeCase: ['lower', '_'],
	kebabCase: ['lower', '-'],
	dotCase: ['lower', '.'],
	pathCase: ['lower', '/'],
	constantCase: ['upper', '_'],
	capitalCase: ['capital', ' '],
	trainCase: ['capital', '-'],
	pascalSnakeCase: ['capital', '_'],
	sentenceCase: ['sentence', ' '],
	camelCase: ['camel', ''],
	pascalCase: ['pascal', ''],
};

const PACKAGE_CONSTANTS: Record<string, string | number> = {
	SEND_AND_WAIT_OPERATION: 'sendAndWait',
	BINARY_ENCODING: 'base64',
};

function isCredentialMarker(e: ts.Node): e is ts.CallExpression {
	return (
		ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === '__CREDFIELD'
	);
}

const CREDENTIAL_PREFIX = '__CREDENTIAL_';
const isWholeCredential = (e: ts.Node): e is ts.Identifier =>
	ts.isIdentifier(e) && e.text.startsWith(CREDENTIAL_PREFIX);
function plainBindings(
	pattern: ts.ObjectBindingPattern,
): Array<{ name: string; field: string }> | undefined {
	const out: Array<{ name: string; field: string }> = [];
	for (const e of pattern.elements) {
		const key = e.propertyName ?? e.name;
		if (!ts.isIdentifier(e.name) || !ts.isIdentifier(key) || e.initializer || e.dotDotDotToken)
			return undefined;
		out.push({ name: e.name.text, field: key.text });
	}
	return out;
}
const EQUALITY_OPERATORS = new Set<ts.SyntaxKind>([
	ts.SyntaxKind.EqualsEqualsEqualsToken,
	ts.SyntaxKind.ExclamationEqualsEqualsToken,
	ts.SyntaxKind.EqualsEqualsToken,
	ts.SyntaxKind.ExclamationEqualsToken,
]);

function credentialTypeOf(e: ts.Expression | undefined): string {
	const callExpression = e && ts.isAwaitExpression(e) ? e.expression : e;
	const first =
		callExpression && ts.isCallExpression(callExpression) ? callExpression.arguments[0] : undefined;
	return first && ts.isStringLiteral(first) && /^[A-Za-z0-9_]+$/.test(first.text) ? first.text : '';
}

const CONTEXT_PARAMS: string[] = [];
const SELF = '__self';
const EXECUTE_CONTEXT_MEMBERS = new Set(['getInputData', 'getNodeParameter', 'getNode', 'helpers']);
const NO_DISPATCH = '__NODISPATCH';
const REQUEST_HELPERS = new Set([
	'request',
	'httpRequest',
	'requestWithAuthentication',
	'httpRequestWithAuthentication',
	'requestOAuth2',
	'requestOAuth1',
]);

type Literal = string | number | boolean | null | undefined;

function literalOf(node: ts.Expression): { value: Literal } | undefined {
	if (ts.isParenthesizedExpression(node)) return literalOf(node.expression);
	if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
		return { value: node.text };
	if (ts.isNumericLiteral(node)) return { value: Number(node.text) };
	if (node.kind === ts.SyntaxKind.TrueKeyword) return { value: true };
	if (node.kind === ts.SyntaxKind.FalseKeyword) return { value: false };
	if (node.kind === ts.SyntaxKind.NullKeyword) return { value: null };
	if (ts.isIdentifier(node) && node.text === 'undefined') return { value: undefined };
	if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) {
		const inner = literalOf(node.operand);
		if (inner && typeof inner.value === 'number') return { value: -inner.value };
	}
	return undefined;
}

function expressionOf(value: unknown): ts.Expression {
	if (value === undefined) return f.createIdentifier('undefined');
	if (value === null) return f.createNull();
	if (typeof value === 'string') return f.createStringLiteral(value);
	if (typeof value === 'boolean') return value ? f.createTrue() : f.createFalse();
	if (typeof value === 'number') {
		return value < 0
			? f.createPrefixUnaryExpression(ts.SyntaxKind.MinusToken, f.createNumericLiteral(-value))
			: f.createNumericLiteral(value);
	}
	if (Array.isArray(value)) return f.createArrayLiteralExpression(value.map(expressionOf));
	if (typeof value === 'object') {
		return f.createObjectLiteralExpression(
			Object.entries(value).map(([k, v]) =>
				f.createPropertyAssignment(f.createStringLiteral(k), expressionOf(v)),
			),
		);
	}
	throw new Error(`a parameter value of type ${typeof value} has no compiled form`);
}

export function hasExpression(value: unknown): boolean {
	if (typeof value === 'string') return value.startsWith('=');
	if (Array.isArray(value)) return value.some(hasExpression);
	if (typeof value === 'object' && value !== null) return Object.values(value).some(hasExpression);
	return false;
}

const EXTRACT_INPUT_LIMIT = 4096;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractedBy(rule: { pattern: string; flags: string }, value: unknown): string | undefined {
	if (typeof value !== 'string' || value.length > EXTRACT_INPUT_LIMIT) return undefined;
	try {
		const found = new RegExp(rule.pattern, rule.flags).exec(value);
		return found && found.length === 2 && typeof found[1] === 'string' ? found[1] : undefined;
	} catch {
		return undefined;
	}
}

function call(name: string, ...args: ts.Expression[]): ts.CallExpression {
	return f.createCallExpression(f.createIdentifier(name), undefined, args);
}

function isThisCall(node: ts.Node | undefined, ...path: string[]): node is ts.CallExpression {
	if (!node || !ts.isCallExpression(node)) return false;
	let target: ts.Expression = node.expression;
	for (let k = path.length - 1; k >= 0; k--) {
		if (!ts.isPropertyAccessExpression(target) || target.name.text !== path[k]) return false;
		target = target.expression;
	}
	return target.kind === ts.SyntaxKind.ThisKeyword;
}

function isPure(node: ts.Expression): boolean {
	if (literalOf(node) || ts.isIdentifier(node) || ts.isRegularExpressionLiteral(node)) return true;
	if (ts.isPropertyAccessExpression(node)) return isPure(node.expression);
	if (ts.isArrayLiteralExpression(node)) return node.elements.every(isPure);
	if (ts.isObjectLiteralExpression(node)) {
		return node.properties.every(
			(p) =>
				ts.isPropertyAssignment(p) && !ts.isComputedPropertyName(p.name) && isPure(p.initializer),
		);
	}
	if (ts.isBinaryExpression(node)) {
		const op = node.operatorToken.kind;
		return op === ts.SyntaxKind.QuestionQuestionToken && isPure(node.left) && isPure(node.right);
	}
	return false;
}

function ends(node: ts.Statement): boolean {
	if (ts.isReturnStatement(node) || ts.isThrowStatement(node)) return true;
	if (ts.isContinueStatement(node) || ts.isBreakStatement(node)) return true;
	if (ts.isBlock(node))
		return node.statements.length > 0 && ends(node.statements[node.statements.length - 1]);
	return false;
}

function looseEquals(a: Literal, b: Literal): boolean {
	const nullish = (v: Literal) => v === null || v === undefined;
	if (nullish(a) || nullish(b)) return nullish(a) && nullish(b);
	if (typeof a === typeof b) return a === b;
	return Number(a) === Number(b);
}

function compare(op: ts.SyntaxKind, a: Literal, b: Literal): Literal | typeof NO_FOLD {
	switch (op) {
		case ts.SyntaxKind.EqualsEqualsEqualsToken:
			return a === b;
		case ts.SyntaxKind.ExclamationEqualsEqualsToken:
			return a !== b;
		case ts.SyntaxKind.EqualsEqualsToken:
			return looseEquals(a, b);
		case ts.SyntaxKind.ExclamationEqualsToken:
			return !looseEquals(a, b);
		default:
	}

	if (typeof a !== 'number' || typeof b !== 'number') {
		if (op === ts.SyntaxKind.PlusToken && typeof a === 'string' && typeof b === 'string')
			return a + b;
		return NO_FOLD;
	}
	switch (op) {
		case ts.SyntaxKind.LessThanToken:
			return a < b;
		case ts.SyntaxKind.LessThanEqualsToken:
			return a <= b;
		case ts.SyntaxKind.GreaterThanToken:
			return a > b;
		case ts.SyntaxKind.GreaterThanEqualsToken:
			return a >= b;
		default:
			return NO_FOLD;
	}
}
const NO_FOLD = Symbol('no fold');
const UNKNOWN = Symbol('unknown');

interface FileModel {
	path: string;
	sf: ts.SourceFile;

	declarations: Map<string, ts.FunctionDeclaration | ts.VariableDeclaration | ts.ClassDeclaration>;

	imports: Map<string, { from: string; name: string }>;

	namespaces: Map<string, string>;

	exportLocal: Map<string, string>;

	exportFrom: Map<string, { from: string; name: string }>;

	exportStar: string[];
}

interface Resolved {
	file: FileModel;
	node?: ts.FunctionDeclaration | ts.VariableDeclaration | ts.ClassDeclaration;
}

interface Unit {
	name: string;
	node:
		| ts.FunctionDeclaration
		| ts.VariableDeclaration
		| ts.MethodDeclaration
		| ts.ClassDeclaration;
	file: FileModel;
	withContext: boolean;
	self?: string;
	credentialType?: string;
	isStatic?: boolean;
	optional?: boolean;
}

type FieldShape = { cls: string } | { table: Map<string, string> };

const MAX_TABLE_HOPS = 4;

const MAX_PARSED = 256;

const MAX_FOLD_ROUNDS = 40;

const PARSED = new Map<string, { text: string; local: string; model: FileModel }>();

class Specialiser {
	readonly errors: string[] = [];
	readonly notes: string[] = [];
	readonly helpers = new Set<string>();
	private readonly files = new Map<string, FileModel>();
	private readonly units = new Map<string, Unit>();
	private readonly output: Array<{ name: string; node: ts.Node; sf: ts.SourceFile }> = [];
	private readonly printer = ts.createPrinter({
		removeComments: true,
		newLine: ts.NewLineKind.LineFeed,
	});
	private readonly input: SpecialiseInput;
	private readonly queue: Unit[] = [];

	private readonly contextCallees = new Set<string>();
	private changed = false;
	private entryUnit: Unit | undefined;

	constructor(input: SpecialiseInput) {
		this.input = input;
	}

	private reparse(node: ts.Node, sf: ts.SourceFile): { node: ts.Node; sf: ts.SourceFile } {
		const text = this.printer.printNode(ts.EmitHint.Unspecified, node, sf);
		const next = ts.createSourceFile(
			'unit.js',
			text,
			ts.ScriptTarget.ES2022,
			true,
			ts.ScriptKind.JS,
		);
		return { node: next.statements[0], sf: next };
	}

	private error(where: string, message: string) {
		const text = `${where}: ${message}`;
		if (!this.errors.includes(text)) this.errors.push(text);
	}

	origins(): UnitOrigin[] {
		const all = [...(this.entryUnit ? [this.entryUnit] : []), ...this.units.values()];
		return all.map((unit) => {
			const { node } = unit;
			const owner =
				ts.isMethodDeclaration(node) && ts.isClassLike(node.parent)
					? node.parent.name?.text
					: undefined;
			return {
				unit: unit.name,
				file: unit.file.path,
				declared: node.name?.getText(unit.file.sf) ?? unit.name,
				...(owner === undefined ? {} : { owner }),
			};
		});
	}

	private helper(name: string, ...args: ts.Expression[]): ts.CallExpression {
		this.helpers.add(name);
		if (name === '__getPath') this.helpers.add('__get');
		for (const used of HELPER_USES[name] ?? []) this.helpers.add(used);
		return call(name, ...args);
	}

	private getsSessionToken(type: string): boolean {
		const path = this.input.credentialEntry?.(type);
		const file = path === undefined ? undefined : this.load(path);
		if (!file || !/expirable:\s*true/.test(file.sf.text)) return false;
		let found = false;
		file.sf.forEachChild((st) => {
			if (!ts.isClassDeclaration(st)) return;
			for (const m of st.members) {
				if (
					(ts.isMethodDeclaration(m) || ts.isPropertyDeclaration(m)) &&
					ts.isIdentifier(m.name) &&
					m.name.text === 'preAuthentication'
				)
					found = true;
			}
		});
		return found;
	}

	private authenticateUnit(type: string, optional = false): string | undefined {
		const path = this.input.credentialEntry?.(type);
		const file = path === undefined ? undefined : this.load(path);
		if (!file) return undefined;
		let method: ts.MethodDeclaration | undefined;
		file.sf.forEachChild((st) => {
			if (!ts.isClassDeclaration(st)) return;
			for (const m of st.members) {
				if (ts.isMethodDeclaration(m) && ts.isIdentifier(m.name) && m.name.text === 'authenticate')
					method = m;
			}
		});
		if (!method || !/^[A-Za-z0-9_]+$/.test(type)) return undefined;
		const name = `authenticate_${type}`;
		const known = this.units.get(name);
		if (known && !optional) known.optional = false;
		if (!known) {
			const unit: Unit = {
				name,
				node: method,
				file,
				withContext: false,
				credentialType: type,
				optional,
			};
			this.units.set(name, unit);
			this.queue.push(unit);
		}
		return name;
	}

	private credentialField(type: string, name: string): ts.Expression {
		const fields = this.input.credentialFields?.[type];
		if (fields && Object.hasOwn(fields, name)) return expressionOf(fields[name]);
		return call('__CREDFIELD', f.createStringLiteral(name));
	}

	private load(path: string): FileModel | undefined {
		const known = this.files.get(path);
		if (known) return known;
		const text = this.input.readFile(path);
		if (text === undefined) return undefined;
		const local = Object.keys(this.input.aliases ?? {}).join('\n');
		const kept = PARSED.get(path);
		if (kept && kept.text === text && kept.local === local) {
			this.files.set(path, kept.model);
			return kept.model;
		}

		let js = text;
		if (path.endsWith('.ts')) {
			js = ts.transpileModule(text, {
				compilerOptions: {
					target: ts.ScriptTarget.ES2022,
					module: ts.ModuleKind.ESNext,
					removeComments: true,
				},
			}).outputText;
		} else if (isCommonJs(text)) {
			js = commonJsToModule(text, (spec) => this.isLocal(spec));
		}
		const sf = ts.createSourceFile(path, js, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
		const model: FileModel = {
			path,
			sf,
			declarations: new Map(),
			imports: new Map(),
			namespaces: new Map(),
			exportLocal: new Map(),
			exportFrom: new Map(),
			exportStar: [],
		};
		for (const st of sf.statements) {
			if (ts.isFunctionDeclaration(st) && st.name) model.declarations.set(st.name.text, st);
			if (ts.isClassDeclaration(st) && st.name) model.declarations.set(st.name.text, st);
			if (ts.isVariableStatement(st)) {
				for (const d of st.declarationList.declarations) {
					if (ts.isIdentifier(d.name)) model.declarations.set(d.name.text, d);
				}
			}
			if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
				const from = st.moduleSpecifier.text;
				const clause = st.importClause;
				if (clause?.name) model.imports.set(clause.name.text, { from, name: 'default' });
				const named = clause?.namedBindings;
				if (named && ts.isNamedImports(named)) {
					for (const e of named.elements) {
						model.imports.set(e.name.text, { from, name: (e.propertyName ?? e.name).text });
					}
				}
			}
		}
		for (const st of sf.statements) {
			if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
				const named = st.importClause?.namedBindings;
				if (named && ts.isNamespaceImport(named))
					model.namespaces.set(named.name.text, st.moduleSpecifier.text);
			}
			if (!ts.isExportDeclaration(st)) continue;
			const from =
				st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)
					? st.moduleSpecifier.text
					: undefined;
			const clause = st.exportClause;
			if (!clause) {
				if (from !== undefined) model.exportStar.push(from);
			} else if (ts.isNamespaceExport(clause)) {
				if (from !== undefined) model.exportFrom.set(clause.name.text, { from, name: '*' });
			} else {
				for (const e of clause.elements) {
					const local = (e.propertyName ?? e.name).text;
					if (from !== undefined) model.exportFrom.set(e.name.text, { from, name: local });
					else model.exportLocal.set(e.name.text, local);
				}
			}
		}
		this.files.set(path, model);
		PARSED.delete(path);
		if (PARSED.size >= MAX_PARSED) {
			for (const oldest of PARSED.keys()) {
				PARSED.delete(oldest);
				break;
			}
		}
		PARSED.set(path, { text, local, model });
		return model;
	}

	private isLocal(spec: string): boolean {
		return (
			spec.startsWith('.') ||
			Object.keys(this.input.aliases ?? {}).some((prefix) => spec.startsWith(prefix))
		);
	}

	private resolveModule(from: FileModel, spec: string): FileModel | undefined {
		let base: string | undefined;
		if (spec.startsWith('.')) {
			const parts = from.path.split('/').slice(0, -1);
			for (const part of spec.split('/')) {
				if (part === '..') parts.pop();
				else if (part !== '.') parts.push(part);
			}
			base = parts.join('/');
		} else {
			for (const [prefix, folder] of Object.entries(this.input.aliases ?? {})) {
				if (spec.startsWith(prefix)) base = folder + spec.slice(prefix.length);
			}
		}
		if (base === undefined) return undefined;
		for (const candidate of [
			`${base}.ts`,
			`${base}/index.ts`,
			`${base}.js`,
			`${base}/index.js`,
			base,
		]) {
			const found = this.load(candidate);
			if (found) return found;
		}
		return undefined;
	}

	private need(name: string, file: FileModel, withContext: boolean, where: string) {
		const found = this.member(file, name);
		const home = found?.file;
		const node = found?.node;
		if (!home || !node) {
			const imported = file.imports.get(name);
			if (imported && !this.isLocal(imported.from)) {
				this.error(
					where,
					`'${name}' comes from the package '${imported.from}', which has no compiled form`,
				);
			} else {
				this.error(where, `the name '${name}' has no declaration that the compiler can read`);
			}
			return;
		}
		const known = this.units.get(name);
		if (known) {
			if (known.node !== node) this.error(where, `two declarations have the name '${name}'`);
			return;
		}
		const unit: Unit = { name, node, file: home, withContext };
		this.units.set(name, unit);
		this.queue.push(unit);
	}

	private parameter(node: ts.CallExpression, late = false): ts.Expression {
		const [nameArg, indexArg, fallback, options] = node.arguments;
		if (!nameArg || !(ts.isStringLiteral(nameArg) || ts.isNoSubstitutionTemplateLiteral(nameArg))) {
			return node;
		}

		let extract = false;
		if (options && literalOf(options)?.value !== undefined) return node;
		if (options && !literalOf(options)) {
			if (!ts.isObjectLiteralExpression(options)) return node;
			for (const member of options.properties) {
				if (!ts.isPropertyAssignment(member) || !ts.isIdentifier(member.name)) return node;
				const flag = literalOf(member.initializer)?.value;
				if (typeof flag !== 'boolean') return node;
				if (member.name.text === 'extractValue') extract = flag;
				else if (member.name.text !== 'skipValidation') return node;
			}
		}
		const path = nameArg.text.split('.');
		let value: unknown = this.input.parameters;
		for (const key of path) {
			value =
				typeof value === 'object' && value !== null
					? (value as Record<string, unknown>)[key]
					: undefined;
		}
		const dynamic = hasExpression(value);
		const entry = f.createElementAccessExpression(
			f.createElementAccessExpression(
				f.createIdentifier(ITEM_PARAMETERS),
				indexArg ?? f.createIdentifier('undefined'),
			),
			f.createStringLiteral(nameArg.text),
		);
		const read = this.input.deferredParameters?.includes(nameArg.text)
			? this.helper('__parameterValue', entry)
			: entry;
		if (extract) {
			const kind = this.input.parameterKind?.(nameArg.text);
			if (kind?.type === 'filter' || kind?.extract) return node;
			const locator =
				isRecord(value) &&
				'mode' in value &&
				'value' in value &&
				(value.__rl === true || kind?.type === 'resourceLocator')
					? value
					: undefined;
			if (locator) {
				if (typeof locator.mode !== 'string' || hasExpression(locator.mode)) return node;
				const rule = kind?.modes ? (kind.modes[locator.mode] ?? null) : undefined;
				if (rule === undefined && locator.mode !== 'id' && locator.mode !== 'list') return node;
				if (rule) {
					const extracted = dynamic ? undefined : extractedBy(rule, locator.value);
					return extracted === undefined ? node : f.createStringLiteral(extracted);
				}
				if (dynamic) {
					return this.helper(
						'__deepCopy',
						f.createPropertyAccessChain(
							read,
							f.createToken(ts.SyntaxKind.QuestionDotToken),
							'value',
						),
					);
				}
				return expressionOf(locator.value);
			}
			if (dynamic && (kind === undefined || kind.type === 'resourceLocator')) return node;
		}
		if (dynamic) return this.helper('__deepCopy', read);
		if (value !== undefined) return expressionOf(value);
		if (path.length === 1 && this.input.defaults && path[0] in this.input.defaults) {
			return expressionOf(this.input.defaults[path[0]]);
		}
		const absent =
			!fallback || (literalOf(fallback) !== undefined && literalOf(fallback)?.value === undefined);
		if (late && absent) return node;
		if (absent) return this.helper('__missing', f.createStringLiteral(nameArg.text));
		return fallback;
	}

	private bind(root: ts.Node, unit: Unit, isExecute: boolean): ts.Node {
		const localNames = bindingsOf(root);
		const regexConstants = new Map<string, string>();
		const collectRegex = (n: ts.Node) => {
			if (
				ts.isVariableDeclaration(n) &&
				ts.isIdentifier(n.name) &&
				n.initializer &&
				ts.isRegularExpressionLiteral(n.initializer)
			) {
				const flags = n.initializer.text.slice(n.initializer.text.lastIndexOf('/') + 1);
				if (localNames.get(n.name.text) === 1 && !/[gy]/.test(flags))
					regexConstants.set(n.name.text, n.initializer.text);
			}
			ts.forEachChild(n, collectRegex);
		};
		collectRegex(root);
		const urlNames = urlVariables(root, localNames);
		let depth = 0;

		const visit = (node: ts.Node): ts.Node | ts.Node[] | undefined => {
			const nested =
				node !== root && (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node));
			const arrow = node !== root && ts.isArrowFunction(node);
			if (nested || arrow) depth++;
			const out = rewrite(node);
			if (nested || arrow) depth--;
			return out;
		};
		const each = <T extends ts.Node>(node: T): T => ts.visitEachChild(node, visit, undefined);

		const args = (node: ts.CallExpression | ts.NewExpression, from = 0): ts.Expression[] =>
			(node.arguments ?? []).slice(from).map((a) => ts.visitNode(a, visit) as ts.Expression);

		const rewrite = (node: ts.Node): ts.Node | ts.Node[] | undefined => {
			const credentialCall = (e: ts.Expression) =>
				isThisCall(e, 'getCredentials') ||
				(ts.isAwaitExpression(e) && isThisCall(e.expression, 'getCredentials'));

			if (
				ts.isVariableDeclaration(node) &&
				ts.isObjectBindingPattern(node.name) &&
				node.initializer &&
				credentialCall(node.initializer)
			) {
				const plain = node.name.elements.every(
					(e) =>
						ts.isIdentifier(e.name) &&
						!e.initializer &&
						!e.dotDotDotToken &&
						(!e.propertyName || ts.isIdentifier(e.propertyName)),
				);
				if (plain) {
					return node.name.elements.map((e) =>
						f.createVariableDeclaration(
							(e.name as ts.Identifier).text,
							undefined,
							undefined,
							this.credentialField(
								credentialTypeOf(node.initializer),
								((e.propertyName ?? e.name) as ts.Identifier).text,
							),
						),
					);
				}
			}

			if (ts.isPropertyAccessExpression(node)) {
				const inner = ts.isParenthesizedExpression(node.expression)
					? node.expression.expression
					: node.expression;
				if (credentialCall(inner))
					return this.credentialField(credentialTypeOf(inner), node.name.text);
			}
			if (ts.isAwaitExpression(node) && isThisCall(node.expression, 'getCredentials')) {
				return f.createIdentifier(CREDENTIAL_PREFIX + credentialTypeOf(node));
			}
			if (isThisCall(node, 'getCredentials'))
				return f.createIdentifier(CREDENTIAL_PREFIX + credentialTypeOf(node));
			if (isThisCall(node, 'getNodeParameter'))
				return this.parameter(f.updateCallExpression(node, node.expression, undefined, args(node)));
			if (isThisCall(node, 'getInputData') && readsFirstInput(node))
				return f.createIdentifier('__items');
			if (
				ts.isCallExpression(node) &&
				node.arguments.length === 0 &&
				ts.isPropertyAccessExpression(node.expression) &&
				node.expression.name.text === 'entries' &&
				ts.isForOfStatement(node.parent) &&
				node.parent.expression === node &&
				isInputData(node.expression.expression)
			)
				return this.helper(
					'__entries',
					ts.visitNode(node.expression.expression, visit) as ts.Expression,
				);
			if (
				ts.isBinaryExpression(node) &&
				node.operatorToken.kind === ts.SyntaxKind.InKeyword &&
				node.right.kind === ts.SyntaxKind.ThisKeyword &&
				ts.isStringLiteral(node.left) &&
				unit.credentialType === undefined &&
				EXECUTE_CONTEXT_MEMBERS.has(node.left.text)
			)
				return f.createTrue();
			if (isThisCall(node, 'continueOnFail'))
				return this.input.continueOnFail ? f.createTrue() : f.createFalse();
			if (node.kind === ts.SyntaxKind.ThisKeyword) {
				const call = node.parent;
				if (
					call &&
					(ts.isCallExpression(call) || ts.isNewExpression(call)) &&
					call.arguments?.some((a) => a === node)
				)
					return f.createIdentifier('__THIS');
			}
			if (isThisCall(node, 'getExecutionCancelSignal') && node.arguments.length === 0)
				return f.createObjectLiteralExpression([
					f.createPropertyAssignment('aborted', f.createFalse()),
				]);
			if (isThisCall(node, 'getTimezone') && this.input.timezone !== undefined) {
				return f.createStringLiteral(this.input.timezone);
			}
			const facts = this.input.facts;
			const workflowFact = (
				source: ts.Node | undefined,
				key: ts.Node,
			): ts.Expression | undefined => {
				if (!isThisCall(source, 'getWorkflow') || source.arguments.length > 0) return undefined;
				const known: Record<string, string | boolean | undefined> = { ...facts?.workflow };
				return ts.isIdentifier(key) &&
					Object.hasOwn(known, key.text) &&
					known[key.text] !== undefined
					? expressionOf(known[key.text])
					: undefined;
			};
			if (ts.isPropertyAccessExpression(node)) {
				const fact = workflowFact(node.expression, node.name);
				if (fact) return fact;
			}
			if (
				ts.isVariableDeclaration(node) &&
				ts.isObjectBindingPattern(node.name) &&
				node.name.elements.length > 0 &&
				isThisCall(node.initializer, 'getWorkflow')
			) {
				const made: ts.VariableDeclaration[] = [];
				for (const e of node.name.elements) {
					const fact =
						e.initializer || e.dotDotDotToken || !ts.isIdentifier(e.name)
							? undefined
							: workflowFact(node.initializer, e.propertyName ?? e.name);
					if (fact && ts.isIdentifier(e.name))
						made.push(f.createVariableDeclaration(e.name.text, undefined, undefined, fact));
				}
				if (made.length === node.name.elements.length) return made;
			}
			if (
				isThisCall(node, 'getInstanceBaseUrl') &&
				node.arguments.length === 0 &&
				facts?.instanceBaseUrl !== undefined
			) {
				return f.createStringLiteral(facts.instanceBaseUrl);
			}
			if (isMathRandom(node) && unit.credentialType !== undefined)
				this.error(unit.name, 'a random value in credential code has no compiled form');
			if (isThisCall(node, 'getInstanceId')) {
				const id = this.input.instanceId;
				return id === undefined
					? f.createIdentifier('__INSTANCE_ID')
					: expressionOf(id ?? undefined);
			}
			if (isThisCall(node, 'getNode')) {
				return expressionOf({
					name: 'Node',
					type: this.input.type,
					typeVersion: this.input.version,
				});
			}
			if (isThisCall(node, 'addExecutionHints'))
				return this.helper('__hints', f.createArrayLiteralExpression(args(node)));
			if (isThisCall(node, 'helpers', 'returnJsonArray'))
				return this.helper('__jsonArray', ...args(node));
			if (isThisCall(node, 'helpers', 'constructExecutionMetaData'))
				return this.input.pairedOutput && args(node).length === 2
					? this.helper('__withPaired', ...args(node))
					: args(node)[0];
			const binaryCall = ts.isAwaitExpression(node) ? node.expression : node;
			if (
				isThisCall(binaryCall, 'helpers', 'assertBinaryData') &&
				binaryCall.arguments.length === 2
			)
				return this.helper('__binaryOf', f.createIdentifier('__items'), ...args(binaryCall));
			if (
				isThisCall(binaryCall, 'helpers', 'getBinaryDataBuffer') &&
				binaryCall.arguments.length === 2
			)
				return this.helper('__inputBytes', f.createIdentifier('__items'), ...args(binaryCall));
			if (
				isThisCall(binaryCall, 'helpers', 'getBinaryStream') &&
				(binaryCall.arguments.length === 1 || binaryCall.arguments.length === 2)
			)
				return this.helper('__storedBytes', args(binaryCall)[0]);
			if (
				isThisCall(binaryCall, 'helpers', 'getBinaryMetadata') &&
				binaryCall.arguments.length === 1
			) {
				this.readsStoredMetadata = true;
				const metadata = this.helper('__storedMetadata', ...args(binaryCall));
				return ts.isAwaitExpression(node) ? f.createAwaitExpression(metadata) : metadata;
			}
			if (
				isThisCall(binaryCall, 'helpers', 'prepareBinaryData') &&
				binaryCall.arguments.length >= 1 &&
				binaryCall.arguments.length <= 3
			) {
				const [bytes, fileName, mimeType] = args(binaryCall);
				return this.helper(
					'__prepareBinary',
					bytes,
					fileName ?? f.createIdentifier('undefined'),
					mimeType ?? f.createIdentifier('undefined'),
				);
			}
			if (isThisCall(binaryCall, 'helpers', 'binaryToBuffer') && binaryCall.arguments.length === 1)
				return this.helper('__bytesFrom', ...args(binaryCall));
			if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
				const { expression: target, name } = node.expression;

				const direct = isThisCall(node, 'helpers', name.text) && REQUEST_HELPERS.has(name.text);
				const viaCall =
					name.text === 'call' &&
					ts.isPropertyAccessExpression(target) &&
					REQUEST_HELPERS.has(target.name.text) &&
					ts.isPropertyAccessExpression(target.expression) &&
					target.expression.name.text === 'helpers';
				if (direct || viaCall) {
					const wrapped =
						name.text !== 'request' &&
						name.text !== 'httpRequest' &&
						!(
							viaCall &&
							ts.isPropertyAccessExpression(target) &&
							(target.name.text === 'request' || target.name.text === 'httpRequest')
						);
					const optionsAt = Math.min(
						(viaCall ? 1 : 0) + (wrapped ? 1 : 0),
						node.arguments.length - 1,
					);
					const options = args(node, optionsAt)[0];
					for (const used of [
						'__apiError',
						'__assign',
						'__form',
						'__formParts',
						'__formPart',
						'__sendBody',
						'__responseBytes',
					])
						this.helpers.add(used);
					const helperName =
						viaCall && ts.isPropertyAccessExpression(target) ? target.name.text : name.text;
					const legacy = !helperName.startsWith('httpRequest');
					const typeArgument = viaCall ? node.arguments[1] : undefined;
					const authenticate =
						wrapped &&
						typeArgument &&
						ts.isStringLiteral(typeArgument) &&
						node.arguments.length >= 3
							? this.authenticateUnit(typeArgument.text)
							: undefined;
					const later =
						wrapped &&
						typeArgument &&
						!ts.isStringLiteral(typeArgument) &&
						node.arguments.length >= 3
							? call(
									LATER_AUTHENTICATE,
									ts.visitNode(typeArgument, visit) as ts.Expression,
									options,
								)
							: undefined;
					const extraAt = (viaCall ? 1 : 0) + 2;
					const tokenOptions =
						wrapped &&
						helperName !== 'requestOAuth1' &&
						node.arguments.length > extraAt &&
						namesTokenOption(root)
							? args(node, extraAt)[0]
							: undefined;
					if (tokenOptions) this.requestTokenOptions = true;
					const typeNode = viaCall ? node.arguments[1] : node.arguments[0];
					const renewed =
						wrapped &&
						helperName === 'requestWithAuthentication' &&
						typeNode !== undefined &&
						ts.isStringLiteral(typeNode) &&
						this.getsSessionToken(typeNode.text);
					if (renewed && tokenOptions) this.error('code', SESSION_OPTIONS);
					if (renewed) {
						this.helpers.add('__request');
						return this.helper(
							'__requestRenewed',
							authenticate ? f.createAwaitExpression(call(authenticate, options)) : options,
						);
					}
					return this.helper(
						'__request',
						authenticate
							? f.createAwaitExpression(call(authenticate, options))
							: (later ?? options),
						wrapped ? f.createTrue() : f.createFalse(),
						legacy ? f.createTrue() : f.createFalse(),
						...(tokenOptions
							? [tokenOptions, helperName === 'requestOAuth2' ? f.createFalse() : f.createTrue()]
							: []),
					);
				}

				if (
					name.text === 'call' &&
					!ts.isIdentifier(target) &&
					node.arguments[0]?.kind === ts.SyntaxKind.ThisKeyword
				) {
					return call('__CTXCALL', ts.visitNode(target, visit) as ts.Expression, ...args(node, 1));
				}
				if (
					name.text === 'call' &&
					ts.isIdentifier(target) &&
					node.arguments[0]?.kind === ts.SyntaxKind.ThisKeyword &&
					!localNames.has(target.text) &&
					this.isGoogleTokenFunction(unit.file, target.text, unit.name)
				) {
					return call(MINT_GOOGLE, ...args(node, 1));
				}
				if (
					name.text === 'call' &&
					ts.isIdentifier(target) &&
					node.arguments[0]?.kind === ts.SyntaxKind.ThisKeyword
				) {
					this.contextCallees.add(target.text);
					return call(
						target.text,
						...CONTEXT_PARAMS.map((p) => f.createIdentifier(p)),
						...args(node, 1),
					);
				}
			}
			if (
				ts.isCallExpression(node) &&
				ts.isPropertyAccessExpression(node.expression) &&
				node.expression.name.text === 'test' &&
				ts.isIdentifier(node.expression.expression)
			) {
				const pattern = regexConstants.get(node.expression.expression.text);
				if (pattern !== undefined) {
					return f.updateCallExpression(
						node,
						f.createPropertyAccessExpression(f.createRegularExpressionLiteral(pattern), 'test'),
						undefined,
						args(node),
					);
				}
			}
			if (!localNames.has('URL')) {
				const parsed = (e: ts.Expression): ts.Expression | undefined =>
					isUrlNew(e)
						? this.helper('__url', ...args(e))
						: ts.isIdentifier(e) && urlNames.urls.has(e.text)
							? e
							: undefined;
				const callee =
					ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
						? node.expression
						: undefined;
				if (ts.isCallExpression(node) && callee && isGetCall(callee)) {
					const receiver = callee.expression;
					if (ts.isIdentifier(receiver) && urlNames.params.has(receiver.text))
						return this.helper('__urlParam', receiver, ...args(node));
					const url =
						ts.isPropertyAccessExpression(receiver) && receiver.name.text === 'searchParams'
							? parsed(receiver.expression)
							: undefined;
					if (url)
						return this.helper(
							'__urlParam',
							f.createPropertyAccessExpression(url, 'search'),
							...args(node),
						);
				}
				if (
					ts.isCallExpression(node) &&
					callee &&
					ts.isIdentifier(callee.expression) &&
					callee.expression.text === 'URL' &&
					callee.name.text === 'canParse' &&
					node.arguments.length === 1 &&
					!ts.isSpreadElement(node.arguments[0])
				)
					return this.helper('__urlCanParse', ...args(node));
				if (
					ts.isPropertyAccessExpression(node) &&
					isUrlNew(node.expression) &&
					URL_PROPERTIES.has(node.name.text) &&
					!isWritten(node)
				)
					return f.createPropertyAccessExpression(
						this.helper('__url', ...args(node.expression)),
						node.name.text,
					);
				if (ts.isExpressionStatement(node) && isUrlNew(node.expression))
					return f.createExpressionStatement(this.helper('__url', ...args(node.expression)));
				if (
					ts.isBinaryExpression(node) &&
					node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
					ts.isIdentifier(node.left) &&
					urlNames.urls.has(node.left.text) &&
					isUrlNew(node.right)
				)
					return f.createAssignment(node.left, this.helper('__url', ...args(node.right)));
				if (ts.isVariableDeclaration(node) && isUrlNew(node.initializer)) {
					const elements = ts.isObjectBindingPattern(node.name) ? node.name.elements : [];
					const plain = elements.every((e) => {
						const key = e.propertyName ?? e.name;
						return (
							!e.dotDotDotToken &&
							!e.initializer &&
							ts.isIdentifier(key) &&
							ts.isIdentifier(e.name) &&
							(key.text === 'searchParams'
								? urlNames.params.has(e.name.text)
								: URL_PROPERTIES.has(key.text))
						);
					});
					if (ts.isIdentifier(node.name) && urlNames.urls.has(node.name.text))
						return f.createVariableDeclaration(
							node.name,
							undefined,
							undefined,
							this.helper('__url', ...args(node.initializer)),
						);
					if (elements.length > 0 && plain)
						return f.createVariableDeclaration(
							f.createObjectBindingPattern(
								elements.map((e) => {
									const key = e.propertyName ?? e.name;
									return ts.isIdentifier(key) && key.text === 'searchParams'
										? f.createBindingElement(undefined, 'search', e.name)
										: e;
								}),
							),
							undefined,
							undefined,
							this.helper('__url', ...args(node.initializer)),
						);
				}
			}
			if (
				ts.isCallExpression(node) &&
				ts.isPropertyAccessExpression(node.expression) &&
				node.expression.name.text === 'toString' &&
				node.arguments.length === 0 &&
				ts.isNewExpression(node.expression.expression) &&
				ts.isIdentifier(node.expression.expression.expression) &&
				node.expression.expression.expression.text === 'URLSearchParams' &&
				node.expression.expression.arguments?.length === 1 &&
				!ts.isSpreadElement(node.expression.expression.arguments[0]) &&
				!localNames.has('URLSearchParams') &&
				['url', 'node:url'].includes(unit.file.imports.get('URLSearchParams')?.from ?? 'url')
			)
				return this.helper('__urlForm', ...args(node.expression.expression));
			if (ts.isCallExpression(node)) {
				const moment = bindMoment(node, {
					isMoment: (name) => {
						const imported = unit.file.imports.get(name.text);
						return (
							!localNames.has(name.text) &&
							imported?.name === 'default' &&
							imported.from === MOMENT_PACKAGE
						);
					},
					visit: (e) => ts.visitNode(e, visit) as ts.Expression,
					helper: (name, ...list) => this.helper(name, ...list),
					error: (message) => this.error(unit.name, message),
				});
				if (moment) return moment;
			}
			if (
				ts.isCallExpression(node) &&
				ts.isIdentifier(node.expression) &&
				!localNames.has(node.expression.text)
			) {
				const imported = unit.file.imports.get(node.expression.text);
				const helper = imported ? packageHelper(imported) : undefined;
				const withContext = contextHelper(imported, node);
				if (withContext !== undefined) {
					if (withContext !== '__sleep' && unit.credentialType !== undefined)
						this.error(unit.name, 'a random value in credential code has no compiled form');
					return this.helper(withContext, ...args(node));
				}
				if (
					imported?.from === 'change-case' &&
					Object.hasOwn(CHANGE_CASE, imported.name) &&
					node.arguments.length === 1
				) {
					const [style, delimiter] = CHANGE_CASE[imported.name];
					return this.helper(
						'__changeCase',
						...args(node),
						f.createStringLiteral(style),
						f.createStringLiteral(delimiter),
					);
				}
				if (
					imported?.from === 'n8n-workflow' &&
					Object.hasOwn(PARAMETER_ASSERTIONS, imported.name) &&
					node.arguments.length === 3
				) {
					const [name, value] = args(node);
					return this.helper(
						'__assertParam',
						name,
						value,
						f.createStringLiteral(PARAMETER_ASSERTIONS[imported.name]),
					);
				}
				if (
					imported?.from === 'n8n-workflow' &&
					imported.name === 'assertParamIsOfAnyTypes' &&
					node.arguments.length === 4
				) {
					const [name, value, types] = args(node);
					return this.helper('__assertParamTypes', name, value, types);
				}
				if (
					imported?.from === 'n8n-workflow' &&
					imported.name === 'validateNodeParameters' &&
					node.arguments.length === 3
				) {
					const [value, parameters] = args(node);
					return this.helper('__validateParams', value, parameters);
				}
				if (helper === '__get') {
					const path = node.arguments[1];
					const text = path && ts.isStringLiteral(path) ? path.text : '';

					if (text === '' && path) {
						const [value, dynamic, fallback] = args(node);
						return this.helper(
							'__getPath',
							value,
							dynamic,
							fallback ?? f.createIdentifier('undefined'),
						);
					}
					if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(text)) {
						const [value, , fallback] = args(node);
						return this.helper(
							'__get',
							value,
							expressionOf(text.split('.')),
							f.createStringLiteral(text),
							fallback ?? f.createIdentifier('undefined'),
						);
					}
				} else if (helper === '__set') {
					const path = node.arguments[1];
					const text = path && ts.isStringLiteral(path) ? path.text : '';
					if (/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(text) && node.arguments.length === 3) {
						const [target, , value] = args(node);
						return this.helper('__set', target, expressionOf(text.split('.')), value);
					}
				} else if (helper === '__omitKeys') {
					const [value, ...keys] = args(node);
					return this.helper('__omitKeys', value, f.createArrayLiteralExpression(keys));
				} else if (helper) return this.helper(helper, ...args(node));
			}
			if (
				ts.isBinaryExpression(node) &&
				node.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword &&
				ts.isIdentifier(node.right) &&
				Object.hasOwn(ERROR_CLASSES, node.right.text) &&
				unit.file.imports.has(node.right.text)
			) {
				return this.helper(
					'__isNamed',
					ts.visitNode(node.left, visit) as ts.Expression,
					expressionOf(ERROR_CLASSES[node.right.text]),
				);
			}
			if (
				ts.isBinaryExpression(node) &&
				node.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword &&
				ts.isIdentifier(node.right) &&
				!localNames.has(node.right.text) &&
				!unit.file.imports.has(node.right.text) &&
				!this.member(unit.file, node.right.text)
			) {
				if (node.right.text === 'Array')
					return f.createCallExpression(
						f.createPropertyAccessExpression(f.createIdentifier('Array'), 'isArray'),
						undefined,
						[ts.visitNode(node.left, visit) as ts.Expression],
					);
				if (node.right.text === 'Error' && ts.isIdentifier(node.left) && isCaught(node.left))
					return this.helper('__isError', node.left);
			}
			if (ts.isNewExpression(node) && ts.isIdentifier(node.expression)) {
				const cls = node.expression.text;
				const declared = localNames.has(cls) ? undefined : this.member(unit.file, cls)?.node;
				if (declared && ts.isClassDeclaration(declared)) return call(cls, ...args(node));
				if (GENERIC_ERRORS.has(cls)) {
					return this.helper(
						'__error',
						args(node)[0] ?? f.createStringLiteral(cls),
						f.createStringLiteral(cls),
						f.createIdentifier('undefined'),
					);
				}

				if (cls === 'NodeApiError' && (node.arguments?.length ?? 0) >= 2) {
					const given = args(node);
					return this.helper('__apiError', given[1], given[2] ?? f.createIdentifier('undefined'));
				}

				if (cls === 'NodeOperationError' && (node.arguments?.length ?? 0) >= 2) {
					const given = args(node);
					return this.helper(
						'__error',
						given[1],
						f.createStringLiteral(cls),
						given[2] ?? f.createIdentifier('undefined'),
					);
				}
			}
			if (ts.isExpressionStatement(node)) {
				const e = node.expression;

				if (
					ts.isCallExpression(e) &&
					ts.isPropertyAccessExpression(e.expression) &&
					ts.isPropertyAccessExpression(e.expression.expression) &&
					e.expression.expression.name.text === 'logger' &&
					e.expression.expression.expression.kind === ts.SyntaxKind.ThisKeyword
				) {
					return f.createEmptyStatement();
				}

				if (
					ts.isCallExpression(e) &&
					ts.isPropertyAccessExpression(e.expression) &&
					ts.isIdentifier(e.expression.expression) &&
					e.expression.expression.text === 'Object' &&
					e.expression.name.text === 'assign' &&
					e.arguments.length >= 2 &&
					!ts.isObjectLiteralExpression(e.arguments[0])
				) {
					const [target, ...sources] = args(e);
					return sources.map((source, k) =>
						f.createExpressionStatement(
							this.helper(
								'__assign',
								k === 0 ? target : (ts.visitNode(e.arguments[0], visit) as ts.Expression),
								source,
							),
						),
					);
				}

				if (
					ts.isCallExpression(e) &&
					ts.isPropertyAccessExpression(e.expression) &&
					e.expression.name.text === 'apply' &&
					ts.isPropertyAccessExpression(e.expression.expression) &&
					e.expression.expression.name.text === 'push' &&
					e.arguments.length === 2
				) {
					const [list, more] = args(e);
					return f.createForOfStatement(
						undefined,
						f.createVariableDeclarationList(
							[f.createVariableDeclaration('__more')],
							ts.NodeFlags.Const,
						),
						more,
						f.createExpressionStatement(
							f.createCallExpression(f.createPropertyAccessExpression(list, 'push'), undefined, [
								f.createIdentifier('__more'),
							]),
						),
					);
				}

				if (
					ts.isCallExpression(e) &&
					ts.isPropertyAccessExpression(e.expression) &&
					e.expression.name.text === 'push' &&
					e.arguments.length === 1 &&
					ts.isSpreadElement(e.arguments[0])
				) {
					const list = each(e.expression).expression;
					const more = each(e.arguments[0]).expression;
					const item = spreadItem(e.arguments[0].expression);
					return f.createForOfStatement(
						undefined,
						f.createVariableDeclarationList(
							[f.createVariableDeclaration(item)],
							ts.NodeFlags.Const,
						),
						more,
						f.createExpressionStatement(
							f.createCallExpression(f.createPropertyAccessExpression(list, 'push'), undefined, [
								f.createIdentifier(item),
							]),
						),
					);
				}
			}
			if (isExecute && depth === 0 && ts.isReturnStatement(node) && node.expression) {
				return f.createReturnStatement(
					this.helper(
						this.input.pairedOutput ? OUT_PAIRED : this.input.continueOnFail ? OUT_FAILED : '__out',
						each(node).expression as ts.Expression,
					),
				);
			}
			const named = ts.isIdentifier(node) ? unit.file.imports.get(node.text) : undefined;
			if (
				ts.isIdentifier(node) &&
				isValueUse(node) &&
				named?.from === 'change-case' &&
				Object.hasOwn(CHANGE_CASE, named.name) &&
				!localNames.has(node.text) &&
				!(ts.isCallExpression(node.parent) && node.parent.expression === node)
			) {
				const [style, delimiter] = CHANGE_CASE[named.name];
				return f.createArrowFunction(
					undefined,
					undefined,
					[f.createParameterDeclaration(undefined, undefined, 'text')],
					undefined,
					undefined,
					this.helper(
						'__changeCase',
						f.createIdentifier('text'),
						f.createStringLiteral(style),
						f.createStringLiteral(delimiter),
					),
				);
			}
			if (
				ts.isIdentifier(node) &&
				isValueUse(node) &&
				node.text in PACKAGE_CONSTANTS &&
				unit.file.imports.has(node.text) &&
				!localNames.has(node.text)
			) {
				return expressionOf(PACKAGE_CONSTANTS[node.text]);
			}
			return each(node);
		};
		return ts.visitNode(root, visit) as ts.Node;
	}

	private check(root: ts.Node, where: string) {
		const walk = (node: ts.Node) => {
			if (node.kind === ts.SyntaxKind.ThisKeyword) {
				const parent = node.parent;
				const member = parent && ts.isPropertyAccessExpression(parent) ? parent.name.text : '';
				if (isThisCall(parent?.parent, 'getNodeParameter')) return;
				const inner =
					member === 'helpers' && ts.isPropertyAccessExpression(parent.parent)
						? `.${parent.parent.name.text}`
						: '';
				this.error(
					where,
					member
						? `'this.${member}${inner}' has no compiled form`
						: '`this` as a value has no compiled form',
				);
			}
			const returned =
				isWholeCredential(node) && ts.isReturnStatement(node.parent) && where !== 'execute';
			const minted = isMintCall(node.parent) && node.parent.arguments[0] === node;
			if (isWholeCredential(node) && !returned && !minted) {
				this.error(
					where,
					'the credential is used as a whole value: only its fields can go into a request',
				);
			}
			if (ts.isIdentifier(node) && node.text === '__THIS') {
				this.error(where, '`this` as a value has no compiled form');
			}
			if (ts.isIdentifier(node) && node.text === '__CTXCALL') {
				this.error(
					where,
					'a call with the n8n context has a target that is not known at compile time',
				);
			}
			if (ts.isIdentifier(node) && node.text === '__INSTANCE_ID') {
				this.error(
					where,
					'the node reads the instance id, and the caller did not give the instance',
				);
			}
			ts.forEachChild(node, walk);
		};
		walk(root);
	}

	private checkParameters() {
		for (const { name, node } of this.output) {
			const walk = (n: ts.Node) => {
				if (isThisCall(n, 'getNodeParameter')) {
					const [parameter, , , options] = n.arguments;
					this.error(
						name,
						parameter && literalOf(parameter) && options
							? "the options of 'this.getNodeParameter' have no compiled form"
							: "'this.getNodeParameter' has no compiled form: the parameter name is not a constant for this node",
					);
				}
				ts.forEachChild(n, walk);
			};
			walk(node);
		}
	}

	private readonly itemParameters = new Set<string>();

	private readonly laterItemParameters = new Set<string>();

	private checkItemParameters() {
		const uses = itemParameterUses(this.output);
		for (const where of uses.loose)
			this.error(where, 'the list of the parameters for each item is used as a value');
		const bounded = (
			index: ts.Expression,
			frame: ItemFrame,
			hops: number,
			first = false,
		): boolean => {
			if (hops > MAX_INDEX_HOPS) return false;
			if (
				ts.isParenthesizedExpression(index) ||
				ts.isAsExpression(index) ||
				ts.isNonNullExpression(index)
			)
				return bounded(index.expression, frame, hops, first);
			if (ts.isNumericLiteral(index)) return index.text === '0';
			if (!ts.isIdentifier(index)) return false;
			const found = itemBindingOf(index.text, frame);
			if (found === undefined || found.kind === 'other') return false;
			if (found.kind === 'loop') return !first;
			if (found.kind === 'value') return bounded(found.value, found.frame, hops + 1, first);
			const sites = uses.calls.get(found.unit) ?? [];
			return (
				sites.length > 0 &&
				uses.names.get(found.unit) === sites.length + 1 &&
				sites.every((site) => {
					const given = site.call.arguments[found.position];
					return (
						given !== undefined &&
						!site.call.arguments.some(ts.isSpreadElement) &&
						bounded(given, site.frame, hops + 1, first)
					);
				})
			);
		};
		for (const read of uses.reads) {
			this.itemParameters.add(read.parameter);
			if (!bounded(read.index, read.frame, 0, true)) this.laterItemParameters.add(read.parameter);
			if (!bounded(read.index, read.frame, 0)) {
				this.error(
					read.where,
					`the parameter '${read.parameter}' has an expression, and the compiler cannot prove that the item index of 'this.getNodeParameter' is the index of an input item`,
				);
			}
		}
	}

	private checkCredentials() {
		const params = new Map<string, Set<number>>();
		const returns = new Set<string>();
		const analyse = (name: string, node: ts.Node, report: boolean): boolean => {
			let changed = false;
			const fn = ts.isFunctionDeclaration(node) ? node : undefined;
			const tainted = new Set<string>();
			for (const k of params.get(name) ?? []) {
				const p = fn?.parameters[k];
				if (p && ts.isIdentifier(p.name)) tainted.add(p.name.text);
			}
			const holds = (e: ts.Node): boolean => {
				if (
					ts.isCallExpression(e) &&
					ts.isIdentifier(e.expression) &&
					e.expression.text === '__request'
				)
					return false;
				if (
					ts.isIdentifier(e) &&
					(e.text === '__CREDFIELD' || (tainted.has(e.text) && isValueUse(e)))
				)
					return true;
				if (
					ts.isCallExpression(e) &&
					ts.isIdentifier(e.expression) &&
					returns.has(e.expression.text)
				)
					return true;
				return ts.forEachChild(e, holds) ?? false;
			};
			const rootOf = (e: ts.Expression): string | undefined => {
				let cur = e;
				while (ts.isPropertyAccessExpression(cur) || ts.isElementAccessExpression(cur))
					cur = cur.expression;
				return ts.isIdentifier(cur) ? cur.text : undefined;
			};
			for (let round = 0; round < 8; round++) {
				const before = tainted.size;
				const collect = (n: ts.Node) => {
					if (
						ts.isVariableDeclaration(n) &&
						ts.isIdentifier(n.name) &&
						n.initializer &&
						holds(n.initializer)
					)
						tainted.add(n.name.text);

					if (
						ts.isBinaryExpression(n) &&
						n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
						holds(n.right)
					) {
						const target = rootOf(n.left);
						if (target) tainted.add(target);
					}
					if (
						ts.isCallExpression(n) &&
						ts.isIdentifier(n.expression) &&
						n.expression.text === '__assign' &&
						n.arguments.length === 2 &&
						holds(n.arguments[1])
					) {
						const target = rootOf(n.arguments[0]);
						if (target) tainted.add(target);
					}
					ts.forEachChild(n, collect);
				};
				collect(node);
				if (tainted.size === before) break;
			}
			const walk = (n: ts.Node) => {
				if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
					const callee = this.units.get(n.expression.text);
					const offset = callee?.withContext ? CONTEXT_PARAMS.length : 0;
					n.arguments.forEach((arg, k) => {
						if (!callee || k < offset || !holds(arg)) return;
						const set = params.get(callee.name) ?? new Set<number>();
						if (!set.has(k - offset)) changed = true;
						set.add(k - offset);
						params.set(callee.name, set);
					});
				}
				if (
					ts.isReturnStatement(n) &&
					n.expression &&
					name !== 'execute' &&
					holds(n.expression) &&
					!returns.has(name)
				) {
					returns.add(name);
					changed = true;
				}
				if (
					report &&
					ts.isCallExpression(n) &&
					((ts.isIdentifier(n.expression) && TEXT_HELPERS.has(n.expression.text)) ||
						(ts.isPropertyAccessExpression(n.expression) &&
							ts.isIdentifier(n.expression.expression) &&
							n.expression.expression.text === 'Buffer')) &&
					n.arguments.some(holds)
				)
					this.error(
						name,
						'the code computes with a credential field: node code cannot read a credential value',
					);
				if (report) {
					const field =
						ts.isCallExpression(n) &&
						ts.isIdentifier(n.expression) &&
						n.expression.text === '__CREDFIELD';
					const variable = ts.isIdentifier(n) && tainted.has(n.text) && isValueUse(n);
					const p = n.parent;
					if ((field || variable) && p) {
						const op = ts.isBinaryExpression(p) ? p.operatorToken.kind : undefined;
						const decides =
							(op !== undefined &&
								op !== ts.SyntaxKind.PlusToken &&
								op !== ts.SyntaxKind.EqualsToken &&
								op !== ts.SyntaxKind.CommaToken) ||
							ts.isPrefixUnaryExpression(p) ||
							ts.isTypeOfExpression(p) ||
							((ts.isIfStatement(p) || ts.isWhileStatement(p) || ts.isSwitchStatement(p)) &&
								p.expression === n) ||
							(ts.isConditionalExpression(p) && p.condition === n);
						if (decides)
							this.error(
								name,
								'the code compares or branches on a credential field: node code cannot read a credential value',
							);
						const receiver =
							ts.isPropertyAccessExpression(p) &&
							p.expression === n &&
							ts.isCallExpression(p.parent) &&
							p.parent.expression === p;
						if (receiver && field)
							this.error(
								name,
								'the code calls a method on a credential field: node code cannot read a credential value',
							);
					}
				}
				ts.forEachChild(n, walk);
			};
			walk(node);
			return changed;
		};

		for (let round = 0; round < 16; round++) {
			let changed = false;
			for (const { name, node } of this.output) changed = analyse(name, node, false) || changed;
			if (!changed) break;
		}
		for (const { name, node } of this.output) analyse(name, node, true);
	}

	private fold(start: { node: ts.Node; sf: ts.SourceFile }, where: string) {
		let cur = this.renew(start, nameIterables(start.node));
		let settled = false;
		for (let round = 0; round < MAX_FOLD_ROUNDS && !settled; round++) {
			this.changed = false;
			cur = this.renew(cur, this.separateCredentials(cur.node));
			cur = this.renew(cur, this.propagate(cur.node, where));
			cur = this.renew(cur, this.flow(cur.node));
			cur = this.renew(cur, this.reduce(cur.node));
			cur = this.renew(cur, this.mintTokens(cur.node, where));
			settled = !this.changed;
		}
		if (!settled) this.error(where, `the code still changes after ${MAX_FOLD_ROUNDS} fold rounds`);
		cur = this.renew(cur, this.settleIterables(cur.node));
		return this.renew(cur, this.deriveCredentialValues(cur.node));
	}

	private settleIterables(root: ts.Node): ts.Node {
		const visit = (input: ts.Node): ts.Node => {
			const n = ts.visitEachChild(input, visit, undefined);
			if (!ts.isForOfStatement(n) || !isNamedIterable(n.expression)) return n;
			const [value, name] = n.expression.arguments;
			const literal = literalOf(value);
			if (literal && typeof literal.value !== 'string' && ts.isStringLiteral(name)) {
				return f.createThrowStatement(
					this.helper(
						'__error',
						f.createStringLiteral(`${name.text} is not iterable`),
						f.createStringLiteral('TypeError'),
						f.createIdentifier('undefined'),
					),
				);
			}
			const same = ts.isStringLiteral(name) && iterableName(value) === name.text;
			const list = ts.isArrayLiteralExpression(value) || literal !== undefined;
			return f.updateForOfStatement(
				n,
				n.awaitModifier,
				n.initializer,
				same || list ? value : this.helper(KEPT_ITERABLE, value, name),
				n.statement,
			);
		};
		return ts.visitNode(root, visit);
	}

	private renew(
		cur: { node: ts.Node; sf: ts.SourceFile },
		next: ts.Node,
	): { node: ts.Node; sf: ts.SourceFile } {
		return next === cur.node ? cur : this.reparse(next, cur.sf);
	}

	readonly derivations = new Map<string, string>();

	readonly mints = new Map<string, CredentialMint>();

	private googleScopes: Map<string, string[]> | undefined;

	private isGoogleTokenFunction(file: FileModel, name: string, where: string): boolean {
		const found = this.member(file, name);
		const fn = found?.node;
		if (
			!found ||
			!fn ||
			!ts.isFunctionDeclaration(fn) ||
			fn.name?.text !== GOOGLE_TOKEN_FUNCTION ||
			!found.file.path.endsWith(GOOGLE_TOKEN_FILE)
		)
			return false;
		this.googleScopes ??= this.scopeTable(found.file, fn);
		if (!this.googleScopes)
			this.error(where, `the scopes of '${GOOGLE_TOKEN_FUNCTION}' are not a table of constants`);
		return true;
	}

	private scopeTable(
		file: FileModel,
		fn: ts.FunctionDeclaration,
	): Map<string, string[]> | undefined {
		const service = fn.parameters.filter(
			(p) => !(ts.isIdentifier(p.name) && p.name.text === 'this'),
		)[1]?.name;
		if (!service || !ts.isIdentifier(service) || !fn.body) return undefined;
		const tables: string[] = [];
		const find = (n: ts.Node) => {
			if (
				ts.isElementAccessExpression(n) &&
				ts.isIdentifier(n.argumentExpression) &&
				n.argumentExpression.text === service.text
			)
				tables.push(ts.isIdentifier(n.expression) ? n.expression.text : '');
			ts.forEachChild(n, find);
		};
		find(fn.body);
		if (tables.length !== 1 || tables[0] === '') return undefined;
		const declared = this.member(file, tables[0])?.node;
		let table = declared && ts.isVariableDeclaration(declared) ? declared.initializer : undefined;
		while (
			table &&
			(ts.isAsExpression(table) ||
				ts.isSatisfiesExpression(table) ||
				ts.isParenthesizedExpression(table))
		)
			table = table.expression;
		if (!table || !ts.isObjectLiteralExpression(table)) return undefined;
		const out = new Map<string, string[]>();
		for (const property of table.properties) {
			if (
				!ts.isPropertyAssignment(property) ||
				!(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) ||
				!ts.isArrayLiteralExpression(property.initializer) ||
				out.has(property.name.text)
			)
				return undefined;
			const scopes: string[] = [];
			for (const element of property.initializer.elements) {
				if (!ts.isStringLiteral(element) && !ts.isNoSubstitutionTemplateLiteral(element))
					return undefined;
				scopes.push(element.text);
			}
			out.set(property.name.text, scopes);
		}
		return out;
	}

	private mintMarker(request: ts.CallExpression, where: string): ts.Expression | undefined {
		const [credential, service] = request.arguments;
		if (
			request.arguments.length !== 2 ||
			!isWholeCredential(credential) ||
			!ts.isStringLiteral(service)
		)
			return undefined;
		const scopes = this.googleScopes?.get(service.text);
		if (!scopes) {
			this.error(where, `the Google service '${service.text}' has no scopes that are constants`);
			return undefined;
		}
		const kind = 'google-service-account';
		const text = JSON.stringify([kind, scopes]);
		let hash = 0x811c9dc5;
		for (let k = 0; k < text.length; k++) {
			hash ^= text.charCodeAt(k);
			hash = Math.imul(hash, 0x01000193) >>> 0;
		}
		const name = `m${hash.toString(16).padStart(8, '0')}`;
		const known = this.mints.get(name);
		if (known && JSON.stringify(known.scopes) !== JSON.stringify(scopes)) {
			this.error(where, 'two token requests have the same name');
			return undefined;
		}
		if (!known && this.mints.size >= MAX_MINTS) {
			this.error(where, `the node needs more than ${MAX_MINTS} minted tokens`);
			return undefined;
		}
		if (!known) this.mints.set(name, { name, kind, service: service.text, scopes: [...scopes] });
		return call('__CREDFIELD', f.createStringLiteral(`n8nMinted.${name}.access_token`));
	}

	private skipFailedOptionalUnits() {
		for (const unit of this.units.values()) {
			const prefix = `${unit.name}: `;
			if (!unit.optional || !this.errors.some((text) => text.startsWith(prefix))) continue;
			for (let at = this.errors.length - 1; at >= 0; at--) {
				if (this.errors[at].startsWith(prefix)) this.errors.splice(at, 1);
			}
			const entry = this.output.find((o) => o.name === unit.name);
			if (!entry) continue;
			entry.node = f.createFunctionDeclaration(
				[f.createModifier(ts.SyntaxKind.AsyncKeyword)],
				undefined,
				unit.name,
				undefined,
				[f.createParameterDeclaration(undefined, undefined, 'options')],
				undefined,
				f.createBlock([f.createReturnStatement(f.createIdentifier('options'))], true),
			);
		}
	}

	private checkResponses() {
		const asks = (n: ts.Node): boolean =>
			((ts.isIdentifier(n) || ts.isStringLiteral(n)) && FULL_RESPONSE_OPTIONS.has(n.text)) ||
			(ts.forEachChild(n, asks) ?? false);
		const keyOf = (n: ts.Node): ts.Node | undefined => {
			if (ts.isPropertyAccessExpression(n)) return n.name;
			if (ts.isElementAccessExpression(n))
				return ts.isStringLiteral(n.argumentExpression) ? n.argumentExpression : undefined;
			if (ts.isBindingElement(n)) return n.propertyName ?? n.name;
			return undefined;
		};
		const reads = (n: ts.Node): boolean => {
			const key = keyOf(n);
			const gap =
				key !== undefined &&
				(ts.isIdentifier(key) || ts.isStringLiteral(key)) &&
				FULL_RESPONSE_GAPS.has(key.text);
			return gap || (ts.forEachChild(n, reads) ?? false);
		};
		if (!this.output.some(({ node }) => asks(node))) return;
		for (const { name, node } of this.output) {
			if (reads(node)) {
				this.error(
					name,
					'the code asks for a full response and reads `statusMessage` or `request`: a full response has only its body, its headers and its status code',
				);
			}
		}
	}

	private checkThrows() {
		const tests = (n: ts.Node): boolean =>
			(ts.isIdentifier(n) && n.text === '__isError') || (ts.forEachChild(n, tests) ?? false);
		if (!this.output.some(({ node }) => tests(node))) return;
		const flows = new Map<string, ErrorFlow>();
		for (const { name, node } of this.output) flows.set(name, errorFlowOf(node));
		for (const [name, flow] of flows) {
			const loose = flow.throws.some(
				(site) => !makesError(site.value, site.caught, flow, (unit) => flows.get(unit), 0),
			);
			if (loose) {
				this.error(
					name,
					'the code tests a caught value with `instanceof Error`, and it throws a value that is not known to be an error',
				);
			}
		}
	}

	private checkMints() {
		for (const { name, node } of this.output) {
			const walk = (n: ts.Node) => {
				if (ts.isIdentifier(n) && n.text === MINT_GOOGLE) {
					this.error(
						name,
						`the call of '${GOOGLE_TOKEN_FUNCTION}' has a service that is not a constant, or the code reads more than the access token`,
					);
				}
				ts.forEachChild(n, walk);
			};
			walk(node);
		}
	}

	private mintTokens(root: ts.Node, where: string): ts.Node {
		const requestOf = (e: ts.Expression | undefined): ts.CallExpression | undefined => {
			let cur = e;
			while (cur && ts.isParenthesizedExpression(cur)) cur = cur.expression;
			if (!cur || !ts.isAwaitExpression(cur)) return undefined;
			return isMintCall(cur.expression) ? cur.expression : undefined;
		};
		const visit = (n: ts.Node): ts.Node => {
			if (ts.isPropertyAccessExpression(n) && n.name.text === 'access_token') {
				const request = requestOf(n.expression);
				const marker = request && this.mintMarker(request, where);
				if (marker) {
					this.changed = true;
					return marker;
				}
			}
			if (
				ts.isVariableDeclaration(n) &&
				ts.isObjectBindingPattern(n.name) &&
				n.name.elements.length === 1
			) {
				const bound = plainBindings(n.name)?.[0];
				const request = requestOf(n.initializer);
				const marker =
					bound?.field === 'access_token' && request ? this.mintMarker(request, where) : undefined;
				if (bound && marker) {
					this.changed = true;
					return f.updateVariableDeclaration(
						n,
						f.createIdentifier(bound.name),
						undefined,
						undefined,
						marker,
					);
				}
			}
			return ts.visitEachChild(n, visit, undefined);
		};
		return ts.visitNode(root, visit);
	}

	private credentialPure(root: ts.Node): { ok: boolean; marker: boolean; computes: boolean } {
		const state = { marker: false, computes: false };
		const pure = (e: ts.Node): boolean => {
			if (isCredentialMarker(e)) {
				state.marker = true;
				return true;
			}
			if (ts.isExpression(e) && literalOf(e)) return true;
			if (ts.isRegularExpressionLiteral(e)) return true;
			if (ts.isParenthesizedExpression(e)) return pure(e.expression);
			if (ts.isTemplateExpression(e)) return e.templateSpans.every((span) => pure(span.expression));
			if (ts.isConditionalExpression(e)) {
				state.computes = true;
				return pure(e.condition) && pure(e.whenTrue) && pure(e.whenFalse);
			}
			if (ts.isBinaryExpression(e)) {
				if (e.operatorToken.kind !== ts.SyntaxKind.PlusToken) state.computes = true;
				const known =
					DERIVED_OPERATORS.has(e.operatorToken.kind) || FLAG_OPERATORS.has(e.operatorToken.kind);
				return known && pure(e.left) && pure(e.right);
			}
			if (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.ExclamationToken) {
				state.computes = true;
				return pure(e.operand);
			}
			if (ts.isTypeOfExpression(e)) {
				state.computes = true;
				return pure(e.expression);
			}
			if (ts.isPropertyAccessExpression(e)) {
				state.computes = true;
				return e.name.text === 'length' && pure(e.expression);
			}
			if (ts.isCallExpression(e)) {
				state.computes = true;
				const callee = e.expression;
				if (!e.arguments.every(pure)) return false;
				if (ts.isIdentifier(callee)) return DERIVED_FUNCTIONS.has(callee.text);
				if (!ts.isPropertyAccessExpression(callee)) return false;
				if (ts.isIdentifier(callee.expression) && callee.expression.text === 'Buffer')
					return callee.name.text === 'from';
				const known = DERIVED_METHODS.has(callee.name.text) || FLAG_METHODS.has(callee.name.text);
				return known && pure(callee.expression);
			}
			return false;
		};
		const ok = pure(root);
		return { ok, marker: state.marker, computes: state.computes };
	}

	readonly flags = new Map<string, string>();

	private credentialFlag(n: ts.Expression): ts.Expression {
		const fields = (x: ts.Node): ts.Node => {
			if (isCredentialMarker(x)) {
				const path = x.arguments[0];
				let read: ts.Expression = f.createIdentifier('c');
				for (const key of (ts.isStringLiteral(path) ? path.text : '').split('.'))
					read = f.createPropertyAccessExpression(read, key);
				return read;
			}
			return ts.visitEachChild(x, fields, undefined);
		};
		const blank = ts.createSourceFile('d.js', '', ts.ScriptTarget.ES2022, false, ts.ScriptKind.JS);
		const text = this.printer.printNode(
			ts.EmitHint.Unspecified,
			ts.visitNode(n, fields),
			n.getSourceFile() ?? blank,
		);
		const code = yieldsBoolean(n) ? `(c) => (${text})` : `(c) => Boolean(${text})`;
		let hash = 0x811c9dc5;
		for (let k = 0; k < code.length; k++) {
			hash ^= code.charCodeAt(k);
			hash = Math.imul(hash, 0x01000193) >>> 0;
		}
		const name = `f${hash.toString(16).padStart(8, '0')}`;
		this.flags.set(name, code);
		return call(FLAG_MARKER, f.createStringLiteral(name));
	}

	private credentialTest(e: ts.Expression, visit: (n: ts.Node) => ts.Node): ts.Expression {
		const found = this.credentialPure(e);
		if (found.ok && found.marker) return this.credentialFlag(e);
		const test = (x: ts.Expression) => this.credentialTest(x, visit);
		if (ts.isParenthesizedExpression(e))
			return f.updateParenthesizedExpression(e, test(e.expression));
		if (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.ExclamationToken)
			return f.updatePrefixUnaryExpression(e, test(e.operand));
		if (
			ts.isBinaryExpression(e) &&
			(e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
				e.operatorToken.kind === ts.SyntaxKind.BarBarToken)
		)
			return f.updateBinaryExpression(e, test(e.left), e.operatorToken, test(e.right));
		const out = visit(e);
		return ts.isExpression(out) ? out : e;
	}

	private credentialTests(n: ts.Node, visit: (n: ts.Node) => ts.Node): ts.Node | undefined {
		const holds = (e: ts.Node): boolean =>
			isCredentialMarker(e) || (ts.forEachChild(e, holds) ?? false);
		const statement = (x: ts.Statement): ts.Statement => {
			const out = visit(x);
			return ts.isStatement(out) ? out : x;
		};
		const expression = (x: ts.Expression): ts.Expression => {
			const out = visit(x);
			return ts.isExpression(out) ? out : x;
		};
		if (ts.isIfStatement(n) && holds(n.expression))
			return f.updateIfStatement(
				n,
				this.credentialTest(n.expression, visit),
				statement(n.thenStatement),
				n.elseStatement && statement(n.elseStatement),
			);
		if (ts.isConditionalExpression(n) && holds(n.condition))
			return f.updateConditionalExpression(
				n,
				this.credentialTest(n.condition, visit),
				n.questionToken,
				expression(n.whenTrue),
				n.colonToken,
				expression(n.whenFalse),
			);
		if (ts.isWhileStatement(n) && holds(n.expression))
			return f.updateWhileStatement(
				n,
				this.credentialTest(n.expression, visit),
				statement(n.statement),
			);
		if (ts.isDoStatement(n) && holds(n.expression))
			return f.updateDoStatement(
				n,
				statement(n.statement),
				this.credentialTest(n.expression, visit),
			);
		return undefined;
	}

	private deriveCredentialValues(root: ts.Node): ts.Node {
		const isMarker = isCredentialMarker;
		const visit = (n: ts.Node): ts.Node => {
			if (ts.isExpression(n) && !isMarker(n)) {
				const found = this.credentialPure(n);
				if (found.ok && found.marker && found.computes && yieldsBoolean(n))
					return this.credentialFlag(n);
				if (found.ok && found.marker && found.computes) {
					const fields = (x: ts.Node): ts.Node => {
						if (isMarker(x)) {
							const path = x.arguments[0];
							let read: ts.Expression = f.createIdentifier('c');
							for (const key of (ts.isStringLiteral(path) ? path.text : '').split('.'))
								read = f.createPropertyAccessExpression(read, key);
							return read;
						}
						return ts.visitEachChild(x, fields, undefined);
					};
					const blank = ts.createSourceFile(
						'd.js',
						'',
						ts.ScriptTarget.ES2022,
						false,
						ts.ScriptKind.JS,
					);
					const text = this.printer.printNode(
						ts.EmitHint.Unspecified,
						ts.visitNode(n, fields),
						n.getSourceFile() ?? blank,
					);
					const code = `(c) => (${text})`;
					let hash = 0x811c9dc5;
					for (let k = 0; k < code.length; k++) {
						hash ^= code.charCodeAt(k);
						hash = Math.imul(hash, 0x01000193) >>> 0;
					}
					const name = `d${hash.toString(16).padStart(8, '0')}`;
					this.derivations.set(name, code);
					return call('__CREDFIELD', f.createStringLiteral(`n8nDerived.${name}`));
				}
			}
			const tested = this.credentialTests(n, visit);
			if (tested) return tested;
			return ts.visitEachChild(n, visit, undefined);
		};
		return ts.visitNode(root, visit);
	}

	private separateCredentials(root: ts.Node): ts.Node {
		const declared = new Map<string, ts.Block[]>();
		const find = (n: ts.Node) => {
			const list = n.parent;
			const statement = list?.parent;
			const block = statement?.parent;
			if (
				ts.isVariableDeclaration(n) &&
				ts.isIdentifier(n.name) &&
				n.initializer &&
				isWholeCredential(n.initializer) &&
				ts.isVariableDeclarationList(list) &&
				(list.flags & ts.NodeFlags.Const) !== 0 &&
				statement &&
				ts.isVariableStatement(statement) &&
				block &&
				ts.isBlock(block)
			) {
				declared.set(n.name.text, [...(declared.get(n.name.text) ?? []), block]);
			}
			ts.forEachChild(n, find);
		};
		find(root);
		const counts = bindingsOf(root);
		const scopes = new Map<ts.Node, Map<string, string>>();
		for (const [name, blocks] of declared) {
			if (blocks.length < 2 || counts.get(name) !== blocks.length) continue;
			const nested = blocks.some((block) => {
				for (let up: ts.Node | undefined = block.parent; up; up = up.parent)
					if (blocks.some((other) => other === up)) return true;
				return false;
			});
			const fresh = blocks.map((_, k) => `${name}__${k}`);
			if (nested || new Set(blocks).size !== blocks.length || fresh.some((id) => counts.has(id)))
				continue;
			blocks.forEach((block, k) => {
				const names = scopes.get(block) ?? new Map<string, string>();
				names.set(name, fresh[k]);
				scopes.set(block, names);
			});
		}
		if (scopes.size === 0) return root;
		this.changed = true;
		const visit = (n: ts.Node, names: Map<string, string>): ts.Node => {
			const own = scopes.get(n);
			const inner = own ? new Map([...names, ...own]) : names;
			if (ts.isShorthandPropertyAssignment(n) && inner.has(n.name.text)) {
				return f.createPropertyAssignment(
					n.name.text,
					f.createIdentifier(inner.get(n.name.text) ?? n.name.text),
				);
			}
			if (ts.isIdentifier(n) && inner.has(n.text)) {
				const declares = ts.isVariableDeclaration(n.parent) && n.parent.name === n;
				if (declares || isValueUse(n)) return f.createIdentifier(inner.get(n.text) ?? n.text);
			}
			return ts.visitEachChild(n, (c) => visit(c, inner), undefined);
		};
		return visit(root, new Map());
	}

	private propagate(root: ts.Node, where: string): ts.Node {
		const counts = bindingsOf(root);
		let written: Set<string> | undefined;
		const isWrittenName = (name: string) => {
			written ??= writtenNames(root);
			return written.has(name);
		};
		const uses = new Map<string, number>();
		const count = (n: ts.Node) => {
			if (ts.isIdentifier(n) && isValueUse(n)) uses.set(n.text, (uses.get(n.text) ?? 0) + 1);
			ts.forEachChild(n, count);
		};
		count(root);
		const constants = new Map<string, Literal>();

		const credentials = new Map<string, string>();
		const unused = new Set<string>();

		const objects = new Map<string, Map<string, Literal>>();
		const fieldTexts = new Map<string, ts.Expression>();
		const plainValue = (e: ts.Expression) =>
			isPure(e) ||
			isCredentialMarker(e) ||
			(ts.isIdentifier(e) && e.text.startsWith(CREDENTIAL_PREFIX));
		const reads = new Map<string, number>();
		const impureWrites = new Set<string>();
		const noteReads = (n: ts.Node) => {
			if (ts.isIdentifier(n) && isValueUse(n)) {
				const p = n.parent;
				const stored =
					ts.isBinaryExpression(p) &&
					p.left === n &&
					p.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
					ts.isExpressionStatement(p.parent);
				if (!stored) reads.set(n.text, (reads.get(n.text) ?? 0) + 1);
				else if (!plainValue(p.right)) impureWrites.add(n.text);
			}
			ts.forEachChild(n, noteReads);
		};
		noteReads(root);
		const dead = new Set<string>();
		const scan = (n: ts.Node) => {
			if (
				ts.isVariableDeclaration(n) &&
				ts.isIdentifier(n.name) &&
				n.initializer &&
				counts.get(n.name.text) === 1
			) {
				const list = n.parent;
				const isConst =
					ts.isVariableDeclarationList(list) && (list.flags & ts.NodeFlags.Const) !== 0;
				const inLoopHead =
					ts.isVariableDeclarationList(list) &&
					(!ts.isVariableStatement(list.parent) || list.parent === root);
				const lit = literalOf(n.initializer);
				if (
					!inLoopHead &&
					!reads.get(n.name.text) &&
					!impureWrites.has(n.name.text) &&
					plainValue(n.initializer)
				) {
					dead.add(n.name.text);
				}
				if (inLoopHead) {
				} else if (
					ts.isIdentifier(n.initializer) &&
					n.initializer.text.startsWith(CREDENTIAL_PREFIX)
				) {
					credentials.set(n.name.text, n.initializer.text.slice(CREDENTIAL_PREFIX.length));
				} else if (lit && (isConst || !isWrittenName(n.name.text))) {
					constants.set(n.name.text, lit.value);
				} else if (
					isConst &&
					this.credentialPure(n.initializer).ok &&
					this.credentialPure(n.initializer).marker
				) {
					fieldTexts.set(n.name.text, n.initializer);
				} else if (
					isConst &&
					ts.isObjectLiteralExpression(n.initializer) &&
					n.initializer.properties.length > 0
				) {
					const members = new Map<string, Literal>();
					for (const p of n.initializer.properties) {
						const value = ts.isPropertyAssignment(p) ? literalOf(p.initializer) : undefined;
						const key =
							ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))
								? p.name.text
								: undefined;
						if (!value || key === undefined) {
							members.clear();
							break;
						}
						members.set(key, value.value);
					}
					if (members.size > 0) objects.set(n.name.text, members);
				} else if (!uses.get(n.name.text) && isPure(n.initializer)) {
					unused.add(n.name.text);
				}
			}
			ts.forEachChild(n, scan);
		};
		scan(root);
		const bare = (n: ts.Node) => {
			if (
				ts.isVariableDeclaration(n) &&
				ts.isIdentifier(n.name) &&
				!n.initializer &&
				counts.get(n.name.text) === 1
			) {
				const list = n.parent;
				const statement =
					ts.isVariableDeclarationList(list) &&
					ts.isVariableStatement(list.parent) &&
					list.parent !== root;
				if (statement && !reads.get(n.name.text) && !impureWrites.has(n.name.text))
					dead.add(n.name.text);
			}
			ts.forEachChild(n, bare);
		};
		bare(root);
		const readsOnly = (n: ts.Node) => {
			if (ts.isIdentifier(n) && objects.has(n.text) && isValueUse(n)) {
				const p = n.parent;
				const read =
					ts.isPropertyAccessExpression(p) &&
					p.expression === n &&
					objects.get(n.text)?.has(p.name.text);
				const up = read ? p.parent : undefined;
				const written =
					up &&
					((ts.isBinaryExpression(up) &&
						up.left === p &&
						up.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
						up.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
						ts.isDeleteExpression(up) ||
						ts.isPrefixUnaryExpression(up) ||
						ts.isPostfixUnaryExpression(up));
				if (!read || written) objects.delete(n.text);
			}
			ts.forEachChild(n, readsOnly);
		};
		readsOnly(root);
		const readsMarkerField = (n: ts.Node): boolean =>
			(ts.isPropertyAccessExpression(n) &&
				isCredentialMarker(
					ts.isParenthesizedExpression(n.expression) ? n.expression.expression : n.expression,
				) &&
				!(ts.isCallExpression(n.parent) && n.parent.expression === n)) ||
			(ts.forEachChild(n, readsMarkerField) ?? false);
		if (
			constants.size +
				credentials.size +
				unused.size +
				objects.size +
				fieldTexts.size +
				dead.size ===
				0 &&
			!readsMarkerField(root)
		)
			return root;
		this.changed = true;
		const visit = (n: ts.Node): ts.Node | undefined => {
			if (ts.isVariableStatement(n)) {
				const kept = n.declarationList.declarations.filter((d) => {
					const name = ts.isIdentifier(d.name) ? d.name.text : '';
					return (
						!constants.has(name) &&
						!credentials.has(name) &&
						!unused.has(name) &&
						!objects.has(name) &&
						!fieldTexts.has(name) &&
						!dead.has(name)
					);
				});
				if (kept.length === 0) return undefined;
				if (kept.length !== n.declarationList.declarations.length) {
					return ts.visitEachChild(
						f.updateVariableStatement(
							n,
							undefined,
							f.updateVariableDeclarationList(n.declarationList, kept),
						),
						visit,
						undefined,
					);
				}
			}
			if (ts.isPropertyAccessExpression(n)) {
				const base = ts.isParenthesizedExpression(n.expression)
					? n.expression.expression
					: n.expression;
				const called = n.parent && ts.isCallExpression(n.parent) && n.parent.expression === n;
				if (isCredentialMarker(base) && !called) {
					const path = base.arguments[0];
					this.changed = true;
					return call(
						'__CREDFIELD',
						f.createStringLiteral(`${ts.isStringLiteral(path) ? path.text : ''}.${n.name.text}`),
					);
				}
				const names: string[] = [];
				let cursor: ts.Expression = n;
				while (ts.isPropertyAccessExpression(cursor)) {
					names.unshift(cursor.name.text);
					cursor = cursor.expression;
				}
				const up = n.parent;
				const inner = up && ts.isPropertyAccessExpression(up) && up.expression === n;
				const method = inner && ts.isCallExpression(up.parent) && up.parent.expression === up;
				const callee = up && ts.isCallExpression(up) && up.expression === n;
				if (
					ts.isIdentifier(cursor) &&
					credentials.has(cursor.text) &&
					!callee &&
					(!inner || method)
				) {
					return this.credentialField(credentials.get(cursor.text) ?? '', names.join('.'));
				}
				if (
					ts.isIdentifier(cursor) &&
					cursor.text.startsWith(CREDENTIAL_PREFIX) &&
					!callee &&
					(!inner || method)
				) {
					this.changed = true;
					return this.credentialField(cursor.text.slice(CREDENTIAL_PREFIX.length), names.join('.'));
				}
			}
			if (
				ts.isPropertyAccessExpression(n) &&
				ts.isIdentifier(n.expression) &&
				objects.has(n.expression.text)
			) {
				return expressionOf(objects.get(n.expression.text)?.get(n.name.text));
			}
			if (
				ts.isExpressionStatement(n) &&
				ts.isBinaryExpression(n.expression) &&
				n.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
				ts.isIdentifier(n.expression.left) &&
				dead.has(n.expression.left.text)
			) {
				return f.createEmptyStatement();
			}
			if (ts.isShorthandPropertyAssignment(n) && constants.has(n.name.text)) {
				return f.createPropertyAssignment(n.name.text, expressionOf(constants.get(n.name.text)));
			}
			const shorthandField = ts.isShorthandPropertyAssignment(n)
				? fieldTexts.get(n.name.text)
				: undefined;
			if (ts.isShorthandPropertyAssignment(n) && shorthandField) {
				return f.createPropertyAssignment(n.name.text, shorthandField);
			}
			if (ts.isIdentifier(n) && isValueUse(n)) {
				if (constants.has(n.text)) return expressionOf(constants.get(n.text));
				const fieldText = fieldTexts.get(n.text);
				if (fieldText && !ts.isShorthandPropertyAssignment(n.parent))
					return f.createParenthesizedExpression(fieldText);
				const call = n.parent;
				const argument =
					call &&
					ts.isCallExpression(call) &&
					call.arguments.includes(n) &&
					ts.isIdentifier(call.expression) &&
					(!call.expression.text.startsWith('__') || call.expression.text === MINT_GOOGLE);
				const presence =
					call &&
					((ts.isBinaryExpression(call) && EQUALITY_OPERATORS.has(call.operatorToken.kind)) ||
						(ts.isPrefixUnaryExpression(call) && call.operator === ts.SyntaxKind.ExclamationToken));
				const destructured =
					call &&
					ts.isVariableDeclaration(call) &&
					call.initializer === n &&
					ts.isObjectBindingPattern(call.name);
				const keyed =
					call &&
					ts.isElementAccessExpression(call) &&
					call.expression === n &&
					ts.isStringLiteralLike(call.argumentExpression);
				if (credentials.has(n.text) && (argument || presence || destructured || keyed)) {
					return f.createIdentifier(CREDENTIAL_PREFIX + (credentials.get(n.text) ?? ''));
				}
				if (credentials.has(n.text)) {
					this.error(
						where,
						`the credential '${n.text}' is used as a whole value: only its fields can go into a request`,
					);
				}
			}
			return ts.visitEachChild(n, visit, undefined);
		};
		return ts.visitNode(root, visit) as ts.Node;
	}

	private flow(root: ts.Node): ts.Node {
		if (!ts.isFunctionDeclaration(root) || !root.body) return root;
		const counts = bindingsOf(root);
		const fixed = new Set<string>(
			root.parameters.map((p) => (ts.isIdentifier(p.name) ? p.name.text : '')),
		);
		const captured = new Set<string>();
		const targetOf = (n: ts.Node): string | undefined => {
			if (
				ts.isBinaryExpression(n) &&
				n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
				n.operatorToken.kind <= ts.SyntaxKind.LastAssignment
			) {
				return ts.isIdentifier(n.left) ? n.left.text : undefined;
			}
			if (
				(ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) &&
				ts.isIdentifier(n.operand)
			) {
				const op = n.operator;
				if (op === ts.SyntaxKind.PlusPlusToken || op === ts.SyntaxKind.MinusMinusToken)
					return n.operand.text;
			}
			return undefined;
		};
		const mark = (n: ts.Node, inner: boolean) => {
			const name = targetOf(n);
			if (name && inner) fixed.add(name);
			if (inner && ts.isIdentifier(n)) captured.add(n.text);
			ts.forEachChild(n, (c) => mark(c, inner || (c !== root && ts.isFunctionLike(c))));
		};
		mark(root, false);
		for (const name of patternTargets(root)) fixed.add(name);
		const assignedIn = (n: ts.Node, out = new Set<string>()): Set<string> => {
			const name = targetOf(n);
			if (name) out.add(name);
			ts.forEachChild(n, (c) => {
				assignedIn(c, out);
			});
			return out;
		};
		const tracked = (name: string) => counts.get(name) === 1 && !fixed.has(name);
		const holdsObject = (name: string) =>
			counts.get(name) === 1 && !fixed.has(name) && !captured.has(name);

		interface Obj {
			props: Map<string, Literal | typeof UNKNOWN>;
		}
		interface Env {
			scalars: Map<string, Literal | { credential: string }>;
			vars: Map<string, Obj>;
		}
		const empty = (): Env => ({ scalars: new Map(), vars: new Map() });
		const copy = (env: Env): Env => {
			const copies = new Map<Obj, Obj>();
			const vars = new Map<string, Obj>();
			for (const [name, obj] of env.vars) {
				const twin = copies.get(obj) ?? { props: new Map(obj.props) };
				copies.set(obj, twin);
				vars.set(name, twin);
			}
			return { scalars: new Map(env.scalars), vars };
		};
		const drop = (env: Env, obj: Obj) => {
			for (const [name, held] of [...env.vars]) if (held === obj) env.vars.delete(name);
		};
		const isWritten = (access: ts.Node): boolean => {
			const p = access.parent;
			if (!p) return false;
			if (
				ts.isBinaryExpression(p) &&
				p.left === access &&
				p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
				p.operatorToken.kind <= ts.SyntaxKind.LastAssignment
			)
				return true;
			if (ts.isDeleteExpression(p)) return true;
			if (
				(ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p)) &&
				(p.operator === ts.SyntaxKind.PlusPlusToken || p.operator === ts.SyntaxKind.MinusMinusToken)
			)
				return true;
			return ts.isCallExpression(p) && p.expression === access;
		};
		const keysArgument = (n: ts.Identifier): boolean => {
			const p = n.parent;
			return (
				ts.isCallExpression(p) &&
				ts.isPropertyAccessExpression(p.expression) &&
				ts.isIdentifier(p.expression.expression) &&
				p.expression.expression.text === 'Object' &&
				['keys', 'values', 'entries'].includes(p.expression.name.text)
			);
		};
		const escaping = (node: ts.Node, env: Env, exempt: Set<ts.Node>): Set<Obj> => {
			const out = new Set<Obj>();
			const walk = (n: ts.Node, inner: boolean) => {
				if (ts.isIdentifier(n) && isValueUse(n) && !exempt.has(n)) {
					const obj = env.vars.get(n.text);
					const p = n.parent;
					const member =
						(ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) &&
						p.expression === n;
					if (obj && (inner || !((member && !isWritten(p)) || keysArgument(n)))) out.add(obj);
				}
				ts.forEachChild(n, (c) => walk(c, inner || ts.isFunctionLike(c)));
			};
			walk(node, false);
			return out;
		};
		const mentioned = (node: ts.Node, env: Env) => {
			const walk = (n: ts.Node) => {
				if (ts.isIdentifier(n)) {
					const obj = env.vars.get(n.text);
					if (obj) drop(env, obj);
				}
				ts.forEachChild(n, walk);
			};
			walk(node);
		};
		const substitute = <T extends ts.Node>(node: T, env: Env): T => {
			if (env.scalars.size === 0 && env.vars.size === 0) return node;
			const visit = (n: ts.Node): ts.Node => {
				if (ts.isFunctionLike(n)) return n;
				if (
					ts.isPropertyAccessExpression(n) &&
					n.name.text === 'length' &&
					ts.isCallExpression(n.expression)
				) {
					const [only] = n.expression.arguments;
					if (
						only &&
						ts.isIdentifier(only) &&
						keysArgument(only) &&
						n.expression.arguments.length === 1
					) {
						const obj = env.vars.get(only.text);
						const callee = n.expression.expression;
						if (obj && ts.isPropertyAccessExpression(callee) && callee.name.text === 'keys') {
							this.changed = true;
							return f.createNumericLiteral(obj.props.size);
						}
					}
				}
				if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && !isWritten(n)) {
					const obj = env.vars.get(n.expression.text);
					const value = obj?.props.get(n.name.text);
					if (obj && value !== UNKNOWN) {
						this.changed = true;
						return expressionOf(value);
					}
				}
				if (ts.isShorthandPropertyAssignment(n) && env.scalars.has(n.name.text)) {
					const held = env.scalars.get(n.name.text);
					if (typeof held !== 'object' || held === null) {
						this.changed = true;
						return f.createPropertyAssignment(n.name.text, expressionOf(held));
					}
				}
				if (ts.isIdentifier(n) && env.scalars.has(n.text) && isValueUse(n)) {
					const p = n.parent;
					const written =
						p && targetOf(p) === n.text && (ts.isBinaryExpression(p) ? p.left === n : true);
					if (!written && !(p && ts.isShorthandPropertyAssignment(p))) {
						this.changed = true;
						const held = env.scalars.get(n.text);
						return typeof held === 'object' && held !== null
							? f.createIdentifier(held.credential)
							: expressionOf(held);
					}
				}
				return ts.visitEachChild(n, visit, undefined);
			};
			return ts.visitNode(node, visit) as T;
		};
		const objectOf = (literal: ts.ObjectLiteralExpression): Obj | undefined => {
			const props = new Map<string, Literal | typeof UNKNOWN>();
			for (const p of literal.properties) {
				if (ts.isShorthandPropertyAssignment(p)) {
					props.set(p.name.text, UNKNOWN);
					continue;
				}
				if (!ts.isPropertyAssignment(p) || !(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)))
					return undefined;
				const value = literalOf(p.initializer);
				props.set(p.name.text, value ? value.value : UNKNOWN);
			}
			return { props };
		};
		const bind = (env: Env, name: string, value: ts.Expression | undefined) => {
			env.vars.delete(name);
			if (!value || !holdsObject(name)) return;
			if (ts.isObjectLiteralExpression(value)) {
				const obj = objectOf(value);
				if (obj) env.vars.set(name, obj);
			} else if (ts.isIdentifier(value)) {
				const obj = env.vars.get(value.text);
				if (obj) env.vars.set(name, obj);
			}
		};
		const effect = (original: ts.Statement, out: ts.Statement, env: Env) => {
			const exempt = new Set<ts.Node>();
			const expression = ts.isExpressionStatement(original) ? original.expression : undefined;
			const after = ts.isExpressionStatement(out) ? out.expression : undefined;
			const single =
				ts.isVariableStatement(original) && original.declarationList.declarations.length === 1
					? original.declarationList.declarations[0]
					: undefined;
			if (single?.initializer && ts.isIdentifier(single.initializer))
				exempt.add(single.initializer);
			if (
				expression &&
				ts.isBinaryExpression(expression) &&
				expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
			) {
				if (ts.isIdentifier(expression.right)) exempt.add(expression.right);
				const left = expression.left;
				if (
					(ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left)) &&
					ts.isIdentifier(left.expression)
				)
					exempt.add(left.expression);
			}
			if (expression && ts.isDeleteExpression(expression)) {
				const target = expression.expression;
				if (ts.isPropertyAccessExpression(target) && ts.isIdentifier(target.expression))
					exempt.add(target.expression);
			}
			const merge =
				expression &&
				ts.isCallExpression(expression) &&
				ts.isIdentifier(expression.expression) &&
				expression.expression.text === '__assign' &&
				expression.arguments.length === 2
					? expression
					: undefined;
			if (merge) for (const a of merge.arguments) if (ts.isIdentifier(a)) exempt.add(a);
			for (const obj of escaping(original, env, exempt)) drop(env, obj);

			if (single && ts.isIdentifier(single.name) && ts.isVariableStatement(out)) {
				bind(env, single.name.text, out.declarationList.declarations[0]?.initializer);
			} else if (
				after &&
				ts.isBinaryExpression(after) &&
				after.operatorToken.kind === ts.SyntaxKind.EqualsToken
			) {
				const left = after.left;
				if (ts.isIdentifier(left)) bind(env, left.text, after.right);
				else if (ts.isPropertyAccessExpression(left) && ts.isIdentifier(left.expression)) {
					const value = literalOf(after.right);
					env.vars
						.get(left.expression.text)
						?.props.set(left.name.text, value ? value.value : UNKNOWN);
				} else if (ts.isElementAccessExpression(left) && ts.isIdentifier(left.expression)) {
					const obj = env.vars.get(left.expression.text);
					const key = left.argumentExpression;
					const value = literalOf(after.right);
					if (obj && ts.isStringLiteral(key))
						obj.props.set(key.text, value ? value.value : UNKNOWN);
					else if (obj) drop(env, obj);
				}
			} else if (after && ts.isDeleteExpression(after)) {
				const target = after.expression;
				if (ts.isPropertyAccessExpression(target) && ts.isIdentifier(target.expression)) {
					env.vars.get(target.expression.text)?.props.delete(target.name.text);
				}
			} else if (merge) {
				const [to, from] = merge.arguments;
				const target = ts.isIdentifier(to) ? env.vars.get(to.text) : undefined;
				const source = ts.isIdentifier(from) ? env.vars.get(from.text) : undefined;
				if (target && source) for (const [key, value] of source.props) target.props.set(key, value);
				else if (target) drop(env, target);
			}
		};
		const branch = (st: ts.Statement, env: Env): ts.Statement =>
			ts.isBlock(st) ? f.updateBlock(st, block(st.statements, env)) : block([st], env)[0];
		const block = (statements: readonly ts.Statement[], env: Env): ts.Statement[] =>
			statements.map((st) => {
				const assigned = assignedIn(st);
				let out: ts.Statement;
				if (ts.isBlock(st)) return f.updateBlock(st, block(st.statements, env));
				if (ts.isIfStatement(st)) {
					const condition = substitute(st.expression, env);
					out = f.updateIfStatement(
						st,
						condition,
						branch(st.thenStatement, copy(env)),
						st.elseStatement ? branch(st.elseStatement, copy(env)) : undefined,
					);
					const decided = literalOf(condition);
					if (decided === undefined) mentioned(st, env);
					else if (decided.value) mentioned(st.thenStatement, env);
					else if (st.elseStatement) mentioned(st.elseStatement, env);
				} else if (
					ts.isForStatement(st) ||
					ts.isForOfStatement(st) ||
					ts.isForInStatement(st) ||
					ts.isWhileStatement(st) ||
					ts.isDoStatement(st)
				) {
					const around = empty();
					for (const [name, held] of env.scalars) {
						if (typeof held === 'object' && held !== null && !assigned.has(name))
							around.scalars.set(name, held);
					}
					const body = branch(st.statement, around);
					const reading = copy(env);
					for (const name of assigned) reading.scalars.delete(name);
					const source = ts.isForOfStatement(st) ? st.expression : undefined;
					const iterated = source ? substitute(source, reading) : undefined;
					out = ts.visitEachChild(
						st,
						(c) => (c === st.statement ? body : iterated && c === source ? iterated : c),
						undefined,
					);
					mentioned(st, env);
				} else if (ts.isTryStatement(st)) {
					const inside = copy(env);
					for (const name of assigned) inside.scalars.delete(name);
					const tried = f.updateBlock(st.tryBlock, block(st.tryBlock.statements, inside));
					const caught = st.catchClause
						? f.updateCatchClause(
								st.catchClause,
								st.catchClause.variableDeclaration,
								f.updateBlock(
									st.catchClause.block,
									block(st.catchClause.block.statements, empty()),
								),
							)
						: undefined;
					const last = st.finallyBlock
						? f.updateBlock(st.finallyBlock, block(st.finallyBlock.statements, empty()))
						: undefined;
					out = f.updateTryStatement(st, tried, caught, last);
					mentioned(st, env);
				} else {
					const reading = copy(env);
					for (const name of assigned) reading.scalars.delete(name);
					out = substitute(st, reading);
					effect(st, out, env);
				}
				for (const name of assigned) env.scalars.delete(name);
				if (ts.isVariableStatement(out)) {
					for (const d of out.declarationList.declarations) {
						const lit = d.initializer ? literalOf(d.initializer) : undefined;
						if (
							ts.isIdentifier(d.name) &&
							lit &&
							tracked(d.name.text) &&
							!(out.declarationList.flags & ts.NodeFlags.Const)
						) {
							env.scalars.set(d.name.text, lit.value);
						}
					}
				} else if (ts.isExpressionStatement(out)) {
					const e = out.expression;
					if (
						ts.isBinaryExpression(e) &&
						e.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
						ts.isIdentifier(e.left)
					) {
						const lit = literalOf(e.right);
						if (lit && tracked(e.left.text)) env.scalars.set(e.left.text, lit.value);
						if (
							ts.isIdentifier(e.right) &&
							e.right.text.startsWith(CREDENTIAL_PREFIX) &&
							tracked(e.left.text)
						) {
							env.scalars.set(e.left.text, { credential: e.right.text });
						}
					}
				}
				return out;
			});
		return f.updateFunctionDeclaration(
			root,
			root.modifiers,
			root.asteriskToken,
			root.name,
			root.typeParameters,
			root.parameters,
			root.type,
			f.updateBlock(root.body, block(root.body.statements, empty())),
		);
	}

	private reduce(root: ts.Node): ts.Node {
		const visit = (input: ts.Node): ts.Node | ts.Node[] | undefined => {
			if (
				ts.isOptionalChain(input) &&
				chainStartsAbsent(input) &&
				!(input.parent && ts.isDeleteExpression(input.parent))
			) {
				this.changed = true;
				return f.createIdentifier('undefined');
			}
			const n = ts.visitEachChild(input, visit, undefined);
			const done = <T>(value: T): T => {
				this.changed = true;
				return value;
			};
			if (
				ts.isPropertyAccessExpression(n) &&
				!n.questionDotToken &&
				isEmptyObject(n.expression) &&
				!(n.name.text in Object.prototype) &&
				input.parent &&
				!isWritten(input) &&
				!(ts.isCallExpression(input.parent) && input.parent.expression === input) &&
				!(ts.isTaggedTemplateExpression(input.parent) && input.parent.tag === input)
			)
				return done(f.createIdentifier('undefined'));
			if (ts.isParenthesizedExpression(n) && literalOf(n.expression)) return done(n.expression);
			if (isThisCall(n, 'getNodeParameter')) {
				const bound = this.parameter(n, true);
				if (bound !== n) return done(bound);
			}
			if (isThisCall(n, 'getInputData') && readsFirstInput(n))
				return done(f.createIdentifier('__items'));
			if (ts.isForOfStatement(n)) {
				const unrolled = unrollParameterLoop(n);
				if (unrolled) return done(unrolled);
			}
			if (ts.isBinaryExpression(n)) {
				const op = n.operatorToken.kind;
				const left = literalOf(n.left);
				if (left && op === ts.SyntaxKind.AmpersandAmpersandToken)
					return done(left.value ? n.right : n.left);
				if (left && op === ts.SyntaxKind.BarBarToken) return done(left.value ? n.left : n.right);
				if (left && op === ts.SyntaxKind.QuestionQuestionToken) {
					return done(left.value === null || left.value === undefined ? n.right : n.left);
				}
				const right = literalOf(n.right);
				if (left && right) {
					const value = compare(op, left.value, right.value);
					if (value !== NO_FOLD) return done(expressionOf(value));
				}
				const absent = (lit: { value: Literal } | undefined) =>
					lit !== undefined && (lit.value === undefined || lit.value === null);
				if (
					EQUALITY_OPERATORS.has(op) &&
					((isWholeCredential(n.left) && absent(right)) ||
						(isWholeCredential(n.right) && absent(left)))
				) {
					return done(
						expressionOf(
							op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
								op === ts.SyntaxKind.ExclamationEqualsToken,
						),
					);
				}
			}
			if (
				ts.isElementAccessExpression(n) &&
				isWholeCredential(n.expression) &&
				ts.isStringLiteralLike(n.argumentExpression)
			) {
				return done(
					this.credentialField(
						n.expression.text.slice(CREDENTIAL_PREFIX.length),
						n.argumentExpression.text,
					),
				);
			}
			if (
				ts.isVariableDeclaration(n) &&
				ts.isObjectBindingPattern(n.name) &&
				n.initializer &&
				isWholeCredential(n.initializer)
			) {
				const type = n.initializer.text.slice(CREDENTIAL_PREFIX.length);
				const bindings = plainBindings(n.name);
				if (bindings) {
					return done(
						bindings.map((b) =>
							f.createVariableDeclaration(
								b.name,
								undefined,
								undefined,
								this.credentialField(type, b.field),
							),
						),
					);
				}
			}
			if (
				ts.isCallExpression(n) &&
				n.arguments.length === 1 &&
				ts.isPropertyAccessExpression(n.expression) &&
				ts.isIdentifier(n.expression.expression) &&
				n.expression.expression.text === 'Array' &&
				n.expression.name.text === 'isArray' &&
				literalOf(n.arguments[0])
			)
				return done(f.createFalse());
			if (
				ts.isCallExpression(n) &&
				ts.isIdentifier(n.expression) &&
				n.expression.text === LATER_AUTHENTICATE &&
				n.arguments.length === 2 &&
				ts.isStringLiteral(n.arguments[0])
			) {
				const authenticate = this.authenticateUnit(n.arguments[0].text, true);
				const options = ts.visitNode(n.arguments[1], visit) as ts.Expression;
				const authenticated = authenticate
					? f.createAwaitExpression(call(authenticate, options))
					: options;
				return done(
					this.getsSessionToken(n.arguments[0].text)
						? call(SESSION_MARKER, authenticated)
						: authenticated,
				);
			}
			if (
				ts.isCallExpression(n) &&
				ts.isIdentifier(n.expression) &&
				n.expression.text === '__request' &&
				n.arguments.length === 3 &&
				n.arguments[1].kind === ts.SyntaxKind.TrueKeyword &&
				isSessionMarker(n.arguments[0])
			) {
				const options = n.arguments[0].arguments[0];
				if (n.arguments[2].kind === ts.SyntaxKind.TrueKeyword)
					return done(this.helper('__requestRenewed', options));
				if (n.arguments[2].kind === ts.SyntaxKind.FalseKeyword)
					return done(call('__request', options, n.arguments[1], n.arguments[2]));
			}
			if (ts.isTypeOfExpression(n)) {
				const operand = literalOf(n.expression);
				if (operand)
					return done(expressionOf(operand.value === null ? 'object' : typeof operand.value));
			}
			if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.ExclamationToken) {
				if (isWholeCredential(n.operand)) return done(f.createFalse());
				const operand = literalOf(n.operand);
				if (operand) return done(expressionOf(!operand.value));
			}
			if (
				this.input.evaluate &&
				ts.isCallExpression(n) &&
				n.arguments.length === 1 &&
				ts.isPropertyAccessExpression(n.expression) &&
				n.expression.name.text === 'test' &&
				ts.isRegularExpressionLiteral(n.expression.expression)
			) {
				const subject = literalOf(n.arguments[0]);
				if (subject && typeof subject.value === 'string') {
					try {
						const result = this.input.evaluate(
							`${n.expression.expression.text}.test(${JSON.stringify(subject.value)})`,
						);
						if (typeof result === 'boolean') return done(expressionOf(result));
					} catch {
						return n;
					}
				}
			}
			if (
				ts.isCallExpression(n) &&
				ts.isPropertyAccessExpression(n.expression) &&
				!n.expression.questionDotToken &&
				ts.isStringLiteralLike(n.expression.expression)
			) {
				const given = n.arguments.map((arg) => literalOf(arg));
				const folded = given.every((arg) => arg !== undefined)
					? foldTextMethod(
							n.expression.expression.text,
							n.expression.name.text,
							given.map((arg) => arg?.value),
						)
					: undefined;
				if (folded) return done(expressionOf(folded.value));
			}
			if (ts.isPropertyAccessExpression(n) && input.parent && !isWritten(input)) {
				const count = literalKeyCount(n);
				if (count !== undefined) return done(expressionOf(count));
			}
			if (ts.isConditionalExpression(n)) {
				const condition = literalOf(n.condition);
				if (condition) return done(condition.value ? n.whenTrue : n.whenFalse);
			}
			if (ts.isTemplateExpression(n)) {
				let head = n.head.text;
				const spans: Array<{ expression: ts.Expression; text: string }> = [];
				let joined = false;
				for (const span of n.templateSpans) {
					const lit = literalOf(span.expression);
					if (lit && lit.value !== undefined && lit.value !== null) {
						joined = true;
						if (spans.length === 0) head += String(lit.value) + span.literal.text;
						else spans[spans.length - 1].text += String(lit.value) + span.literal.text;
					} else {
						spans.push({ expression: span.expression, text: span.literal.text });
					}
				}
				if (joined) {
					if (spans.length === 0) return done(f.createStringLiteral(head));
					return done(
						f.createTemplateExpression(
							f.createTemplateHead(head),
							spans.map((s, k) =>
								f.createTemplateSpan(
									s.expression,
									k === spans.length - 1
										? f.createTemplateTail(s.text)
										: f.createTemplateMiddle(s.text),
								),
							),
						),
					);
				}
			}
			if (ts.isPropertyAccessExpression(n) && ts.isObjectLiteralExpression(n.expression)) {
				for (const p of n.expression.properties) {
					if (!ts.isPropertyAssignment(p) || !literalOf(p.initializer)) continue;
					const key =
						ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : undefined;
					if (key === n.name.text) return done(p.initializer);
				}
			}
			if (ts.isIfStatement(n)) {
				const condition = literalOf(n.expression);
				if (condition)
					return done(
						condition.value ? n.thenStatement : (n.elseStatement ?? f.createEmptyStatement()),
					);
			}
			if (ts.isExpressionStatement(n) && literalOf(n.expression))
				return done(f.createEmptyStatement());
			if (ts.isSwitchStatement(n)) {
				const on = literalOf(n.expression);
				const clauses = n.caseBlock.clauses;
				if (on && clauses.every((c) => ts.isDefaultClause(c) || literalOf(c.expression))) {
					const hit =
						clauses.find(
							(c) => ts.isCaseClause(c) && literalOf(c.expression)?.value === on.value,
						) ?? clauses.find((c) => ts.isDefaultClause(c));
					if (!hit) return done(f.createEmptyStatement());
					const body: ts.Statement[] = [];
					const closes = (st: ts.Statement | undefined) =>
						st !== undefined && (ts.isBreakStatement(st) || ends(st));
					for (let at = clauses.indexOf(hit); at < clauses.length && !closes(body.at(-1)); at++)
						body.push(...clauses[at].statements);
					const last = body.at(-1);
					const inner = body.some(
						(s) => !(s === last && ts.isBreakStatement(s)) && containsBreak(s),
					);
					if (!inner) {
						if (last && ts.isBreakStatement(last)) body.pop();
						return done(f.createBlock(body, true));
					}
				}
			}
			if (ts.isBlock(n) || ts.isSourceFile(n) || ts.isCaseClause(n) || ts.isDefaultClause(n)) {
				const statements = n.statements;
				const cut = statements.findIndex(ends);
				const dead = cut >= 0 && cut < statements.length - 1;
				const isEmpty = (s: ts.Statement) =>
					ts.isEmptyStatement(s) || (ts.isBlock(s) && s.statements.length === 0);
				const empty = statements.some(isEmpty);
				if ((dead || empty) && ts.isBlock(n)) {
					const kept = (dead ? statements.slice(0, cut + 1) : [...statements]).filter(
						(s) => !isEmpty(s),
					);
					return done(f.updateBlock(n, kept));
				}
			}
			return n;
		};
		return ts.visitNode(root, visit) as ts.Node;
	}

	private member(file: FileModel, name: string, hops = 0): Resolved | undefined {
		if (hops > 12) return undefined;
		const node = file.declarations.get(name);
		if (node) return { file, node };
		const space = file.namespaces.get(name);
		if (space !== undefined) {
			const target = this.resolveModule(file, space);
			return target ? { file: target } : undefined;
		}
		const imported = file.imports.get(name);
		if (!imported) return undefined;
		const target = this.resolveModule(file, imported.from);
		return target ? this.exported(target, imported.name, hops + 1) : undefined;
	}

	private exported(file: FileModel, name: string, hops = 0): Resolved | undefined {
		if (hops > 12) return undefined;
		const local = file.exportLocal.get(name);
		if (local !== undefined) return this.member(file, local, hops + 1);
		const from = file.exportFrom.get(name);
		if (from) {
			const target = this.resolveModule(file, from.from);
			if (!target) return undefined;
			return from.name === '*' ? { file: target } : this.exported(target, from.name, hops + 1);
		}
		const node = file.declarations.get(name);
		if (node) return { file, node };
		for (const star of file.exportStar) {
			const target = this.resolveModule(file, star);
			const found = target ? this.exported(target, name, hops + 1) : undefined;
			if (found) return found;
		}
		return undefined;
	}

	private resolveChains(root: ts.Node, unit: Unit): ts.Node {
		const bound = bindingsOf(root);
		const tables = new Map<string, Map<string, ts.Expression>>();
		const aliases = new Map<string, ts.Expression>();
		const resolve = (
			e: ts.Expression,
			hops = 0,
		):
			| {
					alias: string;
					node?: NonNullable<Resolved['node']> | ts.MethodDeclaration;
					file: FileModel;
			  }
			| undefined => {
			const keys: string[] = [];
			let cur = e;
			for (;;) {
				if (ts.isPropertyAccessExpression(cur)) {
					keys.unshift(cur.name.text);
					cur = cur.expression;
				} else if (
					ts.isElementAccessExpression(cur) &&
					ts.isStringLiteral(cur.argumentExpression)
				) {
					keys.unshift(cur.argumentExpression.text);
					cur = cur.expression;
				} else break;
			}
			if (!ts.isIdentifier(cur)) return undefined;
			if (bound.has(cur.text)) {
				const same = aliases.get(cur.text);
				const entry = same ?? (keys.length > 0 ? tables.get(cur.text)?.get(keys[0]) : undefined);
				if (!entry || hops >= MAX_TABLE_HOPS) return undefined;
				return resolve(
					keys
						.slice(same ? 0 : 1)
						.reduce((inner, key) => f.createPropertyAccessExpression(inner, key), entry),
					hops + 1,
				);
			}
			const alias = [cur.text, ...keys].join('_');
			let found = this.member(unit.file, cur.text);
			for (const [k, key] of keys.entries()) {
				if (found?.node && ts.isClassDeclaration(found.node) && k === keys.length - 1) {
					const method = this.staticMethodOf(found.node, key);
					return method ? { alias, node: method, file: found.file } : undefined;
				}
				found = found && !found.node ? this.exported(found.file, key) : undefined;
			}
			return found ? { alias, node: found.node, file: found.file } : undefined;
		};
		const locate = (e: ts.Expression) => {
			const found = ts.isIdentifier(e) ? undefined : resolve(e);
			return found?.node ? { alias: found.alias, node: found.node, file: found.file } : undefined;
		};
		const target = (e: ts.Expression, withContext: boolean): string | undefined => {
			const located = locate(e);
			if (!located) return undefined;
			const { alias, node, file } = located;
			const isStatic = ts.isMethodDeclaration(node);
			if (isStatic && !withContext && node.body && mentionsThis(node.body)) {
				this.error(
					unit.name,
					`the static method '${alias}' uses \`this\`, and a call does not give the n8n context`,
				);
				return undefined;
			}
			const known = this.units.get(alias);
			if (known) {
				if (isStatic && known.node !== node)
					this.error(unit.name, `two declarations have the name '${alias}'`);
			} else {
				const next: Unit = {
					name: alias,
					node,
					file,
					withContext,
					...(isStatic ? { isStatic } : {}),
				};
				this.units.set(alias, next);
				this.queue.push(next);
			}
			return alias;
		};
		const usesOf = new Map<string, ts.Identifier[]>();
		const madeAt = new Map<string, number>();
		const scopes = new Map<string, ts.Node>();
		const hoisted = (n: ts.Node): boolean =>
			n !== root && (ts.isFunctionDeclaration(n) || (!!n.parent && hoisted(n.parent)));
		const inside = (n: ts.Node, scope: ts.Node | undefined): boolean =>
			n === scope || (!!n.parent && n !== root && inside(n.parent, scope));
		const early = (use: ts.Identifier): boolean =>
			use.pos < (madeAt.get(use.text) ?? Infinity) ||
			hoisted(use) ||
			!inside(use, scopes.get(use.text));
		const isPath = (e: ts.Expression): boolean =>
			ts.isIdentifier(e) ||
			(ts.isPropertyAccessExpression(e) && isPath(e.expression)) ||
			(ts.isElementAccessExpression(e) &&
				ts.isStringLiteral(e.argumentExpression) &&
				isPath(e.expression));
		const bare = new Set<string>();
		const assigned = new Map<string, ts.ExpressionStatement[]>();
		const direct = (n: ts.Node): boolean =>
			ts.isBlock(n.parent) &&
			(ts.isFunctionLike(n.parent.parent) ? n.parent.parent === root : direct(n.parent));
		const collect = (n: ts.Node) => {
			if (ts.isIdentifier(n) && isValueUse(n) && bound.get(n.text) === 1)
				usesOf.set(n.text, [...(usesOf.get(n.text) ?? []), n]);
			if (
				ts.isVariableDeclaration(n) &&
				ts.isIdentifier(n.name) &&
				bound.get(n.name.text) === 1 &&
				ts.isVariableStatement(n.parent.parent)
			) {
				scopes.set(n.name.text, n.parent.parent.parent);
				if (!n.initializer) bare.add(n.name.text);
				else if ((n.parent.flags & ts.NodeFlags.Const) !== 0 && isPath(n.initializer)) {
					aliases.set(n.name.text, n.initializer);
					madeAt.set(n.name.text, n.end);
				}
			}
			if (
				ts.isExpressionStatement(n) &&
				ts.isBinaryExpression(n.expression) &&
				n.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
				ts.isIdentifier(n.expression.left)
			)
				assigned.set(n.expression.left.text, [...(assigned.get(n.expression.left.text) ?? []), n]);
			if (
				ts.isVariableDeclaration(n) &&
				ts.isIdentifier(n.name) &&
				bound.get(n.name.text) === 1 &&
				(n.parent.flags & ts.NodeFlags.Const) !== 0 &&
				ts.isVariableStatement(n.parent.parent) &&
				n.initializer &&
				ts.isObjectLiteralExpression(n.initializer) &&
				n.initializer.properties.length > 0
			) {
				const table = new Map<string, ts.Expression>();
				const plain = n.initializer.properties.every((p) => {
					if (!ts.isPropertyAssignment(p)) return false;
					const key =
						ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : undefined;
					if (key === undefined || key === '__proto__' || table.has(key)) return false;
					table.set(key, p.initializer);
					return ts.isPropertyAccessExpression(p.initializer);
				});
				if (plain) {
					tables.set(n.name.text, table);
					madeAt.set(n.name.text, n.end);
				}
			}
			ts.forEachChild(n, collect);
		};
		collect(root);
		const stores = new Map<string, ts.ExpressionStatement>();
		for (const name of bare) {
			const [store, ...more] = assigned.get(name) ?? [];
			if (
				!store ||
				more.length > 0 ||
				!direct(store) ||
				!ts.isBinaryExpression(store.expression) ||
				!isPath(store.expression.right)
			)
				continue;
			aliases.set(name, store.expression.right);
			madeAt.set(name, store.end);
			stores.set(name, store);
		}
		const topOf = (use: ts.Identifier): ts.Expression => {
			let top: ts.Expression = use;
			while (
				(ts.isPropertyAccessExpression(top.parent) ||
					(ts.isElementAccessExpression(top.parent) &&
						ts.isStringLiteral(top.parent.argumentExpression))) &&
				top.parent.expression === top
			)
				top = top.parent;
			return top;
		};
		const calledMember = (use: ts.Identifier): ts.Expression | undefined => {
			const top = topOf(use);
			const made = top.parent;
			if (top === use || !ts.isCallExpression(made)) return undefined;
			if (early(use)) return undefined;
			const plain = made.expression === top;
			const withContext =
				ts.isIdentifier(made.expression) &&
				made.expression.text === '__CTXCALL' &&
				made.arguments[0] === top;
			return plain || withContext ? top : undefined;
		};
		const denied = (use: ts.Identifier): boolean =>
			ts.isPrefixUnaryExpression(use.parent) &&
			use.parent.operator === ts.SyntaxKind.ExclamationToken &&
			ts.isIfStatement(use.parent.parent) &&
			use.parent.parent.expression === use.parent &&
			aliases.has(use.text);
		const sameAs = (use: ts.Identifier): boolean => {
			const called = calledMember(use);
			if (called) return locate(called) !== undefined;
			const store = stores.get(use.text)?.expression;
			if (store && ts.isBinaryExpression(store) && store.left === use)
				return inside(use, scopes.get(use.text));
			if (early(use)) return false;
			const top = topOf(use);
			const made = top.parent;
			if (ts.isVariableDeclaration(made) && ts.isIdentifier(made.name))
				return aliases.get(made.name.text) === top;
			if (ts.isBinaryExpression(made) && ts.isIdentifier(made.left))
				return made.right === top && aliases.get(made.left.text) === top;
			if (!denied(use)) return false;
			const found = resolve(use);
			return (
				!!found &&
				(!found.node ||
					ts.isFunctionDeclaration(found.node) ||
					ts.isClassDeclaration(found.node) ||
					ts.isMethodDeclaration(found.node))
			);
		};
		for (let round = 0; round <= tables.size + aliases.size; round++) {
			const before = tables.size + aliases.size;
			for (const [name, table] of [...tables]) {
				const uses = (usesOf.get(name) ?? []).map(calledMember);
				const sound =
					uses.length > 0 &&
					[...table.values()].every((entry) => locate(entry) !== undefined) &&
					uses.every((use) => use !== undefined && locate(use) !== undefined);
				if (!sound) tables.delete(name);
			}
			for (const [name, same] of [...aliases]) {
				const uses = usesOf.get(name) ?? [];
				const read = uses.length > (stores.has(name) ? 1 : 0);
				if (!read || resolve(same) === undefined || !uses.every(sameAs)) aliases.delete(name);
			}
			if (tables.size + aliases.size === before) break;
		}
		const visit = (n: ts.Node): ts.Node | undefined => {
			if (
				ts.isExpressionStatement(n) &&
				[...stores].some(([name, st]) => st === n && aliases.has(name))
			)
				return undefined;
			if (ts.isPrefixUnaryExpression(n) && ts.isIdentifier(n.operand) && denied(n.operand))
				return f.createFalse();
			if (ts.isVariableStatement(n)) {
				const kept = n.declarationList.declarations.filter(
					(d) =>
						!(ts.isIdentifier(d.name) && (tables.has(d.name.text) || aliases.has(d.name.text))),
				);
				if (kept.length === 0) return undefined;
				if (kept.length < n.declarationList.declarations.length)
					return ts.visitEachChild(
						f.updateVariableStatement(
							n,
							n.modifiers,
							f.updateVariableDeclarationList(n.declarationList, kept),
						),
						visit,
						undefined,
					);
			}
			const out = ts.visitEachChild(n, visit, undefined);
			if (!ts.isCallExpression(out)) return out;
			if (ts.isIdentifier(out.expression) && out.expression.text === '__CTXCALL') {
				const alias = out.arguments.length > 0 ? target(out.arguments[0], true) : undefined;
				if (!alias) return out;
				return call(
					alias,
					...CONTEXT_PARAMS.map((p) => f.createIdentifier(p)),
					...out.arguments.slice(1),
				);
			}
			const alias = target(out.expression, false);
			return alias ? call(alias, ...out.arguments) : out;
		};
		return ts.visitNode(root, visit) ?? root;
	}

	private staticMethodOf(cls: ts.ClassDeclaration, name: string): ts.MethodDeclaration | undefined {
		const uses = (n: ts.Node): boolean =>
			n.kind === ts.SyntaxKind.SuperKeyword || (ts.forEachChild(n, uses) ?? false);
		return cls.members.find(
			(m): m is ts.MethodDeclaration =>
				ts.isMethodDeclaration(m) &&
				ts.isIdentifier(m.name) &&
				m.name.text === name &&
				!!m.body &&
				!m.asteriskToken &&
				!uses(m) &&
				!!ts.getModifiers(m)?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword),
		);
	}

	private lowerStatic(source: ts.MethodDeclaration, unit: Unit) {
		return this.parsedFunction(
			f.createFunctionDeclaration(
				ts.getModifiers(source)?.filter((x) => x.kind === ts.SyntaxKind.AsyncKeyword),
				undefined,
				unit.name,
				undefined,
				source.parameters,
				undefined,
				source.body ?? f.createBlock([]),
			),
			unit,
		);
	}

	private readonly thisParameters = new Map<string, Set<number>>();

	private readonly credentialParameters = new Map<string, Map<number, string>>();

	private markContextArguments(root: ts.Node, where: string): ts.Node {
		const visit = (input: ts.Node): ts.Node => {
			const n = ts.visitEachChild(input, visit, undefined);
			if (
				!ts.isCallExpression(n) ||
				!ts.isIdentifier(n.expression) ||
				n.expression.text.startsWith('__')
			)
				return n;
			const callee = n.expression.text;
			let touched = false;
			const next = n.arguments.map((argument, k) => {
				if (!ts.isIdentifier(argument)) return argument;
				if (argument.text === '__THIS') {
					const set = this.thisParameters.get(callee) ?? new Set<number>();
					if (!set.has(k) && this.output.some((o) => o.name === callee)) {
						this.error(
							where,
							`'${callee}' gets the n8n context as an argument after it was compiled without it`,
						);
					}
					set.add(k);
					this.thisParameters.set(callee, set);
				} else if (argument.text.startsWith(CREDENTIAL_PREFIX)) {
					const map = this.credentialParameters.get(callee) ?? new Map<number, string>();
					if (!map.has(k) && this.output.some((o) => o.name === callee)) {
						this.error(
							where,
							`'${callee}' gets a credential as an argument after it was compiled without it`,
						);
					}
					map.set(k, argument.text.slice(CREDENTIAL_PREFIX.length));
					this.credentialParameters.set(callee, map);
				} else return argument;
				touched = true;
				return f.createIdentifier('undefined');
			});
			return touched ? f.updateCallExpression(n, n.expression, undefined, next) : n;
		};
		return ts.visitNode(root, visit);
	}

	private withContextArguments(statement: ts.Statement, unit: Unit): ts.Statement {
		const asThis = this.thisParameters.get(unit.name);
		const asCredential = this.credentialParameters.get(unit.name);
		if (!ts.isFunctionDeclaration(statement) || !statement.body || (!asThis && !asCredential))
			return statement;
		const thisNames = new Set<string>();
		const constants: ts.Statement[] = [];
		const parameters = statement.parameters.map((p, k) => {
			if (!ts.isIdentifier(p.name)) return p;
			if (asThis?.has(k)) {
				thisNames.add(p.name.text);
				return f.createParameterDeclaration(undefined, undefined, `__t${k}`);
			}
			const type = asCredential?.get(k);
			if (type === undefined) return p;
			constants.push(
				f.createVariableStatement(
					undefined,
					f.createVariableDeclarationList(
						[
							f.createVariableDeclaration(
								p.name.text,
								undefined,
								undefined,
								f.createIdentifier(CREDENTIAL_PREFIX + type),
							),
						],
						ts.NodeFlags.Const,
					),
				),
			);
			return f.createParameterDeclaration(undefined, undefined, `__c${k}`);
		});
		const toThis = (n: ts.Node): ts.Node => {
			if (ts.isIdentifier(n) && thisNames.has(n.text) && isValueUse(n)) return f.createThis();
			return ts.visitEachChild(n, toThis, undefined);
		};
		const body =
			thisNames.size > 0 ? (ts.visitNode(statement.body, toThis) as ts.Block) : statement.body;
		return f.updateFunctionDeclaration(
			statement,
			statement.modifiers,
			statement.asteriskToken,
			statement.name,
			statement.typeParameters,
			parameters,
			statement.type,
			f.updateBlock(body, [...constants, ...body.statements]),
		);
	}

	private readonly instanceParameters = new Map<string, Map<number, string>>();

	private readonly plainParameters = new Map<string, Set<number>>();

	private readonly contextFields = new Map<string, Set<string>>();

	private readonly fieldReads = new Map<string, string>();

	private toSelf(root: ts.Node, where: string): ts.Node {
		const refuse = (what: string) => this.error(where, `${what} has no compiled form`);
		const usesThis = (n: ts.Node): boolean =>
			n.kind === ts.SyntaxKind.ThisKeyword || (ts.forEachChild(n, usesThis) ?? false);
		const visit = (n: ts.Node): ts.Node => {
			if (n.kind === ts.SyntaxKind.ThisKeyword) return f.createIdentifier(SELF);
			if (
				n.kind === ts.SyntaxKind.SuperKeyword ||
				ts.isMetaProperty(n) ||
				(ts.isIdentifier(n) && n.text === 'arguments' && isValueUse(n))
			)
				refuse('`super`, `new.target` or `arguments` in a class');
			if (ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n) || ts.isClassLike(n)) {
				if (usesThis(n)) refuse('`this` in a nested function of a class method');
				return n;
			}
			return ts.visitEachChild(n, visit, undefined);
		};
		return ts.visitNode(root, visit);
	}

	private parsedFunction(
		made: ts.FunctionDeclaration,
		unit: Unit,
	): { node: ts.FunctionDeclaration; sf: ts.SourceFile } {
		const parsed = this.reparse(made, unit.file.sf);
		return ts.isFunctionDeclaration(parsed.node)
			? { node: parsed.node, sf: parsed.sf }
			: { node: made, sf: unit.file.sf };
	}

	private lowerClass(source: ts.ClassDeclaration, unit: Unit) {
		const refuse = (what: string) => this.error(unit.name, `${what} has no compiled form`);
		if (source.heritageClauses?.length) refuse('a class that extends another class');
		const returns = (n: ts.Node): boolean =>
			ts.isReturnStatement(n) || (!ts.isFunctionLike(n) && (ts.forEachChild(n, returns) ?? false));
		const fields: ts.Statement[] = [];
		let parameters: readonly ts.ParameterDeclaration[] = [];
		let body: ts.Statement[] = [];
		for (const m of source.members) {
			if (ts.isSemicolonClassElement(m) || ts.isMethodDeclaration(m)) continue;
			if (ts.isConstructorDeclaration(m)) {
				parameters = m.parameters;
				if (m.body && returns(m.body)) refuse('a constructor with a `return`');
				body = (m.body?.statements ?? []).map((st) => this.toSelf(st, unit.name) as ts.Statement);
				continue;
			}
			if (!ts.isPropertyDeclaration(m)) {
				refuse('a class accessor or static block');
				continue;
			}
			if (ts.getModifiers(m)?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword)) continue;
			if (!ts.isIdentifier(m.name)) {
				refuse('a computed or private-name class field');
				continue;
			}
			fields.push(
				f.createExpressionStatement(
					f.createBinaryExpression(
						f.createPropertyAccessExpression(f.createIdentifier(SELF), m.name.text),
						ts.SyntaxKind.EqualsToken,
						m.initializer
							? (this.toSelf(m.initializer, unit.name) as ts.Expression)
							: f.createIdentifier('undefined'),
					),
				),
			);
		}
		return this.parsedFunction(
			f.createFunctionDeclaration(
				undefined,
				undefined,
				unit.name,
				undefined,
				parameters.map((p) => this.toSelf(p, unit.name) as ts.ParameterDeclaration),
				undefined,
				f.createBlock(
					[
						f.createVariableStatement(
							undefined,
							f.createVariableDeclarationList(
								[
									f.createVariableDeclaration(
										SELF,
										undefined,
										undefined,
										f.createObjectLiteralExpression(),
									),
								],
								ts.NodeFlags.Const,
							),
						),
						...fields,
						...body,
						f.createReturnStatement(f.createIdentifier(SELF)),
					],
					true,
				),
			),
			unit,
		);
	}

	private lowerMethod(source: ts.MethodDeclaration, unit: Unit) {
		if (source.asteriskToken) this.error(unit.name, 'a generator method has no compiled form');
		return this.parsedFunction(
			f.createFunctionDeclaration(
				ts.getModifiers(source)?.filter((x) => x.kind === ts.SyntaxKind.AsyncKeyword),
				undefined,
				unit.name,
				undefined,
				[
					f.createParameterDeclaration(undefined, undefined, SELF),
					...source.parameters.map((p) => this.toSelf(p, unit.name) as ts.ParameterDeclaration),
				],
				undefined,
				source.body ? (this.toSelf(source.body, unit.name) as ts.Block) : f.createBlock([]),
			),
			unit,
		);
	}

	private methodOf(cls: string, name: string): ts.MethodDeclaration | undefined {
		const source = this.units.get(cls)?.node;
		if (!source || !ts.isClassDeclaration(source)) return undefined;
		return source.members.find(
			(m): m is ts.MethodDeclaration =>
				ts.isMethodDeclaration(m) &&
				ts.isIdentifier(m.name) &&
				m.name.text === name &&
				!ts.getModifiers(m)?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword),
		);
	}

	private methodUnit(
		cls: string,
		name: string,
		where: string,
		asContext?: true,
	): string | undefined {
		const method = this.methodOf(cls, name);
		const owner = this.units.get(cls);
		if (!method || !owner) return undefined;
		const alias = `${cls}_${name}`;
		const known = this.units.get(alias);
		if (known) {
			if (known.node !== method) this.error(where, `two declarations have the name '${alias}'`);
			else if (known.isStatic !== asContext)
				this.error(
					where,
					`the method '${name}' of the class '${cls}' gets the object in one call and the n8n context in a different call`,
				);
			return alias;
		}
		const unit: Unit = {
			name: alias,
			node: method,
			file: owner.file,
			withContext: true,
			...(asContext ? { isStatic: true } : { self: cls }),
		};
		this.units.set(alias, unit);
		this.queue.push(unit);
		return alias;
	}

	private withContextFields(statement: ts.Statement, unit: Unit): ts.Statement {
		const source = unit.node;
		const cls = ts.isClassDeclaration(source) ? unit.name : unit.self;
		if (cls === undefined || !ts.isFunctionDeclaration(statement) || !statement.body)
			return statement;
		const isSelf = (n: ts.Node): boolean => ts.isIdentifier(n) && n.text === SELF;
		const fieldOf = (n: ts.Node): string | undefined =>
			ts.isPropertyAccessExpression(n) && isSelf(n.expression) ? n.name.text : undefined;
		let statements = [...statement.body.statements];
		if (ts.isClassDeclaration(source)) {
			const assignment = (st: ts.Statement): ts.BinaryExpression | undefined =>
				ts.isExpressionStatement(st) &&
				ts.isBinaryExpression(st.expression) &&
				st.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
				fieldOf(st.expression.left) !== undefined
					? st.expression
					: undefined;
			const stored = (st: ts.Statement): string | undefined => {
				const a = assignment(st);
				return a && a.right.kind === ts.SyntaxKind.ThisKeyword ? fieldOf(a.left) : undefined;
			};
			const found = new Set<string>();
			let last = -1;
			statements.forEach((st, k) => {
				const name = stored(st);
				if (name === undefined) return;
				found.add(name);
				last = k;
			});
			const mentionsSelf = (n: ts.Node): boolean =>
				isSelf(n) || (ts.forEachChild(n, mentionsSelf) ?? false);
			const quiet = statements.slice(0, Math.max(last, 0)).every((st, k) => {
				const a = assignment(st);
				return k === 0 || !mentionsSelf(a ? a.right : st);
			});
			if (!quiet)
				this.error(unit.name, 'the constructor uses the object before it stores the n8n context');
			const names = bindingsOf(statement);
			const constructor = source.members.find(ts.isConstructorDeclaration);
			for (const k of this.thisParameters.get(unit.name) ?? []) {
				const p = constructor?.parameters[k];
				if (p && ts.isIdentifier(p.name) && names.has(p.name.text))
					this.error(
						unit.name,
						`the class binds the name '${p.name.text}' again, and the name holds the n8n context`,
					);
			}
			statements = statements.filter((st, k) => {
				const a = k <= last ? assignment(st) : undefined;
				const name = a ? fieldOf(a.left) : undefined;
				const cleared = !!a && ts.isIdentifier(a.right) && a.right.text === 'undefined';
				return !(name !== undefined && found.has(name) && (cleared || stored(st) !== undefined));
			});
			this.contextFields.set(cls, found);
		}
		const fields = this.contextFields.get(cls);
		if (!fields) {
			this.error(unit.name, `the compiler reached a method before its class '${cls}'`);
			return statement;
		}
		if (fields.size === 0) return statement;
		const toContext = (n: ts.Node): ts.Node => {
			const written =
				ts.isBinaryExpression(n) &&
				n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
				n.operatorToken.kind <= ts.SyntaxKind.LastAssignment
					? fieldOf(n.left)
					: ts.isDeleteExpression(n)
						? fieldOf(n.expression)
						: undefined;
			if (written !== undefined && fields.has(written))
				this.error(unit.name, `the class writes the field '${written}' that holds the n8n context`);
			const name = fieldOf(n);
			if (name !== undefined && fields.has(name)) return f.createThis();
			return ts.visitEachChild(n, toContext, undefined);
		};
		return f.updateFunctionDeclaration(
			statement,
			statement.modifiers,
			statement.asteriskToken,
			statement.name,
			statement.typeParameters,
			statement.parameters,
			statement.type,
			f.updateBlock(
				statement.body,
				statements.map((st) => ts.visitNode(st, toContext) as ts.Statement),
			),
		);
	}

	private readonly fieldShapes = new Map<string, Map<string, FieldShape>>();

	private readonly givenKeys = new Map<string, Map<number, string | undefined>>();

	private shapesOf(cls: string): Map<string, FieldShape> {
		const known = this.fieldShapes.get(cls);
		if (known) return known;
		const shapes = new Map<string, FieldShape>();
		this.fieldShapes.set(cls, shapes);
		const owner = this.units.get(cls);
		if (!owner || !ts.isClassDeclaration(owner.node)) return shapes;
		const made = (e: ts.Expression): string | undefined => {
			if (!ts.isNewExpression(e) || !ts.isIdentifier(e.expression)) return undefined;
			const found = this.member(owner.file, e.expression.text)?.node;
			return found && ts.isClassDeclaration(found) ? e.expression.text : undefined;
		};
		const shapeOf = (e: ts.Expression): FieldShape | undefined => {
			const direct = made(e);
			if (direct !== undefined) return { cls: direct };
			if (!ts.isObjectLiteralExpression(e) || e.properties.length === 0) return undefined;
			const table = new Map<string, string>();
			for (const p of e.properties) {
				if (!ts.isPropertyAssignment(p)) return undefined;
				const key = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : undefined;
				const member = made(p.initializer);
				if (key === undefined || key === '__proto__' || member === undefined || table.has(key))
					return undefined;
				table.set(key, member);
			}
			return { table };
		};
		const stores = new Map<string, number>();
		const note = (field: string, value: ts.Expression) => {
			const shape = shapeOf(value);
			if (!shape) return;
			stores.set(field, (stores.get(field) ?? 0) + 1);
			shapes.set(field, shape);
		};
		for (const m of owner.node.members) {
			if (
				ts.isPropertyDeclaration(m) &&
				ts.isIdentifier(m.name) &&
				m.initializer &&
				!ts.getModifiers(m)?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword)
			)
				note(m.name.text, m.initializer);
			if (!ts.isConstructorDeclaration(m)) continue;
			for (const st of m.body?.statements ?? []) {
				if (
					ts.isExpressionStatement(st) &&
					ts.isBinaryExpression(st.expression) &&
					st.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
					ts.isPropertyAccessExpression(st.expression.left) &&
					st.expression.left.expression.kind === ts.SyntaxKind.ThisKeyword
				)
					note(st.expression.left.name.text, st.expression.right);
			}
		}
		for (const [field, count] of stores) if (count !== 1) shapes.delete(field);
		for (const shape of shapes.values()) {
			for (const member of 'cls' in shape ? [shape.cls] : shape.table.values())
				if (!this.units.has(member)) this.need(member, owner.file, false, cls);
		}
		return shapes;
	}

	private resolveInstances(root: ts.Node, unit: Unit): ts.Node {
		const bound = bindingsOf(root);
		const classNamed = (name: string): boolean => {
			if (bound.has(name)) return false;
			const found = this.units.get(name)?.node ?? this.member(unit.file, name)?.node;
			return !!found && ts.isClassDeclaration(found);
		};
		const instances = new Map<string, string>();
		const own = ts.isClassDeclaration(unit.node) ? unit.name : unit.self;
		if (own !== undefined) instances.set(SELF, own);
		const given = this.instanceParameters.get(unit.name);
		if (!ts.isFunctionDeclaration(root)) {
			if (given)
				this.error(
					unit.name,
					'a value that is not a function declaration gets an object of a class',
				);
		} else {
			for (const [k, cls] of given ?? []) {
				const p = root.parameters[k];
				if (!p) continue;
				if (ts.isIdentifier(p.name) && !p.dotDotDotToken) instances.set(p.name.text, cls);
				else this.error(unit.name, 'a parameter that gets an object of a class is not a name');
			}
		}
		const scan = (n: ts.Node) => {
			if (
				ts.isVariableDeclaration(n) &&
				ts.isIdentifier(n.name) &&
				n.initializer &&
				ts.isCallExpression(n.initializer) &&
				ts.isIdentifier(n.initializer.expression) &&
				classNamed(n.initializer.expression.text) &&
				(n.parent.flags & ts.NodeFlags.Const) !== 0
			) {
				const cls = n.initializer.expression.text;
				instances.set(n.name.text, cls);
				if (!this.units.has(cls)) this.need(cls, unit.file, false, unit.name);
			}
			ts.forEachChild(n, scan);
		};
		scan(root);
		for (const name of instances.keys()) {
			if (bound.get(name) !== 1)
				this.error(
					unit.name,
					`the name '${name}' holds an object of a class and has more than one binding`,
				);
		}

		const tableOf = (e: ts.Expression): Map<string, string> | undefined => {
			if (!ts.isPropertyAccessExpression(e)) return undefined;
			const owner = classOf(e.expression);
			const shape = owner === undefined ? undefined : this.shapesOf(owner).get(e.name.text);
			return shape && 'table' in shape ? shape.table : undefined;
		};
		const classOf = (e: ts.Expression): string | undefined => {
			if (ts.isIdentifier(e)) return instances.get(e.text);
			if (ts.isPropertyAccessExpression(e)) {
				const owner = classOf(e.expression);
				if (owner !== undefined) {
					const shape = this.shapesOf(owner).get(e.name.text);
					return shape && 'cls' in shape ? shape.cls : undefined;
				}
				return tableOf(e.expression)?.get(e.name.text);
			}
			if (ts.isElementAccessExpression(e) && ts.isStringLiteral(e.argumentExpression))
				return tableOf(e.expression)?.get(e.argumentExpression.text);
			return undefined;
		};
		const sanctioned = new Set<ts.Node>();
		if (own !== undefined && ts.isClassDeclaration(unit.node) && ts.isFunctionDeclaration(root)) {
			const shapes = this.shapesOf(own);
			const mentionsSelf = (n: ts.Node): boolean =>
				(ts.isIdentifier(n) && n.text === SELF) || (ts.forEachChild(n, mentionsSelf) ?? false);
			const made = (e: ts.Expression): string | undefined =>
				ts.isCallExpression(e) && ts.isIdentifier(e.expression) && classNamed(e.expression.text)
					? e.expression.text
					: undefined;
			const stores = (value: ts.Expression, shape: FieldShape): ts.Expression[] | undefined => {
				if ('cls' in shape) return made(value) === shape.cls ? [value] : undefined;
				if (!ts.isObjectLiteralExpression(value)) return undefined;
				if (value.properties.length !== shape.table.size) return undefined;
				const members: ts.Expression[] = [];
				for (const p of value.properties) {
					if (!ts.isPropertyAssignment(p)) return undefined;
					const key = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : '';
					if (shape.table.get(key) !== made(p.initializer)) return undefined;
					members.push(p.initializer);
				}
				return members;
			};
			const fieldStore = (st: ts.Statement): ts.BinaryExpression | undefined =>
				ts.isExpressionStatement(st) &&
				ts.isBinaryExpression(st.expression) &&
				st.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
				ts.isPropertyAccessExpression(st.expression.left) &&
				ts.isIdentifier(st.expression.left.expression) &&
				st.expression.left.expression.text === SELF
					? st.expression
					: undefined;
			const statements = root.body?.statements ?? [];
			const stored = new Set<string>();
			let last = -1;
			statements.forEach((st, k) => {
				const store = fieldStore(st);
				if (!store || !ts.isPropertyAccessExpression(store.left)) return;
				const field = store.left.name.text;
				const shape = shapes.get(field);
				if (!shape || stored.has(field)) return;
				if (ts.isIdentifier(store.right) && store.right.text === 'undefined') {
					sanctioned.add(store.left);
					return;
				}
				const members = stores(store.right, shape);
				if (!members) return;
				stored.add(field);
				sanctioned.add(store.left);
				for (const member of members) sanctioned.add(member);
				last = k;
			});
			for (const field of shapes.keys()) {
				if (!stored.has(field))
					this.error(
						unit.name,
						`the constructor does not store the object of the field '${field}' in a plain statement`,
					);
			}
			const quiet = statements.slice(1, last + 1).every((st) => {
				const store = fieldStore(st);
				return !!store && !mentionsSelf(store.right);
			});
			if (!quiet)
				this.error(
					unit.name,
					'the constructor uses the object before it stores the objects of its fields',
				);
		}
		const expected = (key: ts.Identifier): string | undefined => {
			if (!ts.isFunctionDeclaration(root) || bound.get(key.text) !== 1) return undefined;
			const at = root.parameters.findIndex(
				(p) => ts.isIdentifier(p.name) && p.name.text === key.text && !p.dotDotDotToken,
			);
			return at < 0 ? undefined : this.givenKeys.get(unit.name)?.get(at);
		};
		const pass = (callee: string, given: readonly ts.Expression[]): ts.Expression[] =>
			given.map((argument, k) => {
				const keys = this.givenKeys.get(callee) ?? new Map<number, string | undefined>();
				const text = ts.isStringLiteral(argument) ? argument.text : undefined;
				keys.set(k, keys.has(k) && keys.get(k) !== text ? undefined : text);
				this.givenKeys.set(callee, keys);
				const cls = classOf(argument);
				const objects = this.instanceParameters.get(callee) ?? new Map<number, string>();
				const plain = this.plainParameters.get(callee) ?? new Set<number>();
				if (cls === undefined) {
					if (objects.has(k))
						this.error(
							unit.name,
							`'${callee}' gets an object of a class and a different value in one parameter`,
						);
					plain.add(k);
					this.plainParameters.set(callee, plain);
					return ts.visitNode(argument, visit) as ts.Expression;
				}
				const known = objects.get(k);
				if (
					known === undefined &&
					(callee === unit.name || this.output.some((o) => o.name === callee))
				)
					this.error(
						unit.name,
						`'${callee}' gets an object of a class as an argument after it was compiled without it`,
					);
				if (plain.has(k) || (known !== undefined && known !== cls))
					this.error(
						unit.name,
						`'${callee}' gets an object of a class and a different value in one parameter`,
					);
				objects.set(k, cls);
				this.instanceParameters.set(callee, objects);
				return argument;
			});
		const visit = (n: ts.Node): ts.Node => {
			if (ts.isCallExpression(n)) {
				const target = n.expression;
				const borrowed =
					ts.isIdentifier(target) && target.text === '__CTXCALL' ? n.arguments[0] : undefined;
				const lender =
					borrowed && ts.isPropertyAccessExpression(borrowed)
						? classOf(borrowed.expression)
						: undefined;
				if (lender !== undefined && borrowed && ts.isPropertyAccessExpression(borrowed)) {
					const method = this.methodUnit(lender, borrowed.name.text, unit.name, true);
					if (method !== undefined) return call(method, ...pass(method, n.arguments.slice(1)));
				}
				const receiver = ts.isPropertyAccessExpression(target) ? target.expression : undefined;
				const cls = receiver ? classOf(receiver) : undefined;
				const picked =
					receiver && ts.isElementAccessExpression(receiver)
						? tableOf(receiver.expression)
						: undefined;
				if (
					picked &&
					receiver &&
					cls === undefined &&
					ts.isElementAccessExpression(receiver) &&
					ts.isPropertyAccessExpression(target)
				) {
					const key = receiver.argumentExpression;
					if (!ts.isIdentifier(key) || instances.has(key.text)) {
						this.error(unit.name, 'an object is picked from a table by a key that is not a name');
						return n;
					}
					let chain: ts.Expression = call(NO_DISPATCH);
					const only = expected(key);
					for (const [name, member] of [...picked].reverse()) {
						if (only !== undefined && only !== name) continue;
						const method = this.methodUnit(member, target.name.text, unit.name);
						if (method === undefined) continue;
						const object = /^[A-Za-z_$][\w$]*$/.test(name)
							? f.createPropertyAccessExpression(receiver.expression, name)
							: f.createElementAccessExpression(receiver.expression, f.createStringLiteral(name));
						chain = f.createConditionalExpression(
							f.createStrictEquality(key, f.createStringLiteral(name)),
							undefined,
							call(method, ...pass(method, [object, ...n.arguments])),
							undefined,
							chain,
						);
					}
					return f.createParenthesizedExpression(chain);
				}
				if (receiver && cls !== undefined && ts.isPropertyAccessExpression(target)) {
					const method = this.methodUnit(cls, target.name.text, unit.name);
					if (method !== undefined)
						return call(method, ...pass(method, [receiver, ...n.arguments]));
					this.error(unit.name, `'${target.name.text}' is not a method of the class '${cls}'`);
					return n;
				}
				if (
					ts.isIdentifier(target) &&
					!target.text.startsWith('__') &&
					!bound.has(target.text) &&
					!GLOBALS.has(target.text)
				) {
					const made = n.parent;
					if (
						classNamed(target.text) &&
						!sanctioned.has(n) &&
						!(
							ts.isVariableDeclaration(made) &&
							ts.isIdentifier(made.name) &&
							instances.get(made.name.text) === target.text
						)
					)
						this.error(
							unit.name,
							`an object of the class '${target.text}' is made outside a \`const\` declaration`,
						);
					return f.updateCallExpression(n, target, undefined, pass(target.text, n.arguments));
				}
			}
			if (ts.isPropertyAccessExpression(n)) {
				const cls = classOf(n.expression);
				if (cls !== undefined) {
					if (this.methodOf(cls, n.name.text))
						this.error(
							unit.name,
							`the method '${n.name.text}' of the class '${cls}' is used as a value`,
						);
					if (this.shapesOf(cls).has(n.name.text) && !sanctioned.has(n))
						this.error(
							unit.name,
							`the field '${n.name.text}' of the class '${cls}' holds an object of a class and is used as a value`,
						);
					const key = `${cls}.${n.name.text}`;
					if (!this.fieldReads.has(key)) this.fieldReads.set(key, unit.name);
					return n;
				}
			}
			if (ts.isIdentifier(n) && isValueUse(n)) {
				const cls = instances.get(n.text);
				const result =
					n.text === SELF && ts.isClassDeclaration(unit.node) && ts.isReturnStatement(n.parent);
				if (cls !== undefined && !result)
					this.error(unit.name, `an object of the class '${cls}' is used as a whole value`);
				if (classNamed(n.text)) this.error(unit.name, `the class '${n.text}' is used as a value`);
			}
			return ts.visitEachChild(n, visit, undefined);
		};
		return ts.visitNode(root, visit);
	}

	private withoutIdleTry(root: ts.Node): ts.Node {
		const variables = new Set<string>();
		const collect = (n: ts.Node) => {
			if (ts.isVariableDeclarationList(n) && (n.flags & ts.NodeFlags.Const) === 0) {
				for (const d of n.declarations) if (ts.isIdentifier(d.name)) variables.add(d.name.text);
			}
			ts.forEachChild(n, collect);
		};
		collect(root);
		const constant = (e: ts.Expression): boolean =>
			ts.isStringLiteral(e) ||
			ts.isNumericLiteral(e) ||
			e.kind === ts.SyntaxKind.TrueKeyword ||
			e.kind === ts.SyntaxKind.FalseKeyword ||
			e.kind === ts.SyntaxKind.NullKeyword;
		const idle = (st: ts.Statement): boolean =>
			ts.isExpressionStatement(st) &&
			ts.isBinaryExpression(st.expression) &&
			st.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
			ts.isIdentifier(st.expression.left) &&
			variables.has(st.expression.left.text) &&
			bindingsOf(root).get(st.expression.left.text) === 1 &&
			constant(st.expression.right);
		const visit = (input: ts.Node): ts.Node => {
			const n = ts.visitEachChild(input, visit, undefined);
			if (!ts.isTryStatement(n) || n.finallyBlock || !n.tryBlock.statements.every(idle)) return n;
			return n.tryBlock;
		};
		return ts.visitNode(root, visit);
	}

	private trimArguments() {
		const limits = new Map<string, number>();
		for (const { name, node } of this.output) {
			if (!ts.isFunctionDeclaration(node) || !node.body) continue;
			const open = (n: ts.Node): boolean =>
				(ts.isIdentifier(n) && n.text === 'arguments') || (ts.forEachChild(n, open) ?? false);
			if (!node.parameters.some((p) => p.dotDotDotToken) && !open(node.body))
				limits.set(name, node.parameters.length);
		}
		const inert = (e: ts.Expression): boolean =>
			ts.isIdentifier(e) ||
			ts.isStringLiteral(e) ||
			ts.isNumericLiteral(e) ||
			e.kind === ts.SyntaxKind.TrueKeyword ||
			e.kind === ts.SyntaxKind.FalseKeyword ||
			e.kind === ts.SyntaxKind.NullKeyword;
		const wider = new Map<string, number>();
		for (const entry of this.output) {
			const visit = (input: ts.Node): ts.Node => {
				const n = ts.visitEachChild(input, visit, undefined);
				if (!ts.isCallExpression(n) || !ts.isIdentifier(n.expression)) return n;
				const limit = limits.get(n.expression.text);
				if (limit === undefined || n.arguments.length <= limit) return n;
				if (!n.arguments.slice(limit).every(inert)) {
					if (!n.arguments.some(ts.isSpreadElement))
						wider.set(
							n.expression.text,
							Math.max(wider.get(n.expression.text) ?? 0, n.arguments.length),
						);
					return n;
				}
				return f.updateCallExpression(n, n.expression, undefined, n.arguments.slice(0, limit));
			};
			const next = this.reparse(ts.visitNode(entry.node, visit), entry.sf);
			entry.node = next.node;
			entry.sf = next.sf;
		}
		for (const entry of this.output) {
			const count = wider.get(entry.name);
			const node = entry.node;
			if (count === undefined || !ts.isFunctionDeclaration(node)) continue;
			const unused = Array.from({ length: count - node.parameters.length }, (_, k) =>
				f.createParameterDeclaration(undefined, undefined, `__unused${k}`),
			);
			const next = this.reparse(
				f.updateFunctionDeclaration(
					node,
					node.modifiers,
					node.asteriskToken,
					node.name,
					node.typeParameters,
					[...node.parameters, ...unused],
					node.type,
					node.body,
				),
				entry.sf,
			);
			entry.node = next.node;
			entry.sf = next.sf;
		}
	}

	private checkInstances() {
		for (const [key, where] of this.fieldReads) {
			const at = key.indexOf('.');
			if (this.contextFields.get(key.slice(0, at))?.has(key.slice(at + 1)))
				this.error(
					where,
					`code outside the class '${key.slice(0, at)}' reads the field '${key.slice(at + 1)}', and the field holds the n8n context`,
				);
		}
	}

	private process(unit: Unit, isExecute: boolean) {
		const source = unit.node;
		const lowered = ts.isClassDeclaration(source)
			? this.lowerClass(source, unit)
			: ts.isMethodDeclaration(source) && unit.self !== undefined
				? this.lowerMethod(source, unit)
				: ts.isMethodDeclaration(source) && unit.isStatic
					? this.lowerStatic(source, unit)
					: undefined;
		const statement = lowered
			? lowered.node
			: ts.isClassDeclaration(source)
				? f.createEmptyStatement()
				: ts.isMethodDeclaration(source)
					? f.createFunctionDeclaration(
							[f.createModifier(ts.SyntaxKind.AsyncKeyword)],
							undefined,
							unit.name,
							undefined,
							unit.credentialType === undefined ? [] : source.parameters.slice(1),
							undefined,
							unit.credentialType === undefined || !source.body
								? source.body
								: f.updateBlock(source.body, [
										f.createVariableStatement(
											undefined,
											f.createVariableDeclarationList(
												[
													f.createVariableDeclaration(
														source.parameters[0]?.name.getText(unit.file.sf) ?? 'credentials',
														undefined,
														undefined,
														f.createIdentifier(CREDENTIAL_PREFIX + unit.credentialType),
													),
												],
												ts.NodeFlags.Const,
											),
										),
										...source.body.statements,
									]),
						)
					: ts.isVariableDeclaration(source)
						? f.createVariableStatement(
								undefined,
								f.createVariableDeclarationList(
									[
										f.updateVariableDeclaration(
											source,
											f.createIdentifier(unit.name),
											source.exclamationToken,
											source.type,
											source.initializer,
										),
									],
									ts.NodeFlags.Const,
								),
							)
						: f.updateFunctionDeclaration(
								source,
								source.modifiers,
								source.asteriskToken,
								f.createIdentifier(unit.name),
								source.typeParameters,
								source.parameters,
								source.type,
								source.body,
							);
		let cur = this.reparse(
			this.withContextFields(this.withContextArguments(statement, unit), unit),
			lowered?.sf ?? unit.file.sf,
		);
		cur = this.reparse(this.bind(cur.node, unit, isExecute), cur.sf);
		cur = this.reparse(this.withoutIdleTry(cur.node), cur.sf);
		cur = this.fold(cur, unit.name);
		cur = this.renew(cur, this.resolveChains(cur.node, unit));
		cur = this.renew(cur, this.resolveInstances(cur.node, unit));
		cur = this.renew(cur, this.markContextArguments(cur.node, unit.name));
		const node = cur.node;
		this.check(node, unit.name);
		const bound = bindingsOf(node);
		const free = new Set<string>();
		const find = (n: ts.Node) => {
			if (
				ts.isIdentifier(n) &&
				isValueUse(n) &&
				!bound.has(n.text) &&
				!GLOBALS.has(n.text) &&
				!n.text.startsWith('__') &&
				!(n.text === 'DateTime' && isLuxon(unit.file.imports.get(n.text)))
			) {
				free.add(n.text);
			}
			ts.forEachChild(n, find);
		};
		find(node);
		free.delete(unit.name);
		for (const name of free) {
			if (!this.units.has(name))
				this.need(name, unit.file, this.contextCallees.has(name), unit.name);
		}
		this.output.push({ name: unit.name, node, sf: cur.sf });
	}

	private optimise() {
		for (let round = 0; round < 6; round++) {
			const specialised = this.specialiseParameters();
			const folded = this.foldPureCalls();
			const inlined = this.inlineCalls();
			const returned = this.inlineCredentialResults();
			if (!specialised && !folded && !inlined && !returned) break;
		}
		const reached = new Set<string>(['execute']);
		for (let k = 0; k < this.output.length + 1; k++) {
			const before = reached.size;
			for (const { name, node } of this.output) {
				if (!reached.has(name)) continue;
				const walk = (n: ts.Node) => {
					if (ts.isIdentifier(n) && this.units.has(n.text)) reached.add(n.text);
					ts.forEachChild(n, walk);
				};
				walk(node);
			}
			if (reached.size === before) break;
		}
		for (let k = this.output.length - 1; k >= 0; k--) {
			if (!reached.has(this.output[k].name)) this.output.splice(k, 1);
		}
		for (const { name, node } of this.output) {
			const open = (n: ts.Node): boolean =>
				(ts.isIdentifier(n) && n.text === NO_DISPATCH) || (ts.forEachChild(n, open) ?? false);
			if (open(node))
				this.error(
					name,
					'an object is picked from a table by a key that is not a constant, or the object has no such method',
				);
			const walk = (n: ts.Node): boolean =>
				isWholeCredential(n) || (ts.forEachChild(n, walk) ?? false);
			if (walk(node)) {
				this.error(
					name,
					'the credential is used as a whole value: only its fields can go into a request',
				);
			}
		}
	}

	private inlineCredentialResults(): boolean {
		const results = new Map<string, string>();
		for (const { name, node } of this.output) {
			if (!ts.isFunctionDeclaration(node) || !node.body || name === 'execute') continue;
			let only: ts.Statement | undefined = node.body;
			while (only && ts.isBlock(only))
				only = only.statements.length === 1 ? only.statements[0] : undefined;
			if (
				only &&
				ts.isReturnStatement(only) &&
				only.expression &&
				isWholeCredential(only.expression)
			)
				results.set(name, only.expression.text);
		}
		if (results.size === 0) return false;
		let changed = false;
		for (const entry of this.output) {
			if (results.has(entry.name)) continue;
			let touched = false;
			const visit = (input: ts.Node): ts.Node => {
				const n = ts.visitEachChild(input, visit, undefined);
				if (ts.isAwaitExpression(n) && isWholeCredential(n.expression)) return n.expression;
				if (!ts.isCallExpression(n) || !ts.isIdentifier(n.expression)) return n;
				const result = results.get(n.expression.text);
				if (result === undefined || !n.arguments.every((a) => ts.isIdentifier(a) || literalOf(a)))
					return n;
				touched = true;
				return f.createIdentifier(result);
			};
			const next = ts.visitNode(entry.node, visit);
			if (touched) {
				changed = true;
				this.refold(entry, next);
			}
		}
		return changed;
	}

	private inlineCount = 0;

	private inlineCalls(): boolean {
		const sites = new Map<string, number>();
		for (const { node } of this.output) {
			const walk = (n: ts.Node) => {
				if (ts.isIdentifier(n) && this.units.has(n.text) && isValueUse(n)) {
					const p = n.parent;
					const called = ts.isCallExpression(p) && p.expression === n;
					if (!ts.isFunctionDeclaration(p))
						sites.set(n.text, (sites.get(n.text) ?? 0) + (called ? 1 : 2));
				}
				ts.forEachChild(n, walk);
			};
			walk(node);
		}
		const simple = (
			callee: ts.FunctionDeclaration,
			name: string,
			callerBound: Map<string, number>,
		): boolean => {
			if (
				callee.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ||
				callee.asteriskToken
			)
				return false;
			if (!callee.parameters.every((p) => ts.isIdentifier(p.name) && !p.dotDotDotToken))
				return false;
			const bound = bindingsOf(callee);
			let ok = true;
			const walk = (n: ts.Node, inner: boolean) => {
				if (ts.isReturnStatement(n) && !inner) ok = false;
				if (n.kind === ts.SyntaxKind.ThisKeyword || ts.isAwaitExpression(n)) ok = false;
				if (ts.isIdentifier(n) && isValueUse(n)) {
					if (n.text === 'arguments' || n.text === name) ok = false;
					if (!bound.has(n.text) && callerBound.has(n.text)) ok = false;
				}
				if (ok) ts.forEachChild(n, (c) => walk(c, inner || ts.isFunctionLike(c)));
			};
			if (callee.body) walk(callee.body, false);
			return ok;
		};
		let changed = false;
		for (const entry of this.output) {
			for (let round = 0; round < 32; round++) {
				const text = this.printer.printNode(ts.EmitHint.Unspecified, entry.node, entry.sf);
				const sf = ts.createSourceFile(
					'unit.js',
					text,
					ts.ScriptTarget.ES2022,
					true,
					ts.ScriptKind.JS,
				);
				const caller = sf.statements[0];
				if (!caller || !ts.isFunctionDeclaration(caller)) break;
				const callerBound = bindingsOf(caller);
				let replacement: { pos: number; end: number; text: string } | undefined;
				const find = (n: ts.Node) => {
					if (replacement) return;
					if (
						ts.isExpressionStatement(n) &&
						ts.isCallExpression(n.expression) &&
						ts.isIdentifier(n.expression.expression)
					) {
						const name = n.expression.expression.text;
						const unit = this.output.find((o) => o.name === name);
						const callee = unit?.node;
						const args = n.expression.arguments;
						if (
							unit &&
							callee &&
							ts.isFunctionDeclaration(callee) &&
							callee.body &&
							name !== entry.name &&
							sites.get(name) === 1 &&
							args.length <= callee.parameters.length &&
							simple(callee, name, callerBound)
						) {
							const k = this.inlineCount++;
							const print = (x: ts.Node) =>
								this.printer.printNode(ts.EmitHint.Unspecified, x, unit.sf);
							const written = new Set<string>();
							const noteWrites = (x: ts.Node) => {
								if (
									ts.isBinaryExpression(x) &&
									x.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
									x.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
									ts.isIdentifier(x.left)
								) {
									written.add(x.left.text);
								}
								if (
									(ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) &&
									ts.isIdentifier(x.operand)
								)
									written.add(x.operand.text);
								ts.forEachChild(x, noteWrites);
							};
							noteWrites(callee.body);
							const locals = bindingsOf(callee);
							const fresh = (id: string) => `${id}_${k}`;
							const rename = (x: ts.Node): ts.Node => {
								if (ts.isShorthandPropertyAssignment(x) && locals.has(x.name.text)) {
									return f.createPropertyAssignment(
										x.name.text,
										f.createIdentifier(fresh(x.name.text)),
									);
								}
								if (ts.isIdentifier(x) && locals.has(x.text)) {
									const parent = x.parent;
									const declared =
										parent &&
										(ts.isVariableDeclaration(parent) ||
											ts.isParameter(parent) ||
											ts.isBindingElement(parent) ||
											ts.isFunctionDeclaration(parent)) &&
										parent.name === x;
									if (declared || isValueUse(x)) return f.createIdentifier(fresh(x.text));
								}
								return ts.visitEachChild(x, rename, undefined);
							};
							const inner = callee.parameters.map((param, i) => {
								const id = ts.isIdentifier(param.name)
									? fresh(param.name.text)
									: `__unused${k}_${i}`;
								const given = args[i] ? args[i].getText(sf) : 'undefined';
								const value = param.initializer
									? `((v) => v === undefined ? ${print(ts.visitNode(param.initializer, rename))} : v)(${given})`
									: given;
								return `${written.has(ts.isIdentifier(param.name) ? param.name.text : '') ? 'let' : 'const'} ${id} = ${value};`;
							});
							const body = callee.body.statements.map((st) => print(ts.visitNode(st, rename)));
							replacement = {
								pos: n.getStart(sf),
								end: n.getEnd(),
								text: `{ ${inner.join(' ')}\n${body.join('\n')} }`,
							};
							return;
						}
					}
					ts.forEachChild(n, find);
				};
				find(caller);
				if (!replacement) break;
				changed = true;
				const next =
					text.slice(0, replacement.pos) + replacement.text + text.slice(replacement.end);
				const parsed = ts.createSourceFile(
					'unit.js',
					next,
					ts.ScriptTarget.ES2022,
					true,
					ts.ScriptKind.JS,
				);
				const cur = this.fold({ node: parsed.statements[0], sf: parsed }, entry.name);
				entry.node = cur.node;
				entry.sf = cur.sf;
			}
		}
		return changed;
	}

	private refold(entry: { name: string; node: ts.Node; sf: ts.SourceFile }, node: ts.Node) {
		const cur = this.fold(this.reparse(node, entry.sf), entry.name);
		entry.node = cur.node;
		entry.sf = cur.sf;
	}

	private specialiseParameters(): boolean {
		const sites = new Map<string, ts.CallExpression[]>();
		const escaped = new Set<string>();
		for (const { node } of this.output) {
			const walk = (n: ts.Node) => {
				if (ts.isIdentifier(n) && this.units.has(n.text) && isValueUse(n)) {
					const p = n.parent;
					if (ts.isCallExpression(p) && p.expression === n)
						sites.set(n.text, [...(sites.get(n.text) ?? []), p]);
					else if (!ts.isFunctionDeclaration(p)) escaped.add(n.text);
				}
				ts.forEachChild(n, walk);
			};
			walk(node);
		}
		let changed = false;
		for (const entry of this.output) {
			const fn = entry.node;
			const calls = sites.get(entry.name);
			if (
				!ts.isFunctionDeclaration(fn) ||
				!fn.body ||
				!calls ||
				escaped.has(entry.name) ||
				entry.name === 'execute'
			)
				continue;
			const written = new Set<string>();
			const noteWrites = (n: ts.Node) => {
				if (
					ts.isBinaryExpression(n) &&
					n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
					n.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
					ts.isIdentifier(n.left)
				) {
					written.add(n.left.text);
				}
				if (
					(ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) &&
					ts.isIdentifier(n.operand)
				)
					written.add(n.operand.text);
				ts.forEachChild(n, noteWrites);
			};
			noteWrites(fn.body);
			for (const name of patternTargets(fn.body)) written.add(name);
			const constants: ts.Statement[] = [];
			const parameters = fn.parameters.map((p, k) => {
				if (
					!ts.isIdentifier(p.name) ||
					p.dotDotDotToken ||
					p.name.text.startsWith('__p') ||
					written.has(p.name.text)
				)
					return p;
				const given = calls.map((c) => c.arguments[k]);
				const values = given.map((a) => (a === undefined ? { value: undefined } : literalOf(a)));
				const first = values[0];
				if (!first || !values.every((v) => v !== undefined && v.value === first.value)) return p;
				const value =
					first.value === undefined && p.initializer ? p.initializer : expressionOf(first.value);
				constants.push(
					f.createVariableStatement(
						undefined,
						f.createVariableDeclarationList(
							[f.createVariableDeclaration(p.name.text, undefined, undefined, value)],
							ts.NodeFlags.Const,
						),
					),
				);
				return f.createParameterDeclaration(undefined, undefined, `__p${k}`);
			});
			if (constants.length === 0) continue;
			changed = true;
			this.refold(
				entry,
				f.updateFunctionDeclaration(
					fn,
					fn.modifiers,
					fn.asteriskToken,
					fn.name,
					fn.typeParameters,
					parameters,
					fn.type,
					f.updateBlock(fn.body, [...constants, ...fn.body.statements]),
				),
			);
		}
		return changed;
	}

	private foldPureCalls(): boolean {
		const evaluate = this.input.evaluate;
		if (!evaluate) return false;
		const pure = new Set<string>();
		const isPure = (name: string, fn: ts.FunctionDeclaration): boolean => {
			if (fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) || fn.asteriskToken)
				return false;
			const bound = bindingsOf(fn);
			let ok = true;
			const walk = (n: ts.Node) => {
				if (
					n.kind === ts.SyntaxKind.ThisKeyword ||
					ts.isAwaitExpression(n) ||
					ts.isNewExpression(n)
				)
					ok = false;
				if (
					ts.isPropertyAccessExpression(n) &&
					ts.isIdentifier(n.expression) &&
					n.expression.text === 'Math' &&
					n.name.text === 'random'
				)
					ok = false;
				if (
					ts.isIdentifier(n) &&
					isValueUse(n) &&
					!bound.has(n.text) &&
					n.text !== name &&
					!PURE_GLOBALS.has(n.text) &&
					n.text !== KEPT_ITERABLE &&
					!pure.has(n.text)
				)
					ok = false;
				if (ok) ts.forEachChild(n, walk);
			};
			walk(fn);
			return ok;
		};
		for (let round = 0; round < this.output.length + 1; round++) {
			const before = pure.size;
			for (const { name, node } of this.output) {
				if (
					!pure.has(name) &&
					name !== 'execute' &&
					ts.isFunctionDeclaration(node) &&
					isPure(name, node)
				)
					pure.add(name);
			}
			if (pure.size === before) break;
		}
		const sources = [
			KEPT_ITERABLE_CODE,
			...this.output
				.filter((o) => pure.has(o.name))
				.map((o) => this.printer.printNode(ts.EmitHint.Unspecified, o.node, o.sf))
				.map((text) => text.replace(/^export\s+(default\s+)?/, '')),
		].join('\n');
		const literalJson = (e: ts.Expression): boolean =>
			literalOf(e) !== undefined ||
			(ts.isArrayLiteralExpression(e) && e.elements.every(literalJson)) ||
			(ts.isObjectLiteralExpression(e) &&
				e.properties.every(
					(p) =>
						ts.isPropertyAssignment(p) &&
						(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
						literalJson(p.initializer),
				));
		let changed = false;
		for (const entry of this.output) {
			let replaced = false;
			const visit = (input: ts.Node): ts.Node => {
				const n = ts.visitEachChild(input, visit, undefined);
				if (!ts.isCallExpression(n) || !ts.isIdentifier(n.expression)) return n;
				const callee = n.expression.text;
				if (
					!(pure.has(callee) || PURE_CALLS.has(callee)) ||
					callee === entry.name ||
					!n.arguments.every(literalJson)
				)
					return n;
				const text = this.printer.printNode(ts.EmitHint.Unspecified, n, entry.sf);
				let raw: unknown;
				try {
					raw = evaluate(
						`${sources}\n;(() => { const r = ${text}; return r === undefined ? 'u' : typeof r === 'number' && !Number.isFinite(r) ? 'n' : JSON.stringify([r]); })()`,
					);
				} catch {
					return n;
				}
				if (typeof raw !== 'string' || raw === 'n') return n;
				const parsed: unknown = raw === 'u' ? [undefined] : JSON.parse(raw);
				const value: unknown = Array.isArray(parsed) ? parsed[0] : n;
				const simple =
					value === undefined ||
					value === null ||
					typeof value === 'string' ||
					typeof value === 'boolean' ||
					(typeof value === 'number' && Number.isFinite(value));
				if (!simple) return n;
				replaced = true;
				return expressionOf(value);
			};
			const next = ts.visitNode(entry.node, visit);
			if (replaced) {
				changed = true;
				this.refold(entry, next);
			}
		}
		return changed;
	}

	run(): SpecialiseResult {
		const entry = this.load(this.input.entry);
		let execute: ts.MethodDeclaration | undefined;
		entry?.sf.forEachChild((st) => {
			if (!ts.isClassDeclaration(st)) return;
			for (const m of st.members) {
				if (ts.isMethodDeclaration(m) && ts.isIdentifier(m.name) && m.name.text === 'execute')
					execute = m;
			}
		});
		if (!entry || !execute) {
			return {
				errors: [`${this.input.entry}: no class with an execute method`],
				notes: [],
				linked: [],
			};
		}
		this.entryUnit = { name: 'execute', node: execute, file: entry, withContext: true };
		this.process(this.entryUnit, true);
		for (let k = 0; k < this.queue.length; k++) {
			if (k > 2000) {
				this.error('link', 'more than 2,000 declarations');
				break;
			}
			this.process(this.queue[k], false);
		}
		this.checkInstances();
		this.optimise();
		this.trimArguments();
		this.checkParameters();
		this.checkItemParameters();
		this.checkCredentials();
		this.checkMints();
		this.skipFailedOptionalUnits();
		this.checkThrows();
		this.checkResponses();
		const linked = this.output.map((o) => o.name);
		if (this.errors.length > 0) return { errors: this.errors, notes: this.notes, linked };
		const source = this.print();
		if (this.errors.length > 0) return { errors: this.errors, notes: this.notes, linked };
		const flags = [...this.flags]
			.filter(([name]) => source.includes(`"${name}"`))
			.map(([name, code]): CredentialDerivation => ({ name, code, kind: 'flag' }));
		if (flags.length > MAX_CREDENTIAL_FLAGS) {
			this.error(
				'execute',
				`the node needs more than ${MAX_CREDENTIAL_FLAGS} conditions on its credential`,
			);
			return { errors: this.errors, notes: this.notes, linked };
		}
		const derivations: CredentialDerivation[] = [
			...[...this.derivations].map(([name, code]) => ({ name, code })),
			...flags,
		];
		const mints = [...this.mints.values()].filter((m) => source.includes(`n8nMinted.${m.name}.`));
		return {
			source,
			errors: [],
			notes: this.notes,
			linked,
			derivations,
			mints,
			randoms: this.randoms,
			binary:
				this.readsStoredMetadata ||
				BINARY_HELPERS.some((h) => this.helpers.has(h)) ||
				this.output.some((o) => mentionsBinary(o.node)),
			storesResponses: this.storesResponses,
			marksFileLimit: this.marksFileLimit,
			retyped: this.retyped,
			zones: [...this.zones].sort(),
			itemParameters: [...this.itemParameters].sort(),
			firstItemParameters: [...this.itemParameters]
				.filter((name) => !this.laterItemParameters.has(name))
				.sort(),
		};
	}

	private readonly responseBuffers = new Set<ts.Node>();

	private storesResponses = false;
	private marksFileLimit = false;
	private readsStoredMetadata = false;
	private requestTokenOptions = false;

	private bufferText(root: ts.Node): ts.Node {
		const visit = (n: ts.Node): ts.Node => {
			const callee =
				ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)
					? n.expression
					: undefined;
			const inner = callee?.expression;
			if (
				ts.isCallExpression(n) &&
				callee &&
				inner &&
				callee.name.text === 'toString' &&
				ts.isCallExpression(inner) &&
				ts.isPropertyAccessExpression(inner.expression) &&
				ts.isIdentifier(inner.expression.expression) &&
				inner.expression.expression.text === 'Buffer' &&
				inner.expression.name.text === 'from' &&
				inner.arguments.length >= 1 &&
				inner.arguments.length <= 2 &&
				n.arguments.length <= 1 &&
				!ts.isSpreadElement(inner.arguments[0])
			) {
				const from = bufferEncoding(inner.arguments[1]);
				if (from !== undefined && bufferEncoding(n.arguments[0]) !== undefined) {
					const value = ts.visitNode(inner.arguments[0], visit);
					return f.updateCallExpression(
						n,
						f.updatePropertyAccessExpression(
							callee,
							f.updateCallExpression(inner, inner.expression, undefined, [
								call('__bufferText', value as ts.Expression, f.createStringLiteral(from)),
								...inner.arguments.slice(1),
							]),
							callee.name,
						),
						undefined,
						n.arguments,
					);
				}
			}
			const held =
				ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)
					? n.expression
					: undefined;
			const sized = ts.isPropertyAccessExpression(n) && n.name.text === 'length';
			if (isBase64Buffer(n)) {
				this.helpers.add('__fileBytes');
				return call('__fileBytes', ts.visitNode(n.arguments[0], visit) as ts.Expression);
			}
			if (held !== undefined && isBase64Buffer(held) && !sized) {
				this.error('code', BYTES_USE);
				return n;
			}
			if (isPlainBuffer(n) && this.responseBuffers.has(n)) {
				this.helpers.add('__bytesFrom');
				return call('__bytesFrom', ts.visitNode(n.arguments[0], visit) as ts.Expression);
			}
			if (ts.isIdentifier(n) && n.text === 'Buffer' && isValueUse(n))
				this.error(
					'code',
					'a Buffer has a compiled form only as `Buffer.from(text, encoding).toString(encoding)` with the encodings utf8, base64, base64url and hex',
				);
			return ts.visitEachChild(n, visit, undefined);
		};
		return ts.visitNode(root, visit);
	}

	private bytesUses(root: ts.Node) {
		const names = new Set<string>();
		const collect = (n: ts.Node) => {
			if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
				if (givesBytes(n.initializer)) names.add(n.name.text);
			}
			if (
				ts.isBinaryExpression(n) &&
				n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
				ts.isIdentifier(n.left) &&
				givesBytes(n.right)
			)
				names.add(n.left.text);
			ts.forEachChild(n, collect);
		};
		collect(root);
		const inputs = new Set<string>();
		const collectInputs = (n: ts.Node) => {
			if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
				if (givesInputBytes(n.initializer)) inputs.add(n.name.text);
			}
			if (
				ts.isBinaryExpression(n) &&
				n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
				ts.isIdentifier(n.left) &&
				givesInputBytes(n.right)
			)
				inputs.add(n.left.text);
			ts.forEachChild(n, collectInputs);
		};
		collectInputs(root);
		const prepared = (n: ts.Node) => {
			if (
				ts.isCallExpression(n) &&
				ts.isIdentifier(n.expression) &&
				n.expression.text === '__prepareBinary' &&
				n.arguments.length > 0
			) {
				let given = n.arguments[0];
				while (
					ts.isAsExpression(given) ||
					ts.isParenthesizedExpression(given) ||
					ts.isNonNullExpression(given) ||
					ts.isAwaitExpression(given)
				)
					given = given.expression;
				if (givesInputBytes(given) || (ts.isIdentifier(given) && inputs.has(given.text)))
					this.error('code', PREPARE_SOURCE);
			}
			ts.forEachChild(n, prepared);
		};
		prepared(root);
		if (names.size === 0) return;
		const check = (n: ts.Node) => {
			const held =
				ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)
					? n.expression
					: undefined;
			const sized = ts.isPropertyAccessExpression(n) && n.name.text === 'length';
			if (held && ts.isIdentifier(held) && names.has(held.text) && !sized)
				this.error('code', `${BYTES_USE}: '${held.text}'`);
			ts.forEachChild(n, check);
		};
		check(root);
	}

	private listSources(root: ts.Node): ts.Node {
		let found = false;
		const visit = (input: ts.Node): ts.Node => {
			const n = ts.visitEachChild(input, visit, undefined);
			const item = ts.isForOfStatement(n) ? loopItem(n) : undefined;
			if (!ts.isForOfStatement(n) || item === undefined) return n;
			const spread = item.startsWith(SPREAD_ITEM);
			if (!spread && item !== APPLY_ITEM) return n;
			found = true;
			const source = spread
				? this.helper(
						'__spreadList',
						n.expression,
						f.createStringLiteral(
							item
								.slice(SPREAD_ITEM.length + 1)
								.split('$')
								.join('.'),
						),
					)
				: this.helper('__applyList', n.expression);
			return f.updateForOfStatement(n, n.awaitModifier, n.initializer, source, n.statement);
		};
		const out = ts.visitNode(root, visit);
		return found ? out : root;
	}

	private print(): string {
		for (const { node } of this.output) this.bytesUses(node);
		for (const entry of this.output) entry.node = this.listSources(entry.node);
		for (const { node } of this.output) buffersForBinaryData(node, this.responseBuffers);
		const buffers = this.output.some((o) => mentionsBuffer(o.node));
		if (buffers) this.helpers.add('__bufferText');
		const limitGuard = [...this.helpers].some((h) =>
			(HELPERS[h] ?? CONTEXT_HELPERS[h])?.includes(LIMIT_TEXT),
		);
		if (limitGuard) this.helpers.add('__isLimit');
		const unitsWith = (guarded: boolean) => {
			const code: string[] = [];
			let body = '';
			for (const { name, node, sf } of this.output) {
				const unit = this.units.get(name);
				const text = (n: ts.Node) =>
					this.printer.printNode(
						ts.EmitHint.Unspecified,
						finish(guarded ? guardCatches(buffers ? this.bufferText(n) : n) : n),
						sf,
					);
				if (!ts.isFunctionDeclaration(node)) {
					if (unit?.withContext) this.error(name, 'a constant is called with the n8n context');
					code.push(text(node));
				} else if (name === 'execute') {
					body = (node.body?.statements ?? []).map(text).join('\n');
				} else {
					const lead = unit?.withContext
						? CONTEXT_PARAMS.map((p) => f.createParameterDeclaration(undefined, undefined, p))
						: [];
					code.push(
						text(
							f.updateFunctionDeclaration(
								node,
								node.modifiers?.filter((m) => m.kind === ts.SyntaxKind.AsyncKeyword),
								node.asteriskToken,
								node.name,
								undefined,
								[...lead, ...node.parameters],
								undefined,
								node.body,
							),
						),
					);
				}
			}
			return { code, body };
		};
		const unguarded = unitsWith(limitGuard);
		const holdsBytes = HOLDS_BYTES.some((h) => this.helpers.has(h));
		if (holdsBytes) this.helpers.add('__noBytes');
		this.storesResponses =
			this.helpers.has('__request') &&
			(this.helpers.has('__prepareBinary') || this.helpers.has('__bytesFrom')) &&
			this.output.some((o) => mentionsEncoding(o.node));
		const requestWith = (marks: boolean) =>
			(this.storesResponses ? REQUEST_SOURCE : REQUEST_SOURCE.replace(REQUEST_BYTES, 'false'))
				.replace(
					REQUEST_FAILS,
					this.output.some((o) => setsOption(o.node, LENIENT_OPTIONS))
						? REQUEST_FAILS_UNLESS_LENIENT
						: REQUEST_FAILS,
				)
				.replace(
					REQUEST_RESULT,
					this.output.some((o) => setsOption(o.node, FULL_RESPONSE_OPTIONS, true))
						? REQUEST_RESULT_OR_FULL
						: REQUEST_RESULT,
				)
				.replace(REQUEST_SEND, marks ? REQUEST_SEND_GUARDED : REQUEST_SEND)
				.replace(REQUEST_SENT, marks ? REQUEST_SENT_GUARDED : REQUEST_SENT)
				.replace(
					REQUEST_HEAD,
					this.requestTokenOptions ? REQUEST_HEAD_WITH_TOKEN_OPTIONS : REQUEST_HEAD,
				)
				.replace(
					REQUEST_CREDENTIAL,
					this.requestTokenOptions ? REQUEST_CREDENTIAL_WITH_TOKEN_OPTIONS : REQUEST_CREDENTIAL,
				);
		const sendsRequests = this.helpers.delete('__request');
		const contextCode: string[] = [];
		for (const [name, source] of Object.entries(CONTEXT_HELPERS)) {
			if (this.helpers.delete(name)) contextCode.unshift(source);
		}
		const codeWith = (units: string[], marks: boolean) => [
			...contextCode,
			...(marks ? [`let ${REPEATS} = true;`] : []),
			...(sendsRequests ? [requestWith(marks)] : []),
			...units,
		];
		let code = codeWith(unguarded.code, false);
		let body = unguarded.body;
		this.randoms = randomShapes(this.output.map((o) => o.node));
		for (const always of ['__wrap', '__plain']) this.helpers.add(always);
		if (this.helpers.has('__apiError')) this.helpers.add('__apiDescription');

		const globals = new Set([
			'ctx',
			'parameters',
			ITEM_PARAMETERS,
			'credential',
			'__items',
			'__request',
			...Object.keys(CONTEXT_HELPERS),
			...Object.keys(HELPERS),
			...COST_GLOBALS,
		]);
		if ([...code, body].some((text) => text.includes(`${SESSION_MARKER}(`)))
			this.error('code', SESSION_TYPE);
		let joined = lowerConstants([...code, body].join('\n'), this.input.evaluate);
		this.marksFileLimit =
			this.storesResponses && sendsRequests && namesOutsideRequest(joined, 'encoding');
		if (this.marksFileLimit) {
			for (const helper of ['__isLimit', '__isFileLimit']) this.helpers.add(helper);
			const guarded = unitsWith(true);
			code = codeWith(guarded.code, true);
			body = guarded.body;
			joined = lowerConstants([...code, body].join('\n'), this.input.evaluate);
		}
		const reachesBytes = reachableHelpers([joined], HELPERS);
		const makesBytes =
			holdsBytes &&
			((this.storesResponses && namesOutsideRequest(joined, 'encoding')) ||
				HOLDS_BYTES.some((h) => reachesBytes.has(h)));
		const lowered = lowerCost(joined, makesBytes, this.input.evaluate);
		for (const helper of lowered.helpers) this.helpers.add(helper);
		const translated = translateCode({
			code: lowered.code,
			mode: 'all',
			kind: 'code',
			hasNode: () => false,
			nodeCode: { globals },
			timezone: this.input.timezone,
		});
		if (!translated.ok) {
			for (const b of translated.blockers) this.error('code', `${b.feature}: ${b.message}`);
			return '';
		}
		const t = translated.translation;
		if (t.zones.size > 0 && this.input.timezone === undefined)
			this.error('code', 'dates in a time zone need the time zone of the workflow');
		for (const zone of t.zones) this.zones.add(zone);
		const zonesOf = (n: ts.Node) => {
			const use = momentZoneUse(n);
			if (use?.error !== undefined) this.error('code', use.error);
			if (use?.zone !== undefined) this.zones.add(use.zone);
			ts.forEachChild(n, zonesOf);
		};
		for (const { node } of this.output) zonesOf(node);
		if (t.usesMatchProps)
			this.error(
				'code',
				'the `index` or `groups` of a match has no compiled form in node code yet',
			);

		const names: string[] = [];
		const add = (name: string) => {
			if (names.includes(name) || !Object.hasOwn(CODE_HELPERS, name)) return;
			names.push(name);
			for (const used of CODE_HELPERS[name].uses) add(used);
		};
		for (const name of t.helpers) add(name);
		if (t.usesCollections) add('collPlain');

		const plain = t.usesCollections
			? 'function __plain(value: Json): Json {\n\treturn collPlain(value);\n}'
			: 'function __plain(value: Json): Json {\n\treturn value;\n}';
		const texts: Record<string, string> = {
			...HELPERS,
			...COST_HELPERS,
			__plain: plain,
			[PLAIN_LIST]: t.usesCollections ? PLAIN_LIST_COLLECTIONS : PLAIN_LIST_SAME,
			...(this.marksFileLimit ? { __isLimit: HELPERS.__isLimitOrHost } : {}),
			...(makesBytes
				? {
						__sendBody: HELPERS.__sendBodyChecked,
						__out: HELPERS.__outChecked,
						__outPaired: HELPERS.__outPairedChecked,
						[OUT_FAILED]: HELPERS.__outFailedChecked,
					}
				: {}),
		};
		const reached = reachableHelpers(
			[t.body, lowered.items, ...names.map((n) => CODE_HELPERS[n].source)],
			texts,
		);
		const own = [...this.helpers]
			.sort()
			.filter((h) => reached.has(h))
			.map((h) => texts[h]);
		const typed = (type: string) => `import { defineNode } from '@n8n/workflow-lang';

type Json = any;

${[...names.map((n) => CODE_HELPERS[n].source), ...own].join('\n\n')}

export default defineNode<Json>({
	type: ${JSON.stringify(type)},
	version: ${this.input.version},
	async run(ctx, parameters0, items0, credential) {
		const parameters: Json = parameters0 ?? {};${this.itemParameters.size > 0 ? `\n\t\tconst ${ITEM_PARAMETERS}: Json = parameters.each;` : ''}
		${lowered.items}
${t.body}
	},
});
`;
		this.retyped = typed;
		return typed(this.input.moduleType ?? this.input.type);
	}

	private retyped: ((type: string) => string) | undefined;

	private readonly zones = new Set<string>();
	private randoms: RandomShape[] = [];
}

const ITEM_PARAMETERS = '__perItem';
const MAX_INDEX_HOPS = 8;

type ItemBinding =
	| { kind: 'loop' }
	| { kind: 'value'; value: ts.Expression; frame: ItemFrame }
	| { kind: 'parameter'; position: number; unit: string }
	| { kind: 'other' };

interface ItemFrame {
	names: Map<string, ItemBinding>;
	outer: ItemFrame | undefined;
}

interface ItemParameterUses {
	reads: Array<{ where: string; parameter: string; index: ts.Expression; frame: ItemFrame }>;
	calls: Map<string, Array<{ call: ts.CallExpression; frame: ItemFrame }>>;
	names: Map<string, number>;
	loose: string[];
}

function itemBindingOf(name: string, frame: ItemFrame | undefined): ItemBinding | undefined {
	for (let at = frame; at; at = at.outer) {
		const found = at.names.get(name);
		if (found) return found;
	}
	return undefined;
}

function isInputItems(e: ts.Expression, frame: ItemFrame, hops = 0): boolean {
	if (hops > MAX_INDEX_HOPS) return false;
	if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e))
		return isInputItems(e.expression, frame, hops);
	if (!ts.isIdentifier(e)) return false;
	const found = itemBindingOf(e.text, frame);
	if (found === undefined) return e.text === '__items';
	return found.kind === 'value' && isInputItems(found.value, found.frame, hops + 1);
}

function isInputCount(e: ts.Expression, frame: ItemFrame, hops = 0): boolean {
	if (hops > MAX_INDEX_HOPS) return false;
	if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e))
		return isInputCount(e.expression, frame, hops);
	if (ts.isPropertyAccessExpression(e))
		return e.name.text === 'length' && isInputItems(e.expression, frame);
	if (!ts.isIdentifier(e)) return false;
	const found = itemBindingOf(e.text, frame);
	return found?.kind === 'value' && isInputCount(found.value, found.frame, hops + 1);
}

const INDEXED_CALLBACKS = new Set(['map', 'forEach', 'flatMap', 'filter', 'some', 'every']);

function entriesIndexOf(loop: ts.ForOfStatement, frame: ItemFrame): string | undefined {
	const list = loop.expression;
	if (
		!ts.isCallExpression(list) ||
		list.arguments.length !== 1 ||
		!ts.isIdentifier(list.expression) ||
		list.expression.text !== '__entries' ||
		!isInputItems(list.arguments[0], frame)
	)
		return undefined;
	const declared = loop.initializer;
	if (
		!ts.isVariableDeclarationList(declared) ||
		(declared.flags & ts.NodeFlags.Const) === 0 ||
		declared.declarations.length !== 1
	)
		return undefined;
	const pattern = declared.declarations[0].name;
	if (!ts.isArrayBindingPattern(pattern)) return undefined;
	const [first] = pattern.elements;
	return first !== undefined &&
		ts.isBindingElement(first) &&
		ts.isIdentifier(first.name) &&
		!first.initializer &&
		!first.dotDotDotToken
		? first.name.text
		: undefined;
}

function stepsByOne(step: ts.Expression | undefined, name: string): boolean {
	if (!step) return false;
	if (ts.isPostfixUnaryExpression(step) || ts.isPrefixUnaryExpression(step))
		return (
			step.operator === ts.SyntaxKind.PlusPlusToken &&
			ts.isIdentifier(step.operand) &&
			step.operand.text === name
		);
	return (
		ts.isBinaryExpression(step) &&
		step.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken &&
		ts.isIdentifier(step.left) &&
		step.left.text === name &&
		ts.isNumericLiteral(step.right) &&
		step.right.text === '1'
	);
}

function itemParameterUses(output: Array<{ name: string; node: ts.Node }>): ItemParameterUses {
	const uses: ItemParameterUses = { reads: [], calls: new Map(), names: new Map(), loose: [] };
	for (const { name: where, node: root } of output) {
		const written = writtenNames(root);
		const other = (frame: ItemFrame, name: ts.BindingName) => {
			if (ts.isIdentifier(name)) frame.names.set(name.text, { kind: 'other' });
			else for (const e of name.elements) if (!ts.isOmittedExpression(e)) other(frame, e.name);
		};
		const declare = (frame: ItemFrame, list: ts.VariableDeclarationList) => {
			const fixed = (list.flags & ts.NodeFlags.Const) !== 0;
			const scoped = fixed || (list.flags & ts.NodeFlags.Let) !== 0;
			for (const d of list.declarations) {
				if (
					ts.isIdentifier(d.name) &&
					d.initializer &&
					scoped &&
					(fixed || !written.has(d.name.text))
				)
					frame.names.set(d.name.text, { kind: 'value', value: d.initializer, frame });
				else other(frame, d.name);
			}
		};
		const declareAll = (frame: ItemFrame, statements: readonly ts.Statement[]) => {
			for (const st of statements) {
				if (ts.isVariableStatement(st)) declare(frame, st.declarationList);
				if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name)
					frame.names.set(st.name.text, { kind: 'other' });
			}
		};
		const hoisted = (n: ts.Node, frame: ItemFrame) => {
			if (ts.isFunctionLike(n)) return;
			if (
				ts.isVariableDeclarationList(n) &&
				(n.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let)) === 0
			)
				for (const d of n.declarations) other(frame, d.name);
			ts.forEachChild(n, (child) => hoisted(child, frame));
		};
		const walk = (n: ts.Node, frame: ItemFrame) => {
			if (
				ts.isElementAccessExpression(n) &&
				ts.isElementAccessExpression(n.expression) &&
				ts.isIdentifier(n.expression.expression) &&
				n.expression.expression.text === ITEM_PARAMETERS &&
				ts.isStringLiteral(n.argumentExpression)
			) {
				uses.reads.push({
					where,
					parameter: n.argumentExpression.text,
					index: n.expression.argumentExpression,
					frame,
				});
				walk(n.expression.argumentExpression, frame);
				return;
			}
			if (ts.isIdentifier(n)) {
				if (n.text === ITEM_PARAMETERS) uses.loose.push(where);
				uses.names.set(n.text, (uses.names.get(n.text) ?? 0) + 1);
				return;
			}
			if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
				const sites = uses.calls.get(n.expression.text) ?? [];
				sites.push({ call: n, frame });
				uses.calls.set(n.expression.text, sites);
			}
			if (ts.isFunctionLike(n)) {
				const inner: ItemFrame = { names: new Map(), outer: frame };
				const overItems =
					(ts.isArrowFunction(n) || ts.isFunctionExpression(n)) &&
					ts.isCallExpression(n.parent) &&
					n.parent.arguments[0] === n &&
					ts.isPropertyAccessExpression(n.parent.expression) &&
					INDEXED_CALLBACKS.has(n.parent.expression.name.text) &&
					isInputItems(n.parent.expression.expression, frame);
				n.parameters.forEach((parameter, position) => {
					if (
						overItems &&
						position === 1 &&
						ts.isIdentifier(parameter.name) &&
						!parameter.initializer &&
						!parameter.dotDotDotToken &&
						!written.has(parameter.name.text)
					) {
						inner.names.set(parameter.name.text, { kind: 'loop' });
						return;
					}
					const plain =
						n === root &&
						ts.isFunctionDeclaration(n) &&
						n.name !== undefined &&
						ts.isIdentifier(parameter.name) &&
						!parameter.initializer &&
						!parameter.dotDotDotToken &&
						!written.has(parameter.name.text);
					if (plain && ts.isIdentifier(parameter.name) && n.name)
						inner.names.set(parameter.name.text, {
							kind: 'parameter',
							position,
							unit: n.name.text,
						});
					else other(inner, parameter.name);
				});
				const body = 'body' in n ? n.body : undefined;
				if (body) hoisted(body, inner);
				if (body && ts.isBlock(body)) declareAll(inner, body.statements);
				ts.forEachChild(n, (child) => {
					if (child === body && ts.isBlock(child))
						child.statements.forEach((st) => walk(st, inner));
					else walk(child, inner);
				});
				return;
			}
			if (ts.isBlock(n)) {
				const inner: ItemFrame = { names: new Map(), outer: frame };
				declareAll(inner, n.statements);
				n.statements.forEach((st) => walk(st, inner));
				return;
			}
			if (ts.isCaseBlock(n)) {
				const inner: ItemFrame = { names: new Map(), outer: frame };
				for (const clause of n.clauses) declareAll(inner, clause.statements);
				ts.forEachChild(n, (child) => walk(child, inner));
				return;
			}
			if (ts.isForStatement(n)) {
				const inner: ItemFrame = { names: new Map(), outer: frame };
				if (n.initializer && ts.isVariableDeclarationList(n.initializer)) {
					declare(inner, n.initializer);
					const [declared] = n.initializer.declarations;
					const name = ts.isIdentifier(declared.name) ? declared.name.text : undefined;
					const start = declared.initializer;
					const test = n.condition;
					if (
						name !== undefined &&
						n.initializer.declarations.length === 1 &&
						(n.initializer.flags & ts.NodeFlags.Let) !== 0 &&
						start &&
						ts.isNumericLiteral(start) &&
						start.text === '0' &&
						test &&
						ts.isBinaryExpression(test) &&
						test.operatorToken.kind === ts.SyntaxKind.LessThanToken &&
						ts.isIdentifier(test.left) &&
						test.left.text === name &&
						isInputCount(test.right, frame) &&
						stepsByOne(n.incrementor, name) &&
						!writtenNames(n.statement).has(name)
					)
						inner.names.set(name, { kind: 'loop' });
				}
				ts.forEachChild(n, (child) => walk(child, inner));
				return;
			}
			if (ts.isForOfStatement(n) || ts.isForInStatement(n)) {
				const inner: ItemFrame = { names: new Map(), outer: frame };
				if (ts.isVariableDeclarationList(n.initializer))
					for (const d of n.initializer.declarations) other(inner, d.name);
				const position = ts.isForOfStatement(n) ? entriesIndexOf(n, frame) : undefined;
				if (position && !written.has(position)) inner.names.set(position, { kind: 'loop' });
				ts.forEachChild(n, (child) => walk(child, inner));
				return;
			}
			if (ts.isCatchClause(n)) {
				const inner: ItemFrame = { names: new Map(), outer: frame };
				if (n.variableDeclaration) other(inner, n.variableDeclaration.name);
				ts.forEachChild(n, (child) => walk(child, inner));
				return;
			}
			ts.forEachChild(n, (child) => walk(child, frame));
		};
		walk(root, { names: new Map(), outer: undefined });
	}
	return uses;
}

function isMemberTarget(target: ts.Expression): boolean {
	if (
		ts.isParenthesizedExpression(target) ||
		ts.isAsExpression(target) ||
		ts.isNonNullExpression(target)
	)
		return isMemberTarget(target.expression);
	return ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target);
}

function writtenNames(root: ts.Node): Set<string> {
	const names = new Set<string>();
	const all = (n: ts.Node) => {
		if (ts.isIdentifier(n)) names.add(n.text);
		ts.forEachChild(n, all);
	};
	const walk = (n: ts.Node) => {
		if (
			ts.isBinaryExpression(n) &&
			n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
			n.operatorToken.kind <= ts.SyntaxKind.LastAssignment
		) {
			if (!isMemberTarget(n.left)) all(n.left);
		}
		if (
			(ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) &&
			!isMemberTarget(n.operand)
		)
			all(n.operand);
		if ((ts.isForInStatement(n) || ts.isForOfStatement(n)) && ts.isExpression(n.initializer))
			all(n.initializer);
		ts.forEachChild(n, walk);
	};
	walk(root);
	return names;
}

function keepsCaught(clause: ts.CatchClause, name: string): boolean {
	return !bindingsOf(clause.block).has(name) && !writtenNames(clause.block).has(name);
}

function isCaught(read: ts.Identifier): boolean {
	for (let p: ts.Node | undefined = read.parent; p; p = p.parent) {
		const declared = ts.isCatchClause(p) ? p.variableDeclaration?.name : undefined;
		if (ts.isCatchClause(p) && declared && ts.isIdentifier(declared) && declared.text === read.text)
			return keepsCaught(p, read.text);
	}
	return false;
}

const ERROR_MAKERS = new Set(['__error', '__apiError']);
const NATIVE_ERRORS = new Set(['Error', 'TypeError', 'RangeError']);
const MAX_ERROR_HOPS = 6;

interface ValueSite {
	value: ts.Expression | undefined;
	caught: string[];
}

interface ErrorFlow {
	throws: ValueSite[];
	returns: ValueSite[];
	writes: Map<string, ValueSite[] | undefined>;
	closed: boolean;
	isAsync: boolean;
}

function errorFlowOf(root: ts.Node): ErrorFlow {
	const flow: ErrorFlow = {
		throws: [],
		returns: [],
		writes: new Map(),
		closed: false,
		isAsync: false,
	};
	const unknown = (n: ts.Node) => {
		if (ts.isIdentifier(n)) flow.writes.set(n.text, undefined);
		ts.forEachChild(n, unknown);
	};
	const write = (name: string, site: ValueSite) => {
		if (!flow.writes.has(name)) flow.writes.set(name, []);
		flow.writes.get(name)?.push(site);
	};
	const walk = (n: ts.Node, caught: string[], nested: boolean) => {
		if (ts.isThrowStatement(n)) flow.throws.push({ value: n.expression, caught });
		if (ts.isReturnStatement(n) && !nested) flow.returns.push({ value: n.expression, caught });
		if (ts.isParameter(n)) unknown(n.name);
		if (ts.isForInStatement(n) || ts.isForOfStatement(n)) unknown(n.initializer);
		if (
			(ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) &&
			!isMemberTarget(n.operand)
		)
			unknown(n.operand);
		if (ts.isVariableDeclaration(n) && !ts.isCatchClause(n.parent)) {
			if (ts.isIdentifier(n.name)) write(n.name.text, { value: n.initializer, caught });
			else unknown(n.name);
		}
		if (
			ts.isBinaryExpression(n) &&
			n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
			n.operatorToken.kind <= ts.SyntaxKind.LastAssignment
		) {
			if (ts.isIdentifier(n.left) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken)
				write(n.left.text, { value: n.right, caught });
			else if (!isMemberTarget(n.left)) unknown(n.left);
		}
		const declared = ts.isCatchClause(n) ? n.variableDeclaration?.name : undefined;
		const kept =
			ts.isCatchClause(n) && declared && ts.isIdentifier(declared) && keepsCaught(n, declared.text);
		if (declared && !kept) unknown(declared);
		const inner = kept && ts.isIdentifier(declared) ? [...caught, declared.text] : caught;
		const deeper = nested || (n !== root && ts.isFunctionLike(n));
		ts.forEachChild(n, (child) => {
			if (child !== declared?.parent) walk(child, inner, deeper);
		});
	};
	walk(root, [], false);
	if (ts.isFunctionLike(root)) {
		const body = 'body' in root ? root.body : undefined;
		const last = body && ts.isBlock(body) ? body.statements.at(-1) : undefined;
		flow.closed = last !== undefined && (ts.isReturnStatement(last) || ts.isThrowStatement(last));
		flow.isAsync =
			ts.canHaveModifiers(root) &&
			(ts.getModifiers(root) ?? []).some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
	}
	return flow;
}

function makesError(
	thrown: ts.Expression | undefined,
	caught: string[],
	flow: ErrorFlow,
	flowOfUnit: (name: string) => ErrorFlow | undefined,
	hops: number,
	orNothing = false,
): boolean {
	if (thrown === undefined) return orNothing;
	if (hops > MAX_ERROR_HOPS) return false;
	const again = (e: ts.Expression | undefined, at = caught, nothing = orNothing) =>
		makesError(e, at, flow, flowOfUnit, hops + 1, nothing);
	if (ts.isParenthesizedExpression(thrown) || ts.isAsExpression(thrown))
		return again(thrown.expression);
	if (thrown.kind === ts.SyntaxKind.NullKeyword) return orNothing;
	if (ts.isIdentifier(thrown)) {
		if (thrown.text === 'undefined') return orNothing;
		if (caught.includes(thrown.text)) return true;
		const sites = flow.writes.get(thrown.text);
		return (
			sites !== undefined &&
			sites.length > 0 &&
			sites.every((site) => again(site.value, site.caught))
		);
	}
	if (ts.isConditionalExpression(thrown)) return again(thrown.whenTrue) && again(thrown.whenFalse);
	if (
		ts.isBinaryExpression(thrown) &&
		(thrown.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
			thrown.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
	)
		return again(thrown.left, caught, true) && again(thrown.right);
	if (ts.isNewExpression(thrown))
		return ts.isIdentifier(thrown.expression) && NATIVE_ERRORS.has(thrown.expression.text);
	const awaited = ts.isAwaitExpression(thrown);
	const made = awaited ? thrown.expression : thrown;
	if (!ts.isCallExpression(made) || !ts.isIdentifier(made.expression)) return false;
	if (ERROR_MAKERS.has(made.expression.text)) return true;
	const callee = flowOfUnit(made.expression.text);
	return (
		callee !== undefined &&
		callee.closed &&
		callee.isAsync === awaited &&
		callee.returns.every((site) =>
			makesError(site.value, site.caught, callee, flowOfUnit, hops + 1),
		)
	);
}

function bindingsOf(root: ts.Node): Map<string, number> {
	const counts = new Map<string, number>();
	const add = (name: ts.BindingName) => {
		if (ts.isIdentifier(name)) counts.set(name.text, (counts.get(name.text) ?? 0) + 1);
		else for (const e of name.elements) if (!ts.isOmittedExpression(e)) add(e.name);
	};
	const walk = (n: ts.Node) => {
		if (ts.isVariableDeclaration(n) || ts.isParameter(n)) add(n.name);
		if ((ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n)) && n.name) add(n.name);
		ts.forEachChild(n, walk);
	};
	walk(root);
	return counts;
}

function mentionsThis(n: ts.Node): boolean {
	if (n.kind === ts.SyntaxKind.ThisKeyword) return true;
	if (ts.isFunctionExpression(n) || ts.isFunctionDeclaration(n) || ts.isClassLike(n)) return false;
	return ts.forEachChild(n, mentionsThis) ?? false;
}

function isValueUse(n: ts.Identifier): boolean {
	const p = n.parent;
	if (!p) return true;
	if (ts.isPropertyAccessExpression(p)) return p.expression === n;
	if (ts.isPropertyAssignment(p)) return p.initializer === n;
	if (ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isBindingElement(p))
		return p.initializer === n;
	if (ts.isFunctionDeclaration(p) || ts.isFunctionExpression(p) || ts.isMethodDeclaration(p))
		return false;
	if (ts.isLabeledStatement(p) || ts.isBreakStatement(p) || ts.isContinueStatement(p)) return false;
	if (ts.isPropertyDeclaration(p) || ts.isImportSpecifier(p) || ts.isExportSpecifier(p))
		return false;
	return true;
}

const UNROLL_LIMIT = 16;

function unrollParameterLoop(loop: ts.ForOfStatement): ts.Statement | undefined {
	const list = loop.expression;
	const declarations = loop.initializer;
	if (
		loop.awaitModifier ||
		!ts.isArrayLiteralExpression(list) ||
		list.elements.length > UNROLL_LIMIT ||
		!ts.isVariableDeclarationList(declarations) ||
		!(declarations.flags & ts.NodeFlags.Const) ||
		declarations.declarations.length !== 1
	)
		return undefined;
	const name = declarations.declarations[0].name;
	if (!ts.isIdentifier(name)) return undefined;
	const values: string[] = [];
	for (const element of list.elements) {
		const literal = literalOf(element);
		if (!literal || typeof literal.value !== 'string') return undefined;
		values.push(literal.value);
	}
	let names = false;
	let jumps = false;
	const walk = (n: ts.Node) => {
		if (ts.isBreakStatement(n) || ts.isContinueStatement(n) || ts.isLabeledStatement(n))
			jumps = true;
		if (isThisCall(n, 'getNodeParameter')) {
			const uses = (x: ts.Node): boolean =>
				(ts.isIdentifier(x) && x.text === name.text) || (ts.forEachChild(x, uses) ?? false);
			if (n.arguments[0] && uses(n.arguments[0])) names = true;
		}
		ts.forEachChild(n, walk);
	};
	walk(loop.statement);
	if (!names || jumps || bindingsOf(loop.statement).has(name.text)) return undefined;
	const withValue = (value: string) => {
		const visit = (x: ts.Node): ts.Node => {
			if (ts.isShorthandPropertyAssignment(x) && x.name.text === name.text)
				return f.createPropertyAssignment(name.text, f.createStringLiteral(value));
			if (ts.isIdentifier(x) && x.text === name.text && isValueUse(x))
				return f.createStringLiteral(value);
			return ts.visitEachChild(x, visit, undefined);
		};
		return ts.visitNode(loop.statement, visit) as ts.Statement;
	};
	return f.createBlock(
		values.map((value) => f.createBlock([withValue(value)], true)),
		true,
	);
}

function isInputData(e: ts.Expression): boolean {
	if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e))
		return isInputData(e.expression);
	if (ts.isCallExpression(e)) return isThisCall(e, 'getInputData') && readsFirstInput(e);
	if (!ts.isIdentifier(e)) return false;
	for (let scope: ts.Node | undefined = e.parent; scope; scope = scope.parent) {
		if (ts.isFunctionLike(scope) && scope.parameters.some((p) => bindsName(p.name, e.text)))
			return false;
		if (!ts.isBlock(scope) && !ts.isSourceFile(scope)) continue;
		for (const statement of scope.statements) {
			if (!ts.isVariableStatement(statement)) continue;
			for (const declared of statement.declarationList.declarations) {
				if (!bindsName(declared.name, e.text)) continue;
				return (
					ts.isIdentifier(declared.name) &&
					(statement.declarationList.flags & ts.NodeFlags.Const) !== 0 &&
					declared.initializer !== undefined &&
					isInputData(declared.initializer)
				);
			}
		}
	}
	return false;
}

function bindsName(name: ts.BindingName, text: string): boolean {
	if (ts.isIdentifier(name)) return name.text === text;
	return name.elements.some((e) => !ts.isOmittedExpression(e) && bindsName(e.name, text));
}

function readsFirstInput(read: ts.CallExpression): boolean {
	if (read.arguments.length === 0) return true;
	return read.arguments.length === 1 && literalOf(read.arguments[0])?.value === 0;
}

function chainStartsAbsent(chain: ts.Node): boolean {
	let link = chain;
	while (
		(ts.isPropertyAccessExpression(link) ||
			ts.isElementAccessExpression(link) ||
			ts.isCallExpression(link)) &&
		!link.questionDotToken &&
		ts.isOptionalChain(link)
	)
		link = link.expression;
	if (
		!ts.isPropertyAccessExpression(link) &&
		!ts.isElementAccessExpression(link) &&
		!ts.isCallExpression(link)
	)
		return false;
	if (!link.questionDotToken) return false;
	const base = literalOf(link.expression);
	return base !== undefined && (base.value === undefined || base.value === null);
}

function isEmptyObject(e: ts.Expression): boolean {
	if (ts.isParenthesizedExpression(e)) return isEmptyObject(e.expression);
	return ts.isObjectLiteralExpression(e) && e.properties.length === 0;
}

function patternTargets(root: ts.Node): Set<string> {
	const out = new Set<string>();
	const names = (n: ts.Node) => {
		if (ts.isIdentifier(n)) out.add(n.text);
		ts.forEachChild(n, names);
	};
	const walk = (n: ts.Node) => {
		if (
			ts.isBinaryExpression(n) &&
			n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
			!ts.isIdentifier(n.left)
		) {
			let target: ts.Expression = n.left;
			while (ts.isParenthesizedExpression(target)) target = target.expression;
			if (ts.isArrayLiteralExpression(target) || ts.isObjectLiteralExpression(target))
				names(target);
		}
		if (
			(ts.isForOfStatement(n) || ts.isForInStatement(n)) &&
			!ts.isVariableDeclarationList(n.initializer)
		)
			names(n.initializer);
		ts.forEachChild(n, walk);
	};
	walk(root);
	return out;
}

const NAMED_ITERABLE = '__iterable';
const KEPT_ITERABLE = '__iterableOf';
const KEPT_ITERABLE_CODE = `function ${KEPT_ITERABLE}(value, name) {
	if (Array.isArray(value) || typeof value === 'string') return value;
	throw new TypeError(name + ' is not iterable');
}`;
const SPREAD_ITEM = '__each';
const APPLY_ITEM = '__more';

function spreadItem(source: ts.Expression): string {
	const name = iterableName(source);
	return name === undefined || name.includes('$')
		? SPREAD_ITEM
		: `${SPREAD_ITEM}$${name.replaceAll('.', '$')}`;
}

function loopItem(loop: ts.ForOfStatement): string | undefined {
	const list = loop.initializer;
	if (!ts.isVariableDeclarationList(list) || list.declarations.length !== 1) return undefined;
	const name = list.declarations[0].name;
	return ts.isIdentifier(name) ? name.text : undefined;
}

function isNamedIterable(e: ts.Expression): e is ts.CallExpression {
	return (
		ts.isCallExpression(e) &&
		ts.isIdentifier(e.expression) &&
		e.expression.text === NAMED_ITERABLE &&
		e.arguments.length === 2
	);
}

function iterableName(e: ts.Expression): string | undefined {
	if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e))
		return iterableName(e.expression);
	if (ts.isIdentifier(e)) return e.text === 'undefined' ? undefined : e.text;
	if (ts.isPropertyAccessExpression(e) && !e.questionDotToken) {
		const head = iterableName(e.expression);
		return head === undefined ? undefined : `${head}.${e.name.text}`;
	}
	return undefined;
}

function nameIterables(root: ts.Node): ts.Node {
	let named = false;
	const visit = (input: ts.Node): ts.Node => {
		const n = ts.visitEachChild(input, visit, undefined);
		if (!ts.isForOfStatement(n) || n.awaitModifier) return n;
		const name = iterableName(n.expression);
		const item = loopItem(n);
		if (name === undefined || item === APPLY_ITEM || item?.startsWith(SPREAD_ITEM)) return n;
		named = true;
		return f.updateForOfStatement(
			n,
			n.awaitModifier,
			n.initializer,
			call(NAMED_ITERABLE, n.expression, f.createStringLiteral(name)),
			n.statement,
		);
	};
	const out = ts.visitNode(root, visit);
	return named ? out : root;
}

function containsBreak(n: ts.Node): boolean {
	if (ts.isBreakStatement(n)) return true;
	if (
		ts.isForStatement(n) ||
		ts.isForOfStatement(n) ||
		ts.isForInStatement(n) ||
		ts.isWhileStatement(n) ||
		ts.isDoStatement(n)
	)
		return false;
	if (ts.isSwitchStatement(n) || ts.isFunctionLike(n)) return false;
	return ts.forEachChild(n, containsBreak) ?? false;
}

function finish(root: ts.Node): ts.Node {
	const visit = (n: ts.Node): ts.Node => {
		const out = ts.visitEachChild(n, visit, undefined);
		if (
			ts.isCallExpression(out) &&
			ts.isIdentifier(out.expression) &&
			out.expression.text === LATER_AUTHENTICATE &&
			out.arguments.length === 2
		)
			return out.arguments[1];
		if (
			ts.isCallExpression(out) &&
			ts.isIdentifier(out.expression) &&
			out.expression.text === '__CREDFIELD'
		) {
			const field = out.arguments[0];
			return f.createStringLiteral(
				`{{$credentials.${ts.isStringLiteral(field) ? field.text : ''}}}`,
			);
		}
		if (
			ts.isCallExpression(out) &&
			ts.isIdentifier(out.expression) &&
			out.expression.text === FLAG_MARKER
		)
			return f.createCallExpression(
				f.createPropertyAccessExpression(f.createIdentifier('ctx'), 'credentialFlag'),
				undefined,
				[f.createIdentifier('credential'), ...out.arguments],
			);
		return out;
	};
	return ts.visitNode(root, visit);
}

export function specialiseNode(input: SpecialiseInput): SpecialiseResult {
	const specialiser = new Specialiser(input);
	try {
		const result = specialiser.run();
		return result.errors.length > 0 ? { ...result, origins: specialiser.origins() } : result;
	} catch (error) {
		return {
			errors: [error instanceof Error ? error.message : String(error)],
			notes: [],
			linked: [],
			origins: specialiser.origins(),
		};
	}
}
