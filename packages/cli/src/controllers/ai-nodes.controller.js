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
exports.AiNodesController = void 0;
const api_types_1 = require('@n8n/api-types');
const backend_common_1 = require('@n8n/backend-common');
const decorators_1 = require('@n8n/decorators');
const n8n_workflow_1 = require('n8n-workflow');
const uuid_1 = require('uuid');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const internal_server_error_1 = require('@/errors/response-errors/internal-server.error');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const node_types_1 = require('@/node-types');
let AiNodesController = class AiNodesController {
	constructor(logger, nodeTypes) {
		this.logger = logger;
		this.nodeTypes = nodeTypes;
	}
	async getAiNodeConfigurations(req, query) {
		const { nodeType, nodeVersion = 1, includeCredentials = false, includeModels = true } = query;
		this.logger.debug('AI node configuration requested', {
			userId: req.user.id,
			nodeType,
			includeCredentials,
			includeModels,
		});
		try {
			const aiNodeTypes = this.getAiNodeTypes(nodeType, nodeVersion);
			const configurations = await Promise.all(
				aiNodeTypes.map(async (nodeTypeInfo) => {
					const { description } = nodeTypeInfo;
					const config = {
						name: description.name,
						displayName: description.displayName,
						description: description.description,
						version: description.version,
						group: description.group,
						properties: description.properties || [],
						credentials: includeCredentials ? description.credentials || [] : undefined,
						models: includeModels ? await this.getAvailableModels(description) : undefined,
						supportsStreaming: this.supportsStreaming(description),
						supportsBatch: this.supportsBatch(description),
						memoryTypes: this.getMemoryTypes(description),
						defaultSettings: this.getDefaultSettings(description),
					};
					return config;
				}),
			);
			return {
				success: true,
				configurations,
				metadata: {
					totalCount: configurations.length,
					retrievedAt: new Date(),
					userId: req.user.id,
				},
			};
		} catch (error) {
			this.logger.error('Failed to retrieve AI node configurations', {
				userId: req.user.id,
				nodeType,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Failed to get AI node configurations: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async testPrompt(req, payload) {
		const {
			nodeType,
			nodeVersion = 1,
			prompt,
			configuration = {},
			model,
			temperature = 0.7,
			maxTokens,
		} = payload;
		this.logger.debug('AI prompt test requested', {
			userId: req.user.id,
			nodeType,
			promptLength: prompt.length,
			model,
			temperature,
		});
		try {
			const nodeTypeInstance = this.nodeTypes.getByNameAndVersion(nodeType, nodeVersion);
			if (!nodeTypeInstance) {
				throw new not_found_error_1.NotFoundError(
					`AI node type '${nodeType}' version ${nodeVersion} not found`,
				);
			}
			if (!this.isAiNode(nodeTypeInstance.description)) {
				throw new bad_request_error_1.BadRequestError(`Node type '${nodeType}' is not an AI node`);
			}
			const testConfiguration = {
				...configuration,
				prompt,
				model,
				temperature,
				...(maxTokens && { maxTokens }),
			};
			const nodeResult = [{ json: { message: 'AI node execution placeholder' } }];
			this.logger.debug('AI prompt test completed', {
				userId: req.user.id,
				nodeType,
				success: nodeResult ? true : false,
			});
			return {
				success: true,
				nodeType,
				nodeVersion,
				prompt,
				configuration: testConfiguration,
				result: {
					data: nodeResult,
					executionTime: 0,
					metadata: {
						testedAt: new Date(),
						model,
						temperature,
						promptLength: prompt.length,
						outputLength: nodeResult?.[0]?.json ? JSON.stringify(nodeResult[0].json).length : 0,
					},
				},
			};
		} catch (error) {
			this.logger.error('AI prompt test failed', {
				userId: req.user.id,
				nodeType,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Prompt test failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async configureMemory(req, payload) {
		const { type, configuration, sessionId } = payload;
		this.logger.debug('AI memory configuration requested', {
			userId: req.user.id,
			type,
			sessionId,
		});
		try {
			this.validateMemoryConfiguration(type, configuration);
			const memoryConfig = {
				id: (0, uuid_1.v4)(),
				type,
				configuration,
				sessionId: sessionId || (0, uuid_1.v4)(),
				createdBy: req.user.id,
				createdAt: new Date(),
				status: 'active',
			};
			return {
				success: true,
				memoryConfig,
				message: `${type} memory configured successfully`,
			};
		} catch (error) {
			this.logger.error('AI memory configuration failed', {
				userId: req.user.id,
				type,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Memory configuration failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	async retrieveMemory(req, query) {
		const { sessionId, type, limit = 10 } = query;
		this.logger.debug('AI memory retrieval requested', {
			userId: req.user.id,
			sessionId,
			type,
			limit,
		});
		try {
			const mockMemoryData = {
				sessionId,
				type,
				messages: Array.from({ length: Math.min(limit, 5) }, (_, index) => ({
					id: (0, uuid_1.v4)(),
					role: index % 2 === 0 ? 'user' : 'assistant',
					content: `Sample ${index % 2 === 0 ? 'user' : 'AI'} message ${index + 1}`,
					timestamp: new Date(Date.now() - (5 - index) * 60000),
				})),
				metadata: {
					totalMessages: 50,
					retrievedCount: Math.min(limit, 5),
					retrievedAt: new Date(),
				},
			};
			return {
				success: true,
				sessionId,
				type,
				data: mockMemoryData,
			};
		} catch (error) {
			this.logger.error('AI memory retrieval failed', {
				userId: req.user.id,
				sessionId,
				type,
				error: error instanceof Error ? error.message : String(error),
			});
			if (error instanceof n8n_workflow_1.ApplicationError) {
				throw error;
			}
			throw new internal_server_error_1.InternalServerError(
				`Memory retrieval failed: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
	getAiNodeTypes(specificNodeType, nodeVersion = 1) {
		const allNodes = this.nodeTypes.getKnownTypes();
		const aiNodeTypes = [];
		for (const nodeTypeName of Object.keys(allNodes)) {
			if (this.isAiNodeType(nodeTypeName)) {
				if (specificNodeType && nodeTypeName !== specificNodeType) {
					continue;
				}
				try {
					const nodeInstance = this.nodeTypes.getByNameAndVersion(nodeTypeName, nodeVersion);
					if (nodeInstance && this.isAiNode(nodeInstance.description)) {
						aiNodeTypes.push({
							nodeTypeName,
							description: nodeInstance.description,
							nodeInstance,
						});
					}
				} catch {
					continue;
				}
			}
		}
		return aiNodeTypes;
	}
	isAiNodeType(nodeTypeName) {
		const aiKeywords = [
			'openai',
			'openAi',
			'langchain',
			'anthropic',
			'cohere',
			'huggingface',
			'gemini',
			'mistral',
			'ollama',
			'ai',
			'llm',
			'chat',
			'embedding',
			'vector',
		];
		const lowerName = nodeTypeName.toLowerCase();
		return aiKeywords.some((keyword) => lowerName.includes(keyword.toLowerCase()));
	}
	isAiNode(description) {
		const hasAiGroup = description.group?.some((g) =>
			['ai', 'llm', 'langchain', 'openai'].includes(g.toLowerCase()),
		);
		const hasAiDescription =
			description.description?.toLowerCase().includes('ai') ||
			description.description?.toLowerCase().includes('llm') ||
			description.description?.toLowerCase().includes('language model');
		const hasAiDisplayName =
			description.displayName?.toLowerCase().includes('ai') ||
			description.displayName?.toLowerCase().includes('openai') ||
			description.displayName?.toLowerCase().includes('chat');
		return hasAiGroup || hasAiDescription || hasAiDisplayName || false;
	}
	async getAvailableModels(description) {
		const commonModels = [
			'gpt-4o',
			'gpt-4o-mini',
			'gpt-4-turbo',
			'gpt-3.5-turbo',
			'claude-3-5-sonnet-20241022',
			'claude-3-haiku-20240307',
			'gemini-pro',
			'llama-2-70b-chat',
		];
		if (description.name.toLowerCase().includes('openai')) {
			return commonModels.filter((model) => model.startsWith('gpt'));
		} else if (description.name.toLowerCase().includes('anthropic')) {
			return commonModels.filter((model) => model.startsWith('claude'));
		} else if (description.name.toLowerCase().includes('google')) {
			return commonModels.filter((model) => model.startsWith('gemini'));
		}
		return commonModels;
	}
	supportsStreaming(description) {
		return (
			description.properties?.some((prop) => prop.name === 'stream' || prop.name === 'streaming') ||
			false
		);
	}
	supportsBatch(description) {
		return (
			description.properties?.some((prop) => prop.name === 'batch' || prop.name === 'batchSize') ||
			false
		);
	}
	getMemoryTypes(description) {
		const supportedTypes = ['buffer', 'conversation'];
		if (description.name.toLowerCase().includes('vector')) {
			supportedTypes.push('vectorstore');
		}
		return supportedTypes;
	}
	getDefaultSettings(description) {
		const defaults = {};
		description.properties?.forEach((prop) => {
			if (prop.default !== undefined) {
				defaults[prop.name] = prop.default;
			}
		});
		return defaults;
	}
	validateMemoryConfiguration(type, configuration) {
		const requiredFields = {
			redis: ['host', 'port'],
			postgres: ['connectionString'],
			vectorstore: ['dimensions'],
			buffer: ['maxTokens'],
			conversation: ['maxMessages'],
		};
		const required = requiredFields[type];
		if (required) {
			for (const field of required) {
				if (!(field in configuration)) {
					throw new bad_request_error_1.BadRequestError(
						`Missing required configuration field '${field}' for memory type '${type}'`,
					);
				}
			}
		}
	}
};
exports.AiNodesController = AiNodesController;
__decorate(
	[
		(0, decorators_1.Get)('/config'),
		__param(1, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, api_types_1.AiNodeConfigRequestDto]),
		__metadata('design:returntype', Promise),
	],
	AiNodesController.prototype,
	'getAiNodeConfigurations',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/test-prompt'),
		__param(1, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, api_types_1.AiPromptTestRequestDto]),
		__metadata('design:returntype', Promise),
	],
	AiNodesController.prototype,
	'testPrompt',
	null,
);
__decorate(
	[
		(0, decorators_1.Post)('/memory/configure'),
		__param(1, decorators_1.Body),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, api_types_1.AiMemoryConfigRequestDto]),
		__metadata('design:returntype', Promise),
	],
	AiNodesController.prototype,
	'configureMemory',
	null,
);
__decorate(
	[
		(0, decorators_1.Get)('/memory/retrieve'),
		__param(1, decorators_1.Query),
		__metadata('design:type', Function),
		__metadata('design:paramtypes', [Object, api_types_1.AiMemoryRetrievalRequestDto]),
		__metadata('design:returntype', Promise),
	],
	AiNodesController.prototype,
	'retrieveMemory',
	null,
);
exports.AiNodesController = AiNodesController = __decorate(
	[
		(0, decorators_1.RestController)('/ai-nodes'),
		__metadata('design:paramtypes', [backend_common_1.Logger, node_types_1.NodeTypes]),
	],
	AiNodesController,
);
//# sourceMappingURL=ai-nodes.controller.js.map
