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
exports.selectListQueryMiddleware = void 0;
const ResponseHelper = __importStar(require('@/response-helper'));
const utils_1 = require('@/utils');
const credentials_select_dto_1 = require('./dtos/credentials.select.dto');
const user_select_dto_1 = require('./dtos/user.select.dto');
const workflow_select_dto_1 = require('./dtos/workflow.select.dto');
const selectListQueryMiddleware = (req, res, next) => {
	const { select: rawSelect } = req.query;
	if (!rawSelect) return next();
	let Select;
	if (req.baseUrl.endsWith('workflows')) {
		Select = workflow_select_dto_1.WorkflowSelect;
	} else if (req.baseUrl.endsWith('credentials')) {
		Select = credentials_select_dto_1.CredentialsSelect;
	} else if (req.baseUrl.endsWith('users')) {
		Select = user_select_dto_1.UserSelect;
	} else {
		return next();
	}
	try {
		const select = Select.fromString(rawSelect);
		if (Object.keys(select).length === 0) return next();
		req.listQueryOptions = { ...req.listQueryOptions, select };
		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, (0, utils_1.toError)(maybeError));
	}
};
exports.selectListQueryMiddleware = selectListQueryMiddleware;
//# sourceMappingURL=select.js.map
