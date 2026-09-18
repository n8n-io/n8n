import type {
	CreateCustomNodeDto,
	CreateCustomOperationDto,
	CustomNodeDefinition,
	CustomNodeListItem,
	CustomOperationDefinition,
	CustomOperationVersion,
	UpdateCustomNodeDto,
	UpdateCustomOperationDto,
} from '@n8n/api-types';
import { CUSTOM_DEFINITIONS_PACKAGE_NAME } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { generateNanoId } from '@n8n/db';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { Push } from '@/push';

import { CustomNodesNodeLoader } from './custom-nodes-node-loader';
import { seedAcmeBillingNode, seedAcmeOperations, seedStripePaymentLink } from './custom-nodes.seed';
import { CustomNodeDefinitionEntity } from './database/custom-node-definition.entity';
import { CustomNodeDefinitionRepository } from './database/custom-node-definition.repository';

/** 256 KiB is plenty for an SVG or a small PNG logo. */
const MAX_ICON_BYTES = 256 * 1024;

export const customNodeTypeName = (id: string) => `${CUSTOM_DEFINITIONS_PACKAGE_NAME}.${id}`;

@Service()
export class CustomNodesService {
	constructor(
		private readonly repository: CustomNodeDefinitionRepository,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly push: Push,
		private readonly logger: Logger,
	) {}

	/** Seeds demo data on an empty table and loads the node types. */
	async init() {
		if ((await this.repository.countAll()) === 0) {
			await this.seed();
		}
		await this.refreshNodeTypes(false);
	}

	private async seed() {
		this.logger.info('Seeding custom node demo definitions');
		const stripe = seedStripePaymentLink();
		const acme = seedAcmeBillingNode();
		const acmeOps = seedAcmeOperations();
		await this.repository.save([
			this.toEntity(stripe.id, stripe.name, 'operation', stripe),
			this.toEntity(acme.id, acme.displayName, 'node', acme),
			...acmeOps.map((op) => this.toEntity(op.id, op.name, 'operation', op)),
		]);
	}

	private toEntity(
		id: string,
		name: string,
		type: CustomNodeDefinitionEntity['type'],
		definition: CustomOperationDefinition | CustomNodeDefinition,
	) {
		const entity = new CustomNodeDefinitionEntity();
		entity.id = id;
		entity.name = name;
		entity.type = type;
		entity.definition = definition;
		return entity;
	}

	// ---------------------------------------------------------------- reads

	async list(): Promise<CustomNodeListItem[]> {
		const rows = await this.repository.findAllOrdered();
		const operations = rows.filter((r) => r.type === 'operation');

		return rows.flatMap<CustomNodeListItem>((row) => {
			const base = {
				id: row.id,
				name: row.name,
				nodeType: customNodeTypeName(row.id),
				createdAt: row.createdAt.toISOString(),
				updatedAt: row.updatedAt.toISOString(),
			};
			if (row.type === 'node') {
				const node = row.definition as CustomNodeDefinition;
				return [
					{
						...base,
						kind: 'node',
						definition: node,
						operations: operations
							.map((op) => op.definition as CustomOperationDefinition)
							.filter((op) => op.customNodeId === node.id),
					},
				];
			}
			const operation = row.definition as CustomOperationDefinition;
			// Operations of a custom node are listed inside the node
			if (operation.customNodeId !== null) return [];
			return [{ ...base, kind: 'operation', definition: operation }];
		});
	}

	async getEntity(id: string) {
		const row = await this.repository.findOneBy({ id });
		if (!row) throw new UserError(`Custom node definition "${id}" not found`);
		return row;
	}

	async getIcon(id: string): Promise<{ mimeType: string; data: Buffer }> {
		const row = await this.getEntity(id);
		if (row.type !== 'node') throw new UserError('Only custom nodes have an icon');
		const { iconDataUri } = row.definition as CustomNodeDefinition;
		if (!iconDataUri) throw new UserError('This custom node has no icon');
		const match = /^data:(image\/(?:svg\+xml|png));base64,(.+)$/.exec(iconDataUri);
		if (!match) throw new UserError('Stored icon is not a valid data URI');
		return { mimeType: match[1], data: Buffer.from(match[2], 'base64') };
	}

	// --------------------------------------------------------- operations

	async createOperation(dto: CreateCustomOperationDto) {
		if ((dto.parentNodeType === null) === (dto.customNodeId === null)) {
			throw new UserError('Set exactly one of parentNodeType or customNodeId');
		}
		if (dto.parentNodeType && !this.loadNodesAndCredentials.recognizesNode(dto.parentNodeType)) {
			throw new UserError(`Parent node type "${dto.parentNodeType}" is not installed`);
		}

		const id = generateNanoId();
		const definition: CustomOperationDefinition = {
			id,
			name: dto.name,
			description: dto.description,
			parentNodeType: dto.parentNodeType,
			customNodeId: dto.customNodeId,
			activeVersion: 1,
			versions: [{ ...dto.version, version: 1, createdAt: new Date().toISOString() }],
		};

		if (dto.customNodeId) {
			const nodeRow = await this.getEntity(dto.customNodeId);
			const node = nodeRow.definition as CustomNodeDefinition;
			node.operationIds.push(id);
			await this.repository.save(nodeRow);
		}

		await this.repository.save(this.toEntity(id, dto.name, 'operation', definition));
		await this.refreshNodeTypes();
		return definition;
	}

	/** Metadata changes update in place; a new `version` payload appends a version. */
	async updateOperation(id: string, dto: UpdateCustomOperationDto) {
		const row = await this.getEntity(id);
		if (row.type !== 'operation') throw new UserError(`"${id}" is not a custom operation`);
		const definition = row.definition as CustomOperationDefinition;

		if (dto.name) {
			definition.name = dto.name;
			row.name = dto.name;
		}
		if (dto.description !== undefined) definition.description = dto.description;
		if (dto.version) {
			const nextVersion = Math.max(...definition.versions.map((v) => v.version)) + 1;
			const version: CustomOperationVersion = {
				...dto.version,
				version: nextVersion,
				createdAt: new Date().toISOString(),
			};
			definition.versions.push(version);
			definition.activeVersion = nextVersion;
		}

		await this.repository.save(row);
		await this.refreshNodeTypes();
		return definition;
	}

	async setActiveVersion(id: string, version: number) {
		const row = await this.getEntity(id);
		if (row.type !== 'operation') throw new UserError(`"${id}" is not a custom operation`);
		const definition = row.definition as CustomOperationDefinition;
		if (!definition.versions.some((v) => v.version === version)) {
			throw new UserError(`Version ${version} does not exist`);
		}
		definition.activeVersion = version;
		await this.repository.save(row);
		await this.refreshNodeTypes();
		return definition;
	}

	// -------------------------------------------------------------- nodes

	async createNode(dto: CreateCustomNodeDto) {
		const nodeId = generateNanoId();
		const operations = dto.operations.map<CustomOperationDefinition>((op) => ({
			id: generateNanoId(),
			name: op.name,
			description: op.description,
			parentNodeType: null,
			customNodeId: nodeId,
			activeVersion: 1,
			versions: [{ ...op.version, version: 1, createdAt: new Date().toISOString() }],
		}));

		this.assertIconSize(dto.iconDataUri);
		const node: CustomNodeDefinition = {
			id: nodeId,
			name: dto.name,
			displayName: dto.displayName,
			description: dto.description,
			iconDataUri: dto.iconDataUri,
			baseUrl: dto.baseUrl,
			auth: dto.auth,
			operationIds: operations.map((op) => op.id),
		};

		await this.repository.save([
			this.toEntity(nodeId, dto.displayName, 'node', node),
			...operations.map((op) => this.toEntity(op.id, op.name, 'operation', op)),
		]);
		await this.refreshNodeTypes();
		return node;
	}

	async updateNode(id: string, dto: UpdateCustomNodeDto) {
		const row = await this.getEntity(id);
		if (row.type !== 'node') throw new UserError(`"${id}" is not a custom node`);
		const node = row.definition as CustomNodeDefinition;
		if (dto.displayName) {
			node.displayName = dto.displayName;
			row.name = dto.displayName;
		}
		if (dto.description !== undefined) node.description = dto.description;
		if (dto.baseUrl !== undefined) node.baseUrl = dto.baseUrl;
		if (dto.auth) node.auth = dto.auth;
		await this.repository.save(row);
		await this.refreshNodeTypes();
		return node;
	}

	async setIcon(id: string, iconDataUri: string) {
		this.assertIconSize(iconDataUri);
		const row = await this.getEntity(id);
		if (row.type !== 'node') throw new UserError('Only custom nodes have an icon');
		const node = row.definition as CustomNodeDefinition;
		node.iconDataUri = iconDataUri;
		await this.repository.save(row);
		await this.refreshNodeTypes();
		return node;
	}

	private assertIconSize(iconDataUri?: string) {
		if (iconDataUri && iconDataUri.length > MAX_ICON_BYTES) {
			throw new UserError(`Icon must be smaller than ${MAX_ICON_BYTES / 1024} KiB`);
		}
	}

	// ------------------------------------------------------------- delete

	async delete(id: string) {
		const row = await this.getEntity(id);
		if (row.type === 'node') {
			const node = row.definition as CustomNodeDefinition;
			if (node.operationIds.length) await this.repository.delete(node.operationIds);
		} else {
			const operation = row.definition as CustomOperationDefinition;
			if (operation.customNodeId) {
				const nodeRow = await this.repository.findOneBy({ id: operation.customNodeId });
				if (nodeRow) {
					const node = nodeRow.definition as CustomNodeDefinition;
					node.operationIds = node.operationIds.filter((opId) => opId !== id);
					await this.repository.save(nodeRow);
				}
			}
		}
		await this.repository.delete(id);
		await this.refreshNodeTypes();
	}

	// ------------------------------------------------------- node types

	/**
	 * Regenerates the node types from the stored definitions and publishes
	 * them, the same way a community package install does.
	 */
	async refreshNodeTypes(notifyClients = true) {
		const loader = this.loadNodesAndCredentials.loaders[CUSTOM_DEFINITIONS_PACKAGE_NAME];
		if (!(loader instanceof CustomNodesNodeLoader)) {
			this.logger.warn('Custom nodes loader is not registered, skipping node type refresh');
			return;
		}

		const rows = await this.repository.findAllOrdered();
		loader.setDefinitions({
			operations: rows
				.filter((r) => r.type === 'operation')
				.map((r) => r.definition as CustomOperationDefinition),
			nodes: rows.filter((r) => r.type === 'node').map((r) => r.definition as CustomNodeDefinition),
		});
		await loader.loadAll();
		await this.loadNodesAndCredentials.postProcessLoaders();

		if (notifyClients) {
			this.loadNodesAndCredentials.releaseTypes();
			this.push.broadcast({ type: 'nodeDescriptionUpdated', data: {} });
		}
		this.logger.debug('Custom node types refreshed', { count: rows.length });
	}
}
