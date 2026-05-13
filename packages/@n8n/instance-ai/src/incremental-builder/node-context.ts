/**
 * Per-run NodeContext — caches the heavy `NodeSearchEngine` (built from
 * `listSearchable()`) so specialists can reuse it without re-loading the
 * catalog on every step, and exposes parameter validation for the draft
 * tools to feed errors back into the LLM loop.
 */

import { NodeSearchEngine } from '../tools/nodes/node-search-engine';
import type { InstanceAiNodeService, SearchableNodeDescription } from '../types';

export class NodeContext {
	private readonly nodeService: InstanceAiNodeService;

	private enginePromise?: Promise<NodeSearchEngine>;

	private cataloguePromise?: Promise<SearchableNodeDescription[]>;

	constructor(nodeService: InstanceAiNodeService) {
		this.nodeService = nodeService;
	}

	get service(): InstanceAiNodeService {
		return this.nodeService;
	}

	async engine(): Promise<NodeSearchEngine> {
		this.enginePromise ??= this.nodeService
			.listSearchable()
			.then((catalogue) => new NodeSearchEngine(catalogue));
		return await this.enginePromise;
	}

	async catalogue(): Promise<SearchableNodeDescription[]> {
		this.cataloguePromise ??= this.nodeService.listSearchable();
		return await this.cataloguePromise;
	}

	async validateNode(
		nodeType: string,
		typeVersion: number,
		parameters: Record<string, unknown>,
	): Promise<Record<string, string[]> | null> {
		if (!this.nodeService.getParameterIssues) return null;
		try {
			const issues = await this.nodeService.getParameterIssues(nodeType, typeVersion, parameters);
			if (!issues || Object.keys(issues).length === 0) return null;
			return issues;
		} catch {
			return null;
		}
	}
}
