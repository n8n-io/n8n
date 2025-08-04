'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.isUniqueConstraintError = void 0;
exports.sendSuccessResponse = sendSuccessResponse;
exports.sendErrorResponse = sendErrorResponse;
exports.reportError = reportError;
exports.send = send;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const node_stream_1 = require('node:stream');
const picocolors_1 = __importDefault(require('picocolors'));
const response_error_1 = require('./errors/response-errors/abstract/response.error');
function sendSuccessResponse(res, data, raw, responseCode, responseHeader) {
	if (responseCode !== undefined) {
		res.status(responseCode);
	}
	if (responseHeader) {
		res.header(responseHeader);
	}
	if (data instanceof node_stream_1.Readable) {
		data.pipe(res);
		return;
	}
	if (raw === true) {
		if (typeof data === 'string') {
			res.send(data);
		} else {
			res.json(data);
		}
	} else {
		res.json({
			data,
		});
	}
}
function isResponseError(error) {
	if (error instanceof response_error_1.ResponseError) {
		return true;
	}
	if (error instanceof Error) {
		return (
			'httpStatusCode' in error &&
			typeof error.httpStatusCode === 'number' &&
			'errorCode' in error &&
			typeof error.errorCode === 'number'
		);
	}
	return false;
}
function sendErrorResponse(res, error) {
	let httpStatusCode = 500;
	const response = {
		code: 0,
		message: error.message ?? 'Unknown error',
	};
	if (isResponseError(error)) {
		if (backend_common_1.inDevelopment) {
			di_1.Container.get(backend_common_1.Logger).error(
				picocolors_1.default.red([error.httpStatusCode, error.message].join(' ')),
			);
		}
		const { originalUrl } = res.req;
		if (error.errorCode === 404 && originalUrl) {
			const basePath = originalUrl.split('/')[1];
			const isLegacyFormTrigger = originalUrl.includes(n8n_workflow_1.FORM_TRIGGER_PATH_IDENTIFIER);
			const isFormTrigger = basePath.includes('form');
			if (isFormTrigger || isLegacyFormTrigger) {
				const isTestWebhook = basePath.includes('test');
				res.status(404);
				return res.render('form-trigger-404', { isTestWebhook });
			}
		}
		if (error.errorCode === 409 && originalUrl && originalUrl.includes('form-waiting')) {
			return res.render('form-trigger-409', {
				message: error.message,
			});
		}
		httpStatusCode = error.httpStatusCode;
		if (error.errorCode) {
			response.code = error.errorCode;
		}
		if (error.hint) {
			response.hint = error.hint;
		}
	}
	if (error instanceof n8n_workflow_1.NodeApiError) {
		if (backend_common_1.inDevelopment) {
			di_1.Container.get(backend_common_1.Logger).error(
				[picocolors_1.default.red(error.name), error.message].join(' '),
			);
		}
		Object.assign(response, error);
	}
	if (error.stack && backend_common_1.inDevelopment) {
		response.stacktrace = error.stack;
	}
	res.status(httpStatusCode).json(response);
}
const isUniqueConstraintError = (error) =>
	['unique', 'duplicate'].some((s) => error.message.toLowerCase().includes(s));
exports.isUniqueConstraintError = isUniqueConstraintError;
function reportError(error) {
	if (!(error instanceof response_error_1.ResponseError) || error.httpStatusCode > 404) {
		di_1.Container.get(n8n_core_1.ErrorReporter).error(error);
	}
}
function send(processFunction, raw = false) {
	return async (req, res) => {
		try {
			const data = await processFunction(req, res);
			if (!res.headersSent) sendSuccessResponse(res, data, raw);
		} catch (error) {
			if (error instanceof Error) {
				reportError(error);
				if ((0, exports.isUniqueConstraintError)(error)) {
					error.message = 'There is already an entry with this name';
				}
			}
			sendErrorResponse(res, error);
		}
	};
}
//# sourceMappingURL=response-helper.js.map
