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
exports.sortByQueryMiddleware = void 0;
const class_transformer_1 = require('class-transformer');
const class_validator_1 = require('class-validator');
const n8n_workflow_1 = require('n8n-workflow');
const ResponseHelper = __importStar(require('@/response-helper'));
const utils_1 = require('@/utils');
const workflow_sort_by_dto_1 = require('./dtos/workflow.sort-by.dto');
const sortByQueryMiddleware = (req, res, next) => {
	const { sortBy } = req.query;
	if (!sortBy) return next();
	let SortBy;
	try {
		if (req.baseUrl.endsWith('workflows')) {
			SortBy = workflow_sort_by_dto_1.WorkflowSorting;
		} else {
			return next();
		}
		const validationResponse = (0, class_validator_1.validateSync)(
			(0, class_transformer_1.plainToInstance)(SortBy, { sortBy }),
		);
		if (validationResponse.length) {
			const validationError = validationResponse[0];
			throw new n8n_workflow_1.UnexpectedError(validationError.constraints?.workflowSortBy ?? '');
		}
		req.listQueryOptions = { ...req.listQueryOptions, sortBy };
		next();
	} catch (maybeError) {
		ResponseHelper.sendErrorResponse(res, (0, utils_1.toError)(maybeError));
	}
};
exports.sortByQueryMiddleware = sortByQueryMiddleware;
//# sourceMappingURL=sort-by.js.map
