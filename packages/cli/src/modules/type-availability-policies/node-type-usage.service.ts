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
		// Both reads see one snapshot, so the entry of a base type and the entries of its variants
		// agree. SQLite supports only `SERIALIZABLE`, and on Postgres it gives the one snapshot too.
		return await this.transactionRunner.run(
			{},
			async (ctx) => {
				const usage = await this.typeUsageRepository.countNodeTypeUsage(projectId, ctx);

				const groups = this.groupVariantsByBaseType(Object.keys(usage));
				if (Object.keys(groups).length === 0) return usage;

				const grouped = await this.typeUsageRepository.countNodeTypeUsageByGroup(
					projectId,
					groups,
					ctx,
				);

				return { ...usage, ...grouped };
			},
			{ readOnly: true, isolationLevel: 'SERIALIZABLE' },
		);
	}

	/**
	 * Maps each base type that has a variant in use to the base type and its variants. A variant
	 * goes with the base type that a `name` rule matches it by.
	 */
	private groupVariantsByBaseType(types: string[]): Record<string, string[]> {
		const policedType = policedTypeFor(
			NODE_TYPES_KIND,
			this.nodeTypes,
			this.loadNodesAndCredentials,
		);
		const groups: Record<string, string[]> = {};
		for (const type of types) {
			const { baseName } = policedType(type);
			if (baseName === type) continue;
			groups[baseName] ??= [baseName];
			groups[baseName].push(type);
		}
		return groups;
	}
}
