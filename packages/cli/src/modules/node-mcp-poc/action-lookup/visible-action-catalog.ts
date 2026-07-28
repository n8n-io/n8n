import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { NODE_MCP_POC_ENDPOINTS } from '../node-mcp-poc.config';
import type {
	CompiledActionPlan,
	SearchNodeActionsResult,
	VisibleActionCatalog,
} from './action-lookup.types';
import { NodeActionCompiler } from './node-action-compiler';

function encodeCursor(offset: number) {
	return Buffer.from(String(offset), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string | undefined) {
	if (!cursor) return 0;
	const value = Number(Buffer.from(cursor, 'base64url').toString('utf8'));
	if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid search cursor');
	return value;
}

function searchText(action: CompiledActionPlan) {
	return [
		action.summary.node.name,
		action.summary.node.type,
		action.summary.name,
		action.summary.description,
		action.definition.action.resource,
		action.definition.action.operation,
	]
		.filter((value): value is string => Boolean(value))
		.join(' ')
		.toLowerCase();
}

function score(action: CompiledActionPlan, query: string) {
	const normalizedQuery = query.trim().toLowerCase();
	const text = searchText(action);
	if (text.includes(normalizedQuery)) return 100;
	const terms = normalizedQuery.split(/\s+/).filter(Boolean);
	const matched = terms.filter((term) => text.includes(term)).length;
	return matched === 0 ? 0 : matched / terms.length;
}

@Service()
export class VisibleActionCatalogRegistry {
	private readonly catalogs = new Map<string, VisibleActionCatalog>();

	constructor(
		private readonly compiler: NodeActionCompiler,
		private readonly logger: Logger,
	) {}

	initialize() {
		this.catalogs.clear();
		for (const endpoint of NODE_MCP_POC_ENDPOINTS) {
			if (endpoint.type !== 'action-lookup') continue;
			try {
				const catalog = this.compiler.compile(endpoint);
				this.catalogs.set(endpoint.endpoint, catalog);
				this.logger.info('Registered action lookup node MCP POC endpoint', {
					endpoint: endpoint.endpoint,
					actionCount: catalog.actions.length,
				});
			} catch (error) {
				this.logger.warn('Could not compile action lookup node MCP POC endpoint', {
					endpoint: endpoint.endpoint,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}

	get(endpoint: string) {
		return this.catalogs.get(endpoint);
	}

	findAction(catalog: VisibleActionCatalog, actionId: string) {
		const action = catalog.actions.find((candidate) => candidate.id === actionId);
		if (!action) throw new Error('Action not found');
		return action;
	}

	search(
		catalog: VisibleActionCatalog,
		query: string,
		limit: number,
		cursor?: string,
	): SearchNodeActionsResult {
		const offset = decodeCursor(cursor);
		const matches = catalog.actions
			.map((action) => ({ action, score: score(action, query) }))
			.filter((candidate) => candidate.score > 0)
			.sort(
				(left, right) => right.score - left.score || left.action.id.localeCompare(right.action.id),
			);
		const page = matches.slice(offset, offset + limit);
		const nextOffset = offset + page.length;
		return {
			actions: page.map(({ action }) => action.summary),
			nextCursor: nextOffset < matches.length ? encodeCursor(nextOffset) : null,
		};
	}
}
