import { GetNodeTypesByIdentifierRequestDto } from '@n8n/api-types';
import { GlobalConfig } from '@n8n/config';
import { Body, Post, RestController } from '@n8n/decorators';
import { Request } from 'express';
import { readFile } from 'fs/promises';
import get from 'lodash/get';
import type { INodeTypeDescription, INodeTypeNameVersion } from 'n8n-workflow';

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
	const versionStr = identifier.substring(atIndex + 1);
	const version = parseFloat(versionStr);

	if (!name || isNaN(version)) return null;

	return { name, version };
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

		if (defaultLocale === 'en') {
			return nodeInfos.reduce<INodeTypeDescription[]>((acc, { name, version }) => {
				const { description } = this.nodeTypes.getByNameAndVersion(name, version);
				acc.push(description);
				return acc;
			}, []);
		}

		const populateTranslation = async (
			name: string,
			version: number,
			nodeTypes: INodeTypeDescription[],
		) => {
			const { description, sourcePath } = this.nodeTypes.getWithSourcePath(name, version);
			const translationPath = await this.nodeTypes.getNodeTranslationPath({
				nodeSourcePath: sourcePath,
				longNodeType: description.name,
				locale: defaultLocale,
			});

			try {
				const translation = await readFile(translationPath, 'utf8');
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				description.translation = JSON.parse(translation);
			} catch {
				// ignore - no translation exists at path
			}

			nodeTypes.push(description);
		};

		const nodeTypes: INodeTypeDescription[] = [];

		const promises = nodeInfos.map(
			async ({ name, version }) => await populateTranslation(name, version, nodeTypes),
		);

		await Promise.all(promises);

		return nodeTypes;
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
				if (defaultLocale === 'en') {
					const { description } = this.nodeTypes.getByNameAndVersion(parsed.name, parsed.version);
					nodeTypes.push(description);
				} else {
					const { description, sourcePath } = this.nodeTypes.getWithSourcePath(
						parsed.name,
						parsed.version,
					);
					const translationPath = await this.nodeTypes.getNodeTranslationPath({
						nodeSourcePath: sourcePath,
						longNodeType: description.name,
						locale: defaultLocale,
					});

					try {
						const translation = await readFile(translationPath, 'utf8');
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						description.translation = JSON.parse(translation);
					} catch {
						// ignore - no translation exists at path
					}

					nodeTypes.push(description);
				}
			} catch {
				// Skip node types that don't exist (may have been removed)
			}
		}

		return nodeTypes;
	}
}
