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
exports.filterListQueryMiddleware = void 0;
const ResponseHelper = __importStar(require('@/response-helper'));
const utils_1 = require('@/utils');
const credentials_filter_dto_1 = require('./dtos/credentials.filter.dto');
const user_filter_dto_1 = require('./dtos/user.filter.dto');
const workflow_filter_dto_1 = require('./dtos/workflow.filter.dto');
const filterListQueryMiddleware = async (req, res, next) => {
	const { filter: rawFilter } = req.query;
	if (!rawFilter) return next();
	let Filter;
	if (req.baseUrl.endsWith('workflows')) {
		Filter = workflow_filter_dto_1.WorkflowFilter;
	} else if (req.baseUrl.endsWith('credentials')) {
		Filter = credentials_filter_dto_1.CredentialsFilter;
	} else if (req.baseUrl.endsWith('users')) {
		Filter = user_filter_dto_1.UserFilter;
	} else {
		return next();
	}
	try {
		const filter = await Filter.fromString(rawFilter);
		if (Object.keys(filter).length === 0) return next();
		req.listQueryOptions = { ...req.listQueryOptions, filter };
		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, (0, utils_1.toError)(maybeError));
	}
};
exports.filterListQueryMiddleware = filterListQueryMiddleware;
//# sourceMappingURL=filter.js.map
