import { GetNodeTypesByIdentifierRequestDto } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Body, Post, RestController } from '@n8n/decorators';
import { Request } from 'express';
import get from 'lodash/get';
import type { INodeTypeDescription, INodeTypeNameVersion } from 'n8n-workflow';
import { coerce } from 'semver';

import { NodeTypes } from '@/node-types';

/**
 * Parse a node type identifier string (name@version) into name and version
 * @param identifier - e.g., "n8n-nodes-base.httpRequest@4.2"
 * @returns { name, version } or null if invalid
 */
function parseNodeTypeIdentifier(identifier: string): { name: string; version: number } | null {
	const atIndex = identifier.lastIndexOf('@');
	if (atIndex === -1) return null;

	const name = identifier.substring(0, atIndex);
	if (!name) return null;

	const versionStr = identifier.substring(atIndex + 1);
	if (!coerce(versionStr)) return null;

	return { name, version: parseFloat(versionStr) };
}

@RestController('/node-types')
export class NodeTypesController {
	constructor(
		private readonly nodeTypes: NodeTypes,
		private readonly globalConfig: GlobalConfig,
	) {}

	@Post('/')
	async getNodeInfo(req: Request) {
		const nodeInfos = get(req, 'body.nodeInfos', []) as INodeTypeNameVersion[];
		const defaultLocale = this.globalConfig.defaultLocale;

		const descriptions = await Promise.all(
			nodeInfos.map(async ({ name, version }) => {
				return await this.nodeTypes.getDescriptionWithTranslation(name, version, defaultLocale);
			}),
		);

		return descriptions;
	}

	/**
	 * Get node types by their identifier strings (name@version format)
	 * This endpoint is optimized for fetching specific node types when doing incremental syncs
	 */
	@Post('/by-identifier')
	async getNodeTypesByIdentifier(
		@Body payload: GetNodeTypesByIdentifierRequestDto,
	): Promise<INodeTypeDescription[]> {
		const { identifiers = [] } = payload;
		const defaultLocale = this.globalConfig.defaultLocale;
		const nodeTypes: INodeTypeDescription[] = [];

		for (const identifier of identifiers) {
			const parsed = parseNodeTypeIdentifier(identifier);
			if (!parsed) continue;

			try {
				const description = await this.nodeTypes.getDescriptionWithTranslation(
					parsed.name,
					parsed.version,
					defaultLocale,
				);
				nodeTypes.push(description);
			} catch {
				// Skip node types that don't exist (may have been removed)
			}
		}

		return nodeTypes;
	}
}
