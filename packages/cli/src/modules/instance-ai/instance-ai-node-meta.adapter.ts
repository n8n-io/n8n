import { Service } from '@n8n/di';
import type { TriggerNodeMetaProvider } from '@n8n/instance-ai';

import { NodeTypes } from '@/node-types';

/**
 * NodeTypes-registry-backed implementation of the trigger-facts metadata
 * provider: authoritative trigger detection (description `group` contains
 * 'trigger') and curated display names for clause labels. Partial by
 * contract — unknown or not-installed node types return undefined and the
 * extractor falls back to its name heuristics for those nodes.
 */
@Service()
export class InstanceAiNodeMetaAdapter implements TriggerNodeMetaProvider {
	constructor(private readonly nodeTypes: NodeTypes) {}

	getNodeMeta(
		type: string,
		typeVersion?: number,
	): { isTrigger: boolean; displayName: string } | undefined {
		try {
			const { description } = this.nodeTypes.getByNameAndVersion(type, typeVersion);
			return {
				isTrigger: description.group.includes('trigger'),
				displayName: description.displayName,
			};
		} catch {
			// Unknown / uninstalled node type — the caller falls back to heuristics.
			return undefined;
		}
	}
}
