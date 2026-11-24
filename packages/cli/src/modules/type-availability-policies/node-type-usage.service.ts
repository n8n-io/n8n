import type { NodeTypeUsageResponse } from '@n8n/api-types';
import { TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';

import { NODE_TYPES_KIND } from './constants';
import { TypeUsageRepository } from './database/repositories/type-usage.repository';
import { policedTypeFor } from './package-resolver';

/**
 * Counts the usage of each node type for the policy admin UI. A `name` rule on a node type also
 * matches the tool variants that n8n generates from it, so the entry of a node type also counts
 * its variants. Each variant keeps an entry of its own for the row it gets when a rule names it.
 */
@Service()
export class NodeTypeUsageService {
	constructor(
		private readonly typeUsageRepository: TypeUsageRepository,
		private readonly nodeTypes: NodeTypes,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly transactionRunner: TransactionRunner,
	) {}

	async getUsage(projectId: string | null): Promise<NodeTypeUsageResponse> {
		// On SQLite, both reads see one snapshot. Postgres can serve a read-only transaction from a
		// replica, which rejects `SERIALIZABLE`, so there each read sees its own snapshot.
		return await this.transactionRunner.run(
			{},
			async (ctx) => {
				const usage = await this.typeUsageRepository.countNodeTypeUsage(projectId, ctx);
				const grouped = await this.typeUsageRepository.countNodeTypeUsageByGroup(
					projectId,
					this.groupVariantsByBaseType(Object.keys(usage)),
					ctx,
				);

				return { ...usage, ...grouped };
			},
			{ readOnly: true },
		);
	}

	/**
	 * Maps each base type that has a variant in use to the base type and its variants. A variant
	 * goes with the base type that a `name` rule matches it by. A Map, because a type name from a
	 * stored workflow can be an `Object.prototype` key.
	 */
	private groupVariantsByBaseType(types: string[]): Map<string, string[]> {
		const policedType = policedTypeFor(
			NODE_TYPES_KIND,
			this.nodeTypes,
			this.loadNodesAndCredentials,
		);
		const groups = new Map<string, string[]>();
		for (const type of types) {
			const { baseName } = policedType(type);
			if (baseName === type) continue;
			const group = groups.get(baseName) ?? [baseName];
			group.push(type);
			groups.set(baseName, group);
		}
		return groups;
	}
}
