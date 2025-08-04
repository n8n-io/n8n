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
Object.defineProperty(exports, '__esModule', { value: true });
exports.ImportService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const uuid_1 = require('uuid');
const workflow_helpers_1 = require('@/workflow-helpers');
let ImportService = class ImportService {
	constructor(logger, credentialsRepository, tagRepository) {
		this.logger = logger;
		this.credentialsRepository = credentialsRepository;
		this.tagRepository = tagRepository;
		this.dbCredentials = [];
		this.dbTags = [];
	}
	async initRecords() {
		this.dbCredentials = await this.credentialsRepository.find();
		this.dbTags = await this.tagRepository.find();
	}
	async importWorkflows(workflows, projectId) {
		await this.initRecords();
		for (const workflow of workflows) {
			workflow.nodes.forEach((node) => {
				this.toNewCredentialFormat(node);
				if (!node.id) node.id = (0, uuid_1.v4)();
			});
			const hasInvalidCreds = workflow.nodes.some((node) => !node.credentials?.id);
			if (hasInvalidCreds) await this.replaceInvalidCreds(workflow);
		}
		const { manager: dbManager } = this.credentialsRepository;
		await dbManager.transaction(async (tx) => {
			for (const workflow of workflows) {
				if (workflow.active) {
					workflow.active = false;
					this.logger.info(`Deactivating workflow "${workflow.name}". Remember to activate later.`);
				}
				const exists = workflow.id
					? await tx.existsBy(db_1.WorkflowEntity, { id: workflow.id })
					: false;
				const upsertResult = await tx.upsert(db_1.WorkflowEntity, workflow, ['id']);
				const workflowId = upsertResult.identifiers.at(0)?.id;
				const personalProject = await tx.findOneByOrFail(db_1.Project, { id: projectId });
				if (!exists) {
					await tx.upsert(
						db_1.SharedWorkflow,
						{ workflowId, projectId: personalProject.id, role: 'workflow:owner' },
						['workflowId', 'projectId'],
					);
				}
				if (!workflow.tags?.length) continue;
				await this.tagRepository.setTags(tx, this.dbTags, workflow);
				for (const tag of workflow.tags) {
					await tx.upsert(db_1.WorkflowTagMapping, { tagId: tag.id, workflowId }, [
						'tagId',
						'workflowId',
					]);
				}
			}
		});
	}
	async replaceInvalidCreds(workflow) {
		try {
			await (0, workflow_helpers_1.replaceInvalidCredentials)(workflow);
		} catch (e) {
			this.logger.error('Failed to replace invalid credential', { error: e });
		}
	}
	toNewCredentialFormat(node) {
		if (!node.credentials) return;
		for (const [type, name] of Object.entries(node.credentials)) {
			if (typeof name !== 'string') continue;
			const nodeCredential = { id: null, name };
			const match = this.dbCredentials.find((c) => c.name === name && c.type === type);
			if (match) nodeCredential.id = match.id;
			node.credentials[type] = nodeCredential;
		}
	}
};
exports.ImportService = ImportService;
exports.ImportService = ImportService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			backend_common_1.Logger,
			db_1.CredentialsRepository,
			db_1.TagRepository,
		]),
	],
	ImportService,
);
//# sourceMappingURL=import.service.js.map
