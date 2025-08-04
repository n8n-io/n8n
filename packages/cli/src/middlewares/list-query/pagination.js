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
exports.paginationListQueryMiddleware = void 0;
const n8n_workflow_1 = require('n8n-workflow');
const ResponseHelper = __importStar(require('@/response-helper'));
const utils_1 = require('@/utils');
const pagination_dto_1 = require('./dtos/pagination.dto');
const paginationListQueryMiddleware = (req, res, next) => {
	const { take: rawTake, skip: rawSkip = '0' } = req.query;
	try {
		if (!rawTake && req.query.skip) {
			throw new n8n_workflow_1.UnexpectedError('Please specify `take` when using `skip`');
		}
		if (!rawTake) return next();
		const { take, skip } = pagination_dto_1.Pagination.fromString(rawTake, rawSkip);
		req.listQueryOptions = { ...req.listQueryOptions, skip, take };
		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, (0, utils_1.toError)(maybeError));
	}
};
exports.paginationListQueryMiddleware = paginationListQueryMiddleware;
//# sourceMappingURL=pagination.js.map
