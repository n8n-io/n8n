'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
exports.parseRangeQuery = void 0;
const jsonschema_1 = require('jsonschema');
const n8n_workflow_1 = require('n8n-workflow');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const ResponseHelper = __importStar(require('@/response-helper'));
const execution_service_1 = require('./execution.service');
const isValid = (arg) =>
	(0, jsonschema_1.validate)(arg, execution_service_1.schemaGetExecutionsQueryFilter).valid;
const parseRangeQuery = (req, res, next) => {
	const { limit, firstId, lastId } = req.query;
	try {
		req.rangeQuery = {
			kind: 'range',
			range: { limit: limit ? Math.min(parseInt(limit, 10), 100) : 20 },
		};
		if (firstId) req.rangeQuery.range.firstId = firstId;
		if (lastId) req.rangeQuery.range.lastId = lastId;
		if (req.query.filter) {
			const jsonFilter = (0, n8n_workflow_1.jsonParse)(req.query.filter, {
				errorMessage: 'Failed to parse query string',
			});
			for (const key of Object.keys(jsonFilter)) {
				if (!execution_service_1.allowedExecutionsQueryFilterFields.includes(key))
					delete jsonFilter[key];
			}
			if (jsonFilter.waitTill) jsonFilter.waitTill = Boolean(jsonFilter.waitTill);
			if (!isValid(jsonFilter))
				throw new n8n_workflow_1.UnexpectedError('Query does not match schema');
			req.rangeQuery = { ...req.rangeQuery, ...jsonFilter };
		}
		next();
	} catch (error) {
		if (error instanceof Error) {
			ResponseHelper.sendErrorResponse(res, new bad_request_error_1.BadRequestError(error.message));
		}
	}
};
exports.parseRangeQuery = parseRangeQuery;
//# sourceMappingURL=parse-range-query.middleware.js.map
