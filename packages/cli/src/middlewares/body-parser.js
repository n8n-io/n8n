'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.bodyParser = exports.parseBody = exports.rawBodyReader = void 0;
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const querystring_1 = require('querystring');
const raw_body_1 = __importDefault(require('raw-body'));
const xml2js_1 = require('xml2js');
const zlib_1 = require('zlib');
const unprocessable_error_1 = require('@/errors/response-errors/unprocessable.error');
const xmlParser = new xml2js_1.Parser({
	async: true,
	normalize: true,
	normalizeTags: true,
	explicitArray: false,
});
const payloadSizeMax = di_1.Container.get(config_1.GlobalConfig).endpoints.payloadSizeMax;
const rawBodyReader = async (req, _res, next) => {
	(0, n8n_core_1.parseIncomingMessage)(req);
	req.readRawBody = async () => {
		if (!req.rawBody) {
			let stream = req;
			let contentLength;
			const contentEncoding = req.headers['content-encoding'];
			switch (contentEncoding) {
				case 'gzip':
					stream = req.pipe((0, zlib_1.createGunzip)());
					break;
				case 'deflate':
					stream = req.pipe((0, zlib_1.createInflate)());
					break;
				default:
					contentLength = req.headers['content-length'];
			}
			req.rawBody = await (0, raw_body_1.default)(stream, {
				length: contentLength,
				limit: `${String(payloadSizeMax)}mb`,
			});
			req._body = true;
		}
	};
	next();
};
exports.rawBodyReader = rawBodyReader;
const parseBody = async (req) => {
	await req.readRawBody();
	const { rawBody, contentType, encoding } = req;
	if (rawBody?.length) {
		try {
			if (contentType === 'application/json') {
				req.body = (0, n8n_workflow_1.jsonParse)(rawBody.toString(encoding));
			} else if (contentType?.endsWith('/xml') || contentType?.endsWith('+xml')) {
				req.body = await xmlParser.parseStringPromise(rawBody.toString(encoding));
			} else if (contentType === 'application/x-www-form-urlencoded') {
				req.body = (0, querystring_1.parse)(rawBody.toString(encoding), undefined, undefined, {
					maxKeys: 1000,
				});
			} else if (contentType === 'text/plain') {
				req.body = rawBody.toString(encoding);
			}
		} catch (error) {
			throw new unprocessable_error_1.UnprocessableRequestError(
				'Failed to parse request body',
				error.message,
			);
		}
	}
};
exports.parseBody = parseBody;
const bodyParser = async (req, _res, next) => {
	await (0, exports.parseBody)(req);
	if (!req.body) req.body = {};
	next();
};
exports.bodyParser = bodyParser;
//# sourceMappingURL=body-parser.js.map
