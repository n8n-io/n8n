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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.BinaryDataController = void 0;
const api_types_1 = require('@n8n/api-types');
const decorators_1 = require('@n8n/decorators');
const jsonwebtoken_1 = require('jsonwebtoken');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const multer_1 = __importDefault(require('multer'));
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const binary_data_service_1 = require('@/services/binary-data.service');
const binary_migration_service_1 = require('@/services/binary-migration.service');
const binary_export_service_1 = require('@/services/binary-export.service');
const upload = (0, multer_1.default)({
	storage: multer_1.default.memoryStorage(),
	limits: {
		fileSize: 100 * 1024 * 1024,
		files: 1,
	},
});
let BinaryDataController = class BinaryDataController {
	constructor(
		binaryDataService,
		coreBinaryDataService,
		binaryMigrationService,
		binaryExportService,
	) {
		this.binaryDataService = binaryDataService;
		this.coreBinaryDataService = coreBinaryDataService;
		this.binaryMigrationService = binaryMigrationService;
		this.binaryExportService = binaryExportService;
	}
	async get(_, res, payload) {
		try {
			const { id: binaryDataId, action, fileName, mimeType } = payload;
			this.validateBinaryDataId(binaryDataId);
			await this.setContentHeaders(binaryDataId, action, res, fileName, mimeType);
			return await this.binaryDataService.getBinaryDataStream(binaryDataId);
		} catch (error) {
			if (error instanceof n8n_core_1.FileNotFoundError) return res.status(404).end();
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).end(error.message);
			} else throw error;
		}
	}
	async getSigned(_, res, payload) {
		try {
			const binaryDataId = this.binaryDataService.validateSignedToken(payload.token);
			this.validateBinaryDataId(binaryDataId);
			await this.setContentHeaders(binaryDataId, 'download', res);
			return await this.binaryDataService.getBinaryDataStream(binaryDataId);
		} catch (error) {
			if (error instanceof n8n_core_1.FileNotFoundError) return res.status(404).end();
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof jsonwebtoken_1.JsonWebTokenError ||
				error instanceof n8n_workflow_1.ApplicationError
			)
				return res.status(400).end(error.message);
			else throw error;
		}
	}
	async upload(req, res, payload) {
		return new Promise((resolve, reject) => {
			upload.single('file')(req, res, async (uploadError) => {
				if (uploadError) {
					if (uploadError instanceof multer_1.default.MulterError) {
						if (uploadError.code === 'LIMIT_FILE_SIZE') {
							return res.status(413).json({ error: 'File too large (max 100MB)' });
						}
						return res.status(400).json({ error: uploadError.message });
					}
					return reject(uploadError);
				}
				if (!req.file) {
					return res.status(400).json({ error: 'No file uploaded' });
				}
				try {
					const metadata = await this.binaryDataService.uploadBinaryData(req.file.buffer, {
						fileName: payload.fileName || req.file.originalname,
						mimeType: payload.mimeType || req.file.mimetype,
						workflowId: payload.workflowId,
						executionId: payload.executionId,
					});
					resolve(
						res.status(201).json({
							success: true,
							data: metadata,
						}),
					);
				} catch (error) {
					if (error instanceof n8n_workflow_1.ApplicationError) {
						return res.status(400).json({ error: error.message });
					}
					reject(error);
				}
			});
		});
	}
	async download(_, res, binaryDataId) {
		try {
			if (!binaryDataId) {
				return res.status(400).json({ error: 'Binary data ID is required' });
			}
			this.validateBinaryDataId(binaryDataId);
			await this.setContentHeaders(binaryDataId, 'download', res);
			return await this.binaryDataService.getBinaryDataStream(binaryDataId);
		} catch (error) {
			if (error instanceof n8n_core_1.FileNotFoundError) return res.status(404).end();
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).end(error.message);
			} else throw error;
		}
	}
	async delete(_, res, binaryDataId) {
		try {
			if (!binaryDataId) {
				return res.status(400).json({ error: 'Binary data ID is required' });
			}
			this.validateBinaryDataId(binaryDataId);
			await this.binaryDataService.deleteBinaryData(binaryDataId);
			return res.status(200).json({
				success: true,
				message: 'Binary data deleted successfully',
				id: binaryDataId,
			});
		} catch (error) {
			if (error instanceof n8n_core_1.FileNotFoundError) {
				return res.status(404).json({ error: 'Binary data not found' });
			}
			if (
				error instanceof n8n_workflow_1.ApplicationError ||
				error instanceof bad_request_error_1.BadRequestError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw error;
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
			const metadata = await this.binaryDataService.getBinaryDataMetadata(binaryDataId);
			fileName = metadata.fileName ?? fileName;
			mimeType = metadata.mimeType ?? mimeType;
			if (metadata.fileSize && typeof metadata.fileSize === 'number') {
				res.setHeader('Content-Length', metadata.fileSize);
			}
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
	async bulkExport(req, res, request) {
		try {
			if (
				!request.workflowIds?.length &&
				!request.executionIds?.length &&
				!request.binaryDataIds?.length
			) {
				return res.status(400).json({
					error: 'At least one of workflowIds, executionIds, or binaryDataIds must be provided',
				});
			}
			const result = await this.binaryExportService.bulkExportBinaryData(req.user, request);
			return res.status(201).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Bulk export operation failed');
		}
	}
	async bulkImport(req, res, request) {
		try {
			if (!request.exportPath && !request.exportData) {
				return res.status(400).json({
					error: 'Either exportPath or exportData must be provided',
				});
			}
			const result = await this.binaryMigrationService.importBinaryData(req.user, request);
			return res.status(201).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Bulk import operation failed');
		}
	}
	async crossInstanceTransfer(req, res, request) {
		try {
			if (!request.targetInstanceUrl) {
				return res.status(400).json({
					error: 'Target instance URL is required',
				});
			}
			if (!request.binaryDataIds?.length) {
				return res.status(400).json({
					error: 'At least one binary data ID must be provided',
				});
			}
			if (
				!request.targetApiKey &&
				!request.targetAuthToken &&
				!(request.targetUsername && request.targetPassword)
			) {
				return res.status(400).json({
					error:
						'Target instance authentication is required (apiKey, authToken, or username/password)',
				});
			}
			const result = await this.binaryMigrationService.transferToInstance(req.user, request);
			return res.status(201).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Cross-instance transfer failed');
		}
	}
	async validateIntegrity(req, res, request) {
		try {
			if (!request.binaryDataIds?.length) {
				return res.status(400).json({
					error: 'At least one binary data ID must be provided',
				});
			}
			const result = await this.binaryMigrationService.validateBinaryIntegrity(
				req.user,
				request.binaryDataIds,
			);
			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Integrity validation failed');
		}
	}
	async cleanupOrphaned(req, res) {
		try {
			const result = await this.binaryMigrationService.cleanupOrphanedBinaryData(req.user);
			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Cleanup operation failed');
		}
	}
	async createWorkflowPackage(req, res, request) {
		try {
			if (!request.workflowId) {
				return res.status(400).json({
					error: 'Workflow ID is required',
				});
			}
			const result = await this.binaryExportService.createWorkflowPackage(req.user, request);
			return res.status(201).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Workflow package creation failed');
		}
	}
	async searchBinaryData(req, res, request) {
		try {
			const result = await this.binaryExportService.searchBinaryData(req.user, request);
			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Binary data search failed');
		}
	}
	async getOperationProgress(req, res, operationId) {
		try {
			if (!operationId) {
				return res.status(400).json({
					error: 'Operation ID is required',
				});
			}
			const result = await this.binaryExportService.getOperationProgress(operationId);
			if (!result) {
				return res.status(404).json({
					error: 'Operation not found',
				});
			}
			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Failed to get operation progress');
		}
	}
	async listActiveOperations(req, res) {
		try {
			const result = await this.binaryExportService.listActiveOperations(req.user);
			return res.status(200).json({
				success: true,
				data: {
					operations: result,
					total: result.length,
				},
			});
		} catch (error) {
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Failed to list active operations');
		}
	}
	async cancelOperation(req, res, operationId) {
		try {
			if (!operationId) {
				return res.status(400).json({
					error: 'Operation ID is required',
				});
			}
			const result = await this.binaryExportService.cancelOperation(req.user, operationId);
			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof n8n_workflow_1.ApplicationError
			) {
				return res.status(400).json({ error: error.message });
			}
			throw new internal_server_error_1.InternalServerError('Failed to cancel operation');
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
__decorate(
	[
		(0, decorators_1.Post)('/upload'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.BinaryDataUploadDto]),
		__metadata('design:returntype', Promise),
	],
	BinaryDataController.prototype,
	'upload',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:id/download'),
		__param(2, (0, decorators_1.Param)('id')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	BinaryDataController.prototype,
	'download',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/:id'),
		__param(2, (0, decorators_1.Param)('id')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	BinaryDataController.prototype,
	'delete',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/bulk/export'),
		(0, decorators_1.GlobalScope)('instance:read'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	BinaryDataController.prototype,
	'bulkExport',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/bulk/import'),
		(0, decorators_1.GlobalScope)('instance:write'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	BinaryDataController.prototype,
	'bulkImport',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/migrate/transfer'),
		(0, decorators_1.GlobalScope)('instance:write'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	BinaryDataController.prototype,
	'crossInstanceTransfer',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/validate/integrity'),
		(0, decorators_1.GlobalScope)('instance:read'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	BinaryDataController.prototype,
	'validateIntegrity',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/cleanup/orphaned'),
		(0, decorators_1.GlobalScope)('instance:write'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	BinaryDataController.prototype,
	'cleanupOrphaned',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/workflow/package'),
		(0, decorators_1.GlobalScope)('workflow:read'),
		(0, decorators_1.Licensed)('feat:advancedPermissions'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	BinaryDataController.prototype,
	'createWorkflowPackage',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/search'),
		(0, decorators_1.GlobalScope)('instance:read'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, Object]),
		__metadata('design:returntype', Promise),
	],
	BinaryDataController.prototype,
	'searchBinaryData',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/operations/:operationId/progress'),
		(0, decorators_1.GlobalScope)('instance:read'),
		__param(2, (0, decorators_1.Param)('operationId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	BinaryDataController.prototype,
	'getOperationProgress',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/operations'),
		(0, decorators_1.GlobalScope)('instance:read'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object]),
		__metadata('design:returntype', Promise),
	],
	BinaryDataController.prototype,
	'listActiveOperations',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/operations/:operationId'),
		(0, decorators_1.GlobalScope)('instance:write'),
		__param(2, (0, decorators_1.Param)('operationId')),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, String]),
		__metadata('design:returntype', Promise),
	],
	BinaryDataController.prototype,
	'cancelOperation',
	null,
);
exports.BinaryDataController = BinaryDataController = __decorate(
	[
		(0, decorators_1.RestController)('/binary-data'),
		__metadata('design:paramtypes', [
			binary_data_service_1.BinaryDataService,
			n8n_core_1.BinaryDataService,
			binary_migration_service_1.BinaryMigrationService,
			binary_export_service_1.BinaryExportService,
		]),
	],
	BinaryDataController,
);
//# sourceMappingURL=binary-data.controller.js.map
