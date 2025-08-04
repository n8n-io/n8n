'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __param =
	(this && this.__param) ||
	function (paramIndex, decorator) {
		return function (target, key) {
			decorator(target, key, paramIndex);
		};
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.BinaryDataController = void 0;
const api_types_1 = require('@n8n/api-types');
const decorators_1 = require('@n8n/decorators');
const jsonwebtoken_1 = require('jsonwebtoken');
const n8n_core_1 = require('n8n-core');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
let BinaryDataController = class BinaryDataController {
	constructor(binaryDataService) {
		this.binaryDataService = binaryDataService;
	}
	async get(_, res, { id: binaryDataId, action, fileName, mimeType }) {
		try {
			this.validateBinaryDataId(binaryDataId);
			await this.setContentHeaders(binaryDataId, action, res, fileName, mimeType);
			return await this.binaryDataService.getAsStream(binaryDataId);
		} catch (error) {
			if (error instanceof n8n_core_1.FileNotFoundError) return res.status(404).end();
			if (error instanceof bad_request_error_1.BadRequestError)
				return res.status(400).end(error.message);
			else throw error;
		}
	}
	async getSigned(_, res, { token }) {
		try {
			const binaryDataId = this.binaryDataService.validateSignedToken(token);
			this.validateBinaryDataId(binaryDataId);
			await this.setContentHeaders(binaryDataId, 'download', res);
			return await this.binaryDataService.getAsStream(binaryDataId);
		} catch (error) {
			if (error instanceof n8n_core_1.FileNotFoundError) return res.status(404).end();
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof jsonwebtoken_1.JsonWebTokenError
			)
				return res.status(400).end(error.message);
			else throw error;
		}
	}
	validateBinaryDataId(binaryDataId) {
		if (!binaryDataId) {
			throw new bad_request_error_1.BadRequestError('Missing binary data ID');
		}
		const separatorIndex = binaryDataId.indexOf(':');
		if (separatorIndex === -1) {
			throw new bad_request_error_1.BadRequestError('Malformed binary data ID');
		}
		const mode = binaryDataId.substring(0, separatorIndex);
		if (!(0, n8n_core_1.isValidNonDefaultMode)(mode)) {
			throw new bad_request_error_1.BadRequestError('Invalid binary data mode');
		}
		const path = binaryDataId.substring(separatorIndex + 1);
		if (path === '' || path === '/' || path === '//') {
			throw new bad_request_error_1.BadRequestError('Malformed binary data ID');
		}
	}
	async setContentHeaders(binaryDataId, action, res, fileName, mimeType) {
		try {
			const metadata = await this.binaryDataService.getMetadata(binaryDataId);
			fileName = metadata.fileName ?? fileName;
			mimeType = metadata.mimeType ?? mimeType;
			res.setHeader('Content-Length', metadata.fileSize);
		} catch {}
		if (
			action === 'view' &&
			(!mimeType || !api_types_1.ViewableMimeTypes.includes(mimeType.toLowerCase()))
		) {
			throw new bad_request_error_1.BadRequestError('Content not viewable');
		}
		if (mimeType) {
			res.setHeader('Content-Type', mimeType);
		}
		if (action === 'download' && fileName) {
			const encodedFilename = encodeURIComponent(fileName);
			res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"`);
		}
	}
};
exports.BinaryDataController = BinaryDataController;
__decorate(
	[
		(0, decorators_1.Get)('/'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.BinaryDataQueryDto]),
		__metadata('design:returntype', Promise),
	],
	BinaryDataController.prototype,
	'get',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/signed', { skipAuth: true }),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.BinaryDataSignedQueryDto]),
		__metadata('design:returntype', Promise),
	],
	BinaryDataController.prototype,
	'getSigned',
	null,
);
exports.BinaryDataController = BinaryDataController = __decorate(
	[
		(0, decorators_1.RestController)('/binary-data'),
		__metadata('design:paramtypes', [n8n_core_1.BinaryDataService]),
	],
	BinaryDataController,
);
//# sourceMappingURL=binary-data.controller.js.map
