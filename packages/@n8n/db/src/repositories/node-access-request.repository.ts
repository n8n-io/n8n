import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, Repository } from '@n8n/typeorm';

import { NodeAccessRequest, type RequestStatus } from '../entities';

@Service()
export class NodeAccessRequestRepository extends Repository<NodeAccessRequest> {
	constructor(dataSource: DataSource) {
		super(NodeAccessRequest, dataSource.manager);
	}

	async findByStatus(status: RequestStatus, entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		return await em.find(NodeAccessRequest, {
			where: { status },
			relations: ['project', 'requestedBy', 'reviewedBy'],
			order: { createdAt: 'DESC' },
		});
	}

	async findPendingRequests(entityManager?: EntityManager) {
		return await this.findByStatus('pending', entityManager);
	}

	async findByProjectId(projectId: string, entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		return await em.find(NodeAccessRequest, {
			where: { projectId },
			relations: ['requestedBy', 'reviewedBy'],
			order: { createdAt: 'DESC' },
		});
	}

	async findByRequestedById(requestedById: string, entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		return await em.find(NodeAccessRequest, {
			where: { requestedById },
			relations: ['project', 'reviewedBy'],
			order: { createdAt: 'DESC' },
		});
	}

	async findPendingForNodeAndProject(
		nodeType: string,
		projectId: string,
		entityManager?: EntityManager,
	) {
		const em = entityManager ?? this.manager;
		return await em.findOne(NodeAccessRequest, {
			where: {
				nodeType,
				projectId,
				status: 'pending',
			},
		});
	}

	async findPendingByUserAndNode(
		requestedById: string,
		nodeType: string,
		projectId: string,
		entityManager?: EntityManager,
	) {
		const em = entityManager ?? this.manager;
		return await em.findOne(NodeAccessRequest, {
			where: {
				requestedById,
				nodeType,
				projectId,
				status: 'pending',
			},
		});
	}

	async createRequest(
		data: {
			projectId: string;
			requestedById: string;
			nodeType: string;
			justification: string;
			workflowName?: string;
		},
		entityManager?: EntityManager,
	) {
		const em = entityManager ?? this.manager;
		const request = em.create(NodeAccessRequest, {
			projectId: data.projectId,
			requestedById: data.requestedById,
			nodeType: data.nodeType,
			justification: data.justification,
			workflowName: data.workflowName ?? null,
			status: 'pending',
		});
		return await em.save(NodeAccessRequest, request);
	}

	async updateStatus(
		id: string,
		status: RequestStatus,
		reviewedById: string,
		reviewComment?: string,
		entityManager?: EntityManager,
	) {
		const em = entityManager ?? this.manager;
		await em.update(
			NodeAccessRequest,
			{ id },
			{
				status,
				reviewedById,
				reviewComment: reviewComment ?? null,
				reviewedAt: new Date(),
			},
		);
		return await em.findOne(NodeAccessRequest, {
			where: { id },
			relations: ['project', 'requestedBy', 'reviewedBy'],
		});
	}

	async getPendingCountByProject(entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;
		const result = await em
			.createQueryBuilder(NodeAccessRequest, 'request')
			.select('request.projectId', 'projectId')
			.addSelect('COUNT(*)', 'count')
			.where('request.status = :status', { status: 'pending' satisfies RequestStatus })
			.groupBy('request.projectId')
			.getRawMany<{ projectId: string; count: string }>();

		return new Map(result.map((r) => [r.projectId, parseInt(r.count, 10)]));
	}
}
