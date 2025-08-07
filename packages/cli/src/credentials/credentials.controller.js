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
exports.CredentialsController = void 0;
const api_types_1 = require('@n8n/api-types');
const backend_common_1 = require('@n8n/backend-common');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const typeorm_1 = require('@n8n/typeorm');
const n8n_workflow_1 = require('n8n-workflow');
const zod_1 = require('zod');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const forbidden_error_1 = require('@/errors/response-errors/forbidden.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const event_service_1 = require('@/events/event.service');
const license_1 = require('@/license');
const middlewares_1 = require('@/middlewares');
const naming_service_1 = require('@/services/naming.service');
const email_1 = require('@/user-management/email');
const utils = __importStar(require('@/utils'));
const credentials_finder_service_1 = require('./credentials-finder.service');
const credentials_service_1 = require('./credentials.service');
const credentials_service_ee_1 = require('./credentials.service.ee');
let CredentialsController = class CredentialsController {
	constructor(
		globalConfig,
		credentialsService,
		enterpriseCredentialsService,
		namingService,
		license,
		logger,
		userManagementMailer,
		sharedCredentialsRepository,
		projectRelationRepository,
		eventService,
		credentialsFinderService,
	) {
		this.globalConfig = globalConfig;
		this.credentialsService = credentialsService;
		this.enterpriseCredentialsService = enterpriseCredentialsService;
		this.namingService = namingService;
		this.license = license;
		this.logger = logger;
		this.userManagementMailer = userManagementMailer;
		this.sharedCredentialsRepository = sharedCredentialsRepository;
		this.projectRelationRepository = projectRelationRepository;
		this.eventService = eventService;
		this.credentialsFinderService = credentialsFinderService;
	}
	async getMany(req, _res, query) {
		const credentials = await this.credentialsService.getMany(req.user, {
			listQueryOptions: req.listQueryOptions,
			includeScopes: query.includeScopes,
			includeData: query.includeData,
			onlySharedWithMe: query.onlySharedWithMe,
		});
		credentials.forEach((c) => {
			delete c.shared;
		});
		return credentials;
	}
	async getProjectCredentials(req) {
		const options = zod_1.z
			.union([
				zod_1.z.object({ workflowId: zod_1.z.string() }),
				zod_1.z.object({ projectId: zod_1.z.string() }),
			])
			.parse(req.query);
		return await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(req.user, options);
	}
	async generateUniqueName(_req, _res, query) {
		const requestedName = query.name ?? this.globalConfig.credentials.defaultName;
		return {
			name: await this.namingService.getUniqueCredentialName(requestedName),
		};
	}
	async getOne(req, _res, credentialId, query) {
		const { shared, ...credential } = this.license.isSharingEnabled()
			? await this.enterpriseCredentialsService.getOne(req.user, credentialId, query.includeData)
			: await this.credentialsService.getOne(req.user, credentialId, query.includeData);
		const scopes = await this.credentialsService.getCredentialScopes(
			req.user,
			req.params.credentialId,
		);
		return { ...credential, scopes };
	}
	async testCredentials(req) {
		const { credentials } = req.body;
		const storedCredential = await this.credentialsFinderService.findCredentialForUser(
			credentials.id,
			req.user,
			['credential:read'],
		);
		if (!storedCredential) {
			throw new forbidden_error_1.ForbiddenError();
		}
		const mergedCredentials = (0, n8n_workflow_1.deepCopy)(credentials);
		const decryptedData = this.credentialsService.decrypt(storedCredential, true);
		await this.credentialsService.replaceCredentialContentsForSharee(
			req.user,
			storedCredential,
			decryptedData,
			mergedCredentials,
		);
		if (mergedCredentials.data) {
			mergedCredentials.data = this.credentialsService.unredact(
				mergedCredentials.data,
				decryptedData,
			);
		}
		return await this.credentialsService.test(req.user.id, mergedCredentials);
	}
	async validateCredentials(req) {
		const { credentialId, includeConnectionTest = true, includeFieldValidation = true } = req.body;
		if (!credentialId) {
			throw new bad_request_error_1.BadRequestError('Credential ID is required');
		}
		this.logger.debug('Credential validation requested', {
			credentialId,
			userId: req.user.id,
			includeConnectionTest,
			includeFieldValidation,
		});
		try {
			const storedCredential = await this.credentialsFinderService.findCredentialForUser(
				credentialId,
				req.user,
				['credential:read'],
			);
			if (!storedCredential) {
				throw new not_found_error_1.NotFoundError('Credential not found or access denied');
			}
			const decryptedData = this.credentialsService.decrypt(storedCredential, true);
			const result = {
				valid: true,
				credentialId,
				credentialType: storedCredential.type,
				credentialName: storedCredential.name,
				validationResults: {
					fieldValidation: null,
					connectionTest: null,
				},
				issues: [],
				lastTested: new Date(),
			};
			if (includeFieldValidation) {
				try {
					const fieldValidation = await this.credentialsService.validateCredentialFields(
						storedCredential.type,
						decryptedData,
					);
					result.validationResults.fieldValidation = fieldValidation;
					if (!fieldValidation.valid) {
						result.valid = false;
						result.issues.push(
							...fieldValidation.issues.map((issue) => ({
								type: 'field',
								severity: issue.severity,
								message: issue.message,
								field: issue.field,
								suggestion: issue.suggestion,
							})),
						);
					}
				} catch (error) {
					result.issues.push({
						type: 'field',
						severity: 'error',
						message: `Field validation failed: ${error instanceof Error ? error.message : String(error)}`,
					});
					result.valid = false;
				}
			}
			if (includeConnectionTest) {
				try {
					const connectionTest = await this.credentialsService.test(req.user.id, {
						id: storedCredential.id,
						name: storedCredential.name,
						type: storedCredential.type,
						data: decryptedData,
					});
					result.validationResults.connectionTest = connectionTest;
					if (connectionTest.status !== 'OK') {
						result.valid = false;
						result.issues.push({
							type: 'connection',
							severity: 'error',
							message: connectionTest.message || 'Connection test failed',
							suggestion: 'Check credential values and network connectivity',
						});
					}
				} catch (error) {
					result.issues.push({
						type: 'connection',
						severity: 'error',
						message: `Connection test failed: ${error instanceof Error ? error.message : String(error)}`,
						suggestion: 'Verify credential configuration and try again',
					});
					result.valid = false;
				}
			}
			this.logger.debug('Credential validation completed', {
				credentialId,
				userId: req.user.id,
				valid: result.valid,
				issuesCount: result.issues.length,
			});
			return result;
		} catch (error) {
			this.logger.error('Credential validation failed', {
				credentialId,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof not_found_error_1.NotFoundError ||
				error instanceof forbidden_error_1.ForbiddenError
			) {
				throw error;
			}
			throw new bad_request_error_1.BadRequestError(
				`Credential validation failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async troubleshootCredentials(req) {
		const {
			credentialId,
			includeConnectionDiagnostics = true,
			includeFieldAnalysis = true,
			includeUsageHistory = false,
		} = req.body;
		if (!credentialId) {
			throw new bad_request_error_1.BadRequestError('Credential ID is required');
		}
		this.logger.debug('Credential troubleshooting requested', {
			credentialId,
			userId: req.user.id,
			includeConnectionDiagnostics,
			includeFieldAnalysis,
			includeUsageHistory,
		});
		try {
			const storedCredential = await this.credentialsFinderService.findCredentialForUser(
				credentialId,
				req.user,
				['credential:read'],
			);
			if (!storedCredential) {
				throw new not_found_error_1.NotFoundError('Credential not found or access denied');
			}
			const decryptedData = this.credentialsService.decrypt(storedCredential, true);
			const troubleshootingResult = {
				credentialId,
				credentialType: storedCredential.type,
				credentialName: storedCredential.name,
				diagnostics: {
					fieldAnalysis: null,
					connectionDiagnostics: null,
					usageHistory: null,
				},
				recommendations: [],
				troubleshootingSteps: [],
				analyzedAt: new Date(),
			};
			if (includeFieldAnalysis) {
				troubleshootingResult.diagnostics.fieldAnalysis =
					await this.credentialsService.analyzeCredentialFields(
						storedCredential.type,
						decryptedData,
					);
			}
			if (includeConnectionDiagnostics) {
				troubleshootingResult.diagnostics.connectionDiagnostics =
					await this.credentialsService.diagnoseConnection(req.user.id, {
						id: storedCredential.id,
						name: storedCredential.name,
						type: storedCredential.type,
						data: decryptedData,
					});
			}
			if (includeUsageHistory) {
				troubleshootingResult.diagnostics.usageHistory = {
					lastUsed: null,
					usageCount: 0,
					recentFailures: [],
					note: 'Usage history tracking not yet implemented',
				};
			}
			const recommendationsResult = await this.credentialsService.generateCredentialRecommendations(
				storedCredential.type,
				troubleshootingResult.diagnostics,
			);
			troubleshootingResult.recommendations = recommendationsResult.recommendations.map((rec) => ({
				type: rec.type,
				priority: rec.priority,
				title: rec.message,
				description: rec.message,
			}));
			const troubleshootingStepsResult = await this.credentialsService.generateTroubleshootingSteps(
				storedCredential.type,
				troubleshootingResult.diagnostics,
			);
			troubleshootingResult.troubleshootingSteps = troubleshootingStepsResult.steps.map((step) => ({
				step: step.step,
				title: step.title,
				description: step.description,
				completed: false,
			}));
			this.logger.debug('Credential troubleshooting completed', {
				credentialId,
				userId: req.user.id,
				recommendationsCount: troubleshootingResult.recommendations.length,
				troubleshootingStepsCount: troubleshootingResult.troubleshootingSteps.length,
			});
			return troubleshootingResult;
		} catch (error) {
			this.logger.error('Credential troubleshooting failed', {
				credentialId,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof not_found_error_1.NotFoundError ||
				error instanceof forbidden_error_1.ForbiddenError
			) {
				throw error;
			}
			throw new bad_request_error_1.BadRequestError(
				`Credential troubleshooting failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async healthCheckCredentials(req) {
		const { credentialIds, includePerformanceMetrics = false } = req.body;
		if (!credentialIds || !Array.isArray(credentialIds) || credentialIds.length === 0) {
			throw new bad_request_error_1.BadRequestError(
				'Credential IDs array is required and must not be empty',
			);
		}
		if (credentialIds.length > 20) {
			throw new bad_request_error_1.BadRequestError(
				'Maximum 20 credentials allowed per health check',
			);
		}
		this.logger.debug('Credential health check requested', {
			credentialIds,
			userId: req.user.id,
			credentialCount: credentialIds.length,
			includePerformanceMetrics,
		});
		const healthCheckResults = await Promise.allSettled(
			credentialIds.map(async (credentialId) => {
				const startTime = Date.now();
				try {
					const storedCredential = await this.credentialsFinderService.findCredentialForUser(
						credentialId,
						req.user,
						['credential:read'],
					);
					if (!storedCredential) {
						return {
							credentialId,
							status: 'error',
							message: 'Credential not found or access denied',
							executionTime: Date.now() - startTime,
						};
					}
					const decryptedData = this.credentialsService.decrypt(storedCredential, true);
					const testResult = await this.credentialsService.test(req.user.id, {
						id: storedCredential.id,
						name: storedCredential.name,
						type: storedCredential.type,
						data: decryptedData,
					});
					const executionTime = Date.now() - startTime;
					const isHealthy = testResult.status === 'OK';
					return {
						credentialId,
						credentialName: storedCredential.name,
						credentialType: storedCredential.type,
						status: isHealthy ? 'healthy' : 'unhealthy',
						message:
							testResult.message || (isHealthy ? 'Connection successful' : 'Connection failed'),
						executionTime,
						performanceMetrics: includePerformanceMetrics
							? {
									responseTime: executionTime,
									testType: 'connection',
									timestamp: new Date(),
								}
							: undefined,
					};
				} catch (error) {
					return {
						credentialId,
						status: 'error',
						message: error instanceof Error ? error.message : String(error),
						executionTime: Date.now() - startTime,
					};
				}
			}),
		);
		const results = healthCheckResults.map((result) =>
			result.status === 'fulfilled'
				? result.value
				: {
						credentialId: 'unknown',
						status: 'error',
						message: result.reason instanceof Error ? result.reason.message : String(result.reason),
						executionTime: 0,
					},
		);
		const summary = {
			total: credentialIds.length,
			healthy: results.filter((r) => r.status === 'healthy').length,
			unhealthy: results.filter((r) => r.status === 'unhealthy').length,
			errors: results.filter((r) => r.status === 'error').length,
			averageResponseTime: Math.round(
				results.reduce((sum, r) => sum + r.executionTime, 0) / results.length,
			),
		};
		this.logger.debug('Credential health check completed', {
			userId: req.user.id,
			summary,
		});
		return {
			summary,
			results,
			checkedAt: new Date(),
		};
	}
	async testCredentialById(req) {
		const { credentialId } = req.params;
		const { includeMetrics = false } = req.body;
		if (!credentialId) {
			throw new bad_request_error_1.BadRequestError('Credential ID is required');
		}
		this.logger.debug('Credential test by ID requested', {
			credentialId,
			userId: req.user.id,
			includeMetrics,
		});
		try {
			const storedCredential = await this.credentialsFinderService.findCredentialForUser(
				credentialId,
				req.user,
				['credential:read'],
			);
			if (!storedCredential) {
				throw new not_found_error_1.NotFoundError('Credential not found or access denied');
			}
			const startTime = Date.now();
			const decryptedData = this.credentialsService.decrypt(storedCredential, true);
			const testResult = await this.credentialsService.test(req.user.id, {
				id: storedCredential.id,
				name: storedCredential.name,
				type: storedCredential.type,
				data: decryptedData,
			});
			const executionTime = Date.now() - startTime;
			const result = {
				credentialId,
				credentialName: storedCredential.name,
				credentialType: storedCredential.type,
				success: testResult.status === 'OK',
				message:
					testResult.message ||
					(testResult.status === 'OK' ? 'Connection successful' : 'Connection failed'),
				testResult,
				testedAt: new Date(),
				metrics: includeMetrics
					? {
							executionTime,
							testType: 'connection',
							credentialType: storedCredential.type,
						}
					: undefined,
			};
			this.logger.debug('Credential test by ID completed', {
				credentialId,
				userId: req.user.id,
				success: result.success,
				executionTime,
			});
			return result;
		} catch (error) {
			this.logger.error('Credential test by ID failed', {
				credentialId,
				userId: req.user.id,
				error: error instanceof Error ? error.message : String(error),
			});
			if (
				error instanceof bad_request_error_1.BadRequestError ||
				error instanceof not_found_error_1.NotFoundError ||
				error instanceof forbidden_error_1.ForbiddenError
			) {
				throw error;
			}
			throw new bad_request_error_1.BadRequestError(
				`Credential test failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async createCredentials(req, _, payload) {
		const newCredential = await this.credentialsService.createUnmanagedCredential(
			payload,
			req.user,
		);
		const project = await this.sharedCredentialsRepository.findCredentialOwningProject(
			newCredential.id,
		);
		this.eventService.emit('credentials-created', {
			user: req.user,
			credentialType: newCredential.type,
			credentialId: newCredential.id,
			publicApi: false,
			projectId: project?.id,
			projectType: project?.type,
		});
		return newCredential;
	}
	async updateCredentials(req) {
		const {
			body,
			user,
			params: { credentialId },
		} = req;
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			user,
			['credential:update'],
		);
		if (!credential) {
			this.logger.info('Attempt to update credential blocked due to lack of permissions', {
				credentialId,
				userId: user.id,
			});
			throw new not_found_error_1.NotFoundError(
				'Credential to be updated not found. You can only update credentials owned by you',
			);
		}
		if (credential.isManaged) {
			throw new bad_request_error_1.BadRequestError('Managed credentials cannot be updated');
		}
		const decryptedData = this.credentialsService.decrypt(credential, true);
		delete body.data?.oauthTokenData;
		const preparedCredentialData = await this.credentialsService.prepareUpdateData(
			req.body,
			decryptedData,
		);
		const newCredentialData = this.credentialsService.createEncryptedData({
			id: credential.id,
			name: preparedCredentialData.name,
			type: preparedCredentialData.type,
			data: preparedCredentialData.data,
		});
		const responseData = await this.credentialsService.update(credentialId, newCredentialData);
		if (responseData === null) {
			throw new not_found_error_1.NotFoundError(
				`Credential ID "${credentialId}" could not be found to be updated.`,
			);
		}
		const { data, shared, ...rest } = responseData;
		this.logger.debug('Credential updated', { credentialId });
		this.eventService.emit('credentials-updated', {
			user: req.user,
			credentialType: credential.type,
			credentialId: credential.id,
		});
		const scopes = await this.credentialsService.getCredentialScopes(req.user, credential.id);
		return { ...rest, scopes };
	}
	async deleteCredentials(req) {
		const { credentialId } = req.params;
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			req.user,
			['credential:delete'],
		);
		if (!credential) {
			this.logger.info('Attempt to delete credential blocked due to lack of permissions', {
				credentialId,
				userId: req.user.id,
			});
			throw new not_found_error_1.NotFoundError(
				'Credential to be deleted not found. You can only removed credentials owned by you',
			);
		}
		await this.credentialsService.delete(req.user, credential.id);
		this.eventService.emit('credentials-deleted', {
			user: req.user,
			credentialType: credential.type,
			credentialId: credential.id,
		});
		return true;
	}
	async shareCredentials(req) {
		const { credentialId } = req.params;
		const { shareWithIds } = req.body;
		if (
			!Array.isArray(shareWithIds) ||
			!shareWithIds.every((userId) => typeof userId === 'string')
		) {
			throw new bad_request_error_1.BadRequestError('Bad request');
		}
		const credential = await this.credentialsFinderService.findCredentialForUser(
			credentialId,
			req.user,
			['credential:share'],
		);
		if (!credential) {
			throw new forbidden_error_1.ForbiddenError();
		}
		let amountRemoved = null;
		let newShareeIds = [];
		const { manager: dbManager } = this.sharedCredentialsRepository;
		await dbManager.transaction(async (trx) => {
			const currentProjectIds = credential.shared
				.filter((sc) => sc.role === 'credential:user')
				.map((sc) => sc.projectId);
			const newProjectIds = shareWithIds;
			const toShare = utils.rightDiff([currentProjectIds, (id) => id], [newProjectIds, (id) => id]);
			const toUnshare = utils.rightDiff(
				[newProjectIds, (id) => id],
				[currentProjectIds, (id) => id],
			);
			const deleteResult = await trx.delete(db_1.SharedCredentials, {
				credentialsId: credentialId,
				projectId: (0, typeorm_1.In)(toUnshare),
			});
			await this.enterpriseCredentialsService.shareWithProjects(
				req.user,
				credential.id,
				toShare,
				trx,
			);
			if (deleteResult.affected) {
				amountRemoved = deleteResult.affected;
			}
			newShareeIds = toShare;
		});
		this.eventService.emit('credentials-shared', {
			user: req.user,
			credentialType: credential.type,
			credentialId: credential.id,
			userIdSharer: req.user.id,
			userIdsShareesAdded: newShareeIds,
			shareesRemoved: amountRemoved,
		});
		const projectsRelations = await this.projectRelationRepository.findBy({
			projectId: (0, typeorm_1.In)(newShareeIds),
			role: 'project:personalOwner',
		});
		await this.userManagementMailer.notifyCredentialsShared({
			sharer: req.user,
			newShareeIds: projectsRelations.map((pr) => pr.userId),
			credentialsName: credential.name,
		});
	}
	async transfer(req) {
		const body = zod_1.z.object({ destinationProjectId: zod_1.z.string() }).parse(req.body);
		return await this.enterpriseCredentialsService.transferOne(
			req.user,
			req.params.credentialId,
			body.destinationProjectId,
		);
	}
};
exports.CredentialsController = CredentialsController;
__decorate(
	[
		(0, decorators_1.Get)('/', { middlewares: middlewares_1.listQueryMiddleware }),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Object, api_types_1.CredentialsGetManyRequestQuery]),
		__metadata('design:returntype', Promise),
	],
	CredentialsController.prototype,
	'getMany',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/for-workflow'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	CredentialsController.prototype,
	'getProjectCredentials',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/new'),
		__param(2, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [
			Object,
			Object,
			api_types_1.GenerateCredentialNameRequestQuery,
		]),
		__metadata('design:returntype', Promise),
	],
	CredentialsController.prototype,
	'generateUniqueName',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/:credentialId'),
		(0, decorators_1.ProjectScope)('credential:read'),
		__param(2, (0, decorators_1.Param)('credentialId')),
		__param(3, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [
			Object,
			Object,
			String,
			api_types_1.CredentialsGetOneRequestQuery,
		]),
		__metadata('design:returntype', Promise),
	],
	CredentialsController.prototype,
	'getOne',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/test'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	CredentialsController.prototype,
	'testCredentials',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/validate'),
		(0, decorators_1.ProjectScope)('credential:read'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	CredentialsController.prototype,
	'validateCredentials',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/troubleshoot'),
		(0, decorators_1.ProjectScope)('credential:read'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	CredentialsController.prototype,
	'troubleshootCredentials',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/health-check'),
		(0, decorators_1.ProjectScope)('credential:read'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	CredentialsController.prototype,
	'healthCheckCredentials',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/:credentialId/test'),
		(0, decorators_1.ProjectScope)('credential:read'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	CredentialsController.prototype,
	'testCredentialById',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/'),
		__param(2, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, Response, api_types_1.CreateCredentialDto]),
		__metadata('design:returntype', Promise),
	],
	CredentialsController.prototype,
	'createCredentials',
	null,
);
__decorate(
	[
		(0, decorators_1.Patch)('/:credentialId'),
		(0, decorators_1.ProjectScope)('credential:update'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	CredentialsController.prototype,
	'updateCredentials',
	null,
);
__decorate(
	[
		(0, decorators_1.Delete)('/:credentialId'),
		(0, decorators_1.ProjectScope)('credential:delete'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	CredentialsController.prototype,
	'deleteCredentials',
	null,
);
__decorate(
	[
		(0, decorators_1.Licensed)('feat:sharing'),
		(0, decorators_1.Put)('/:credentialId/share'),
		(0, decorators_1.ProjectScope)('credential:share'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	CredentialsController.prototype,
	'shareCredentials',
	null,
);
__decorate(
	[
		(0, decorators_1.Put)('/:credentialId/transfer'),
		(0, decorators_1.ProjectScope)('credential:move'),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object]),
		__metadata('design:returntype', Promise),
	],
	CredentialsController.prototype,
	'transfer',
	null,
);
exports.CredentialsController = CredentialsController = __decorate(
	[
		(0, decorators_1.RestController)('/credentials'),
		__metadata('design:paramtypes', [
			config_1.GlobalConfig,
			credentials_service_1.CredentialsService,
			credentials_service_ee_1.EnterpriseCredentialsService,
			naming_service_1.NamingService,
			license_1.License,
			backend_common_1.Logger,
			email_1.UserManagementMailer,
			db_1.SharedCredentialsRepository,
			db_1.ProjectRelationRepository,
			event_service_1.EventService,
			credentials_finder_service_1.CredentialsFinderService,
		]),
	],
	CredentialsController,
);
//# sourceMappingURL=credentials.controller.js.map
