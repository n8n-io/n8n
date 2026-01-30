import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { InstanceSettings } from 'n8n-core';

import {
	generateSingleVersionTypeFile,
	generateSingleVersionSchemaFile,
	generateVersionIndexFile,
	generateIndexFile,
	generateBaseSchemaFile,
	hasDiscriminatorPattern,
	planSplitVersionFiles,
	versionToFileName,
	nodeNameToFileName,
	getPackageName,
	type NodeTypeDescription,
} from '@n8n/workflow-sdk';

/**
 * Service for generating node types at runtime.
 *
 * Generates TypeScript type definitions from nodes.json files
 * and stores them in the ~/.n8n/generated-types/ directory.
 *
 * Types are regenerated on first startup and when community nodes change.
 */
@Service()
export class NodeTypeGeneratorService {
	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
	) {}

	/**
	 * Compute MD5 hash of content
	 */
	computeHash(content: string): string {
		return createHash('md5').update(content).digest('hex');
	}

	/**
	 * Check if types need to be regenerated and generate if needed.
	 *
	 * @param nodesJsonPath Path to the nodes.json file
	 * @returns true if types were generated, false if skipped (hash matched)
	 */
	async generateIfNeeded(nodesJsonPath: string): Promise<boolean> {
		const hashFilePath = path.join(this.instanceSettings.generatedTypesDir, 'nodes.json.hash');

		// Read the nodes.json content
		const content = await fs.promises.readFile(nodesJsonPath, 'utf-8');
		const currentHash = this.computeHash(content);

		// Check if hash file exists and matches
		if (fs.existsSync(hashFilePath)) {
			try {
				const storedHash = await fs.promises.readFile(hashFilePath, 'utf-8');
				if (storedHash.trim() === currentHash) {
					this.logger.debug('Node types hash matches, skipping regeneration');
					return false;
				}
			} catch {
				// If we can't read the hash file, regenerate
			}
		}

		// Generate types
		await this.generate(nodesJsonPath);
		return true;
	}

	/**
	 * Generate type files from nodes.json
	 *
	 * @param nodesJsonPath Path to the nodes.json file
	 */
	async generate(nodesJsonPath: string): Promise<void> {
		const outputDir = this.instanceSettings.generatedTypesDir;
		const hashFilePath = path.join(outputDir, 'nodes.json.hash');

		this.logger.info('Generating node types from nodes.json...');

		// Ensure output directory exists
		await fs.promises.mkdir(outputDir, { recursive: true });

		// Generate base.schema.ts with common Zod helpers
		const baseSchemaContent = generateBaseSchemaFile();
		await fs.promises.writeFile(path.join(outputDir, 'base.schema.ts'), baseSchemaContent, 'utf-8');

		// Read and parse nodes.json
		const content = await fs.promises.readFile(nodesJsonPath, 'utf-8');
		const nodes = JSON.parse(content) as NodeTypeDescription[];

		// Group nodes by package
		const nodesByPackage = new Map<string, Map<string, NodeTypeDescription[]>>();

		for (const node of nodes) {
			if (node.hidden) continue;

			const packageName = getPackageName(node.name);
			const fileName = nodeNameToFileName(node.name);

			if (!nodesByPackage.has(packageName)) {
				nodesByPackage.set(packageName, new Map());
			}

			const packageNodes = nodesByPackage.get(packageName)!;
			if (!packageNodes.has(fileName)) {
				packageNodes.set(fileName, []);
			}
			packageNodes.get(fileName)!.push(node);
		}

		const allNodes: NodeTypeDescription[] = [];

		// Generate files for each package
		for (const [packageName, nodesByName] of nodesByPackage) {
			const packageDir = path.join(outputDir, 'nodes', packageName);

			for (const [nodeName, nodeVariants] of nodesByName) {
				try {
					// Create directory for this node
					const nodeDir = path.join(packageDir, nodeName);
					await fs.promises.mkdir(nodeDir, { recursive: true });

					// Collect all versions
					const versionToNode = new Map<number, NodeTypeDescription>();
					const allVersions: number[] = [];

					for (const node of nodeVariants) {
						const versions = Array.isArray(node.version) ? node.version : [node.version];
						for (const version of versions) {
							if (!versionToNode.has(version)) {
								versionToNode.set(version, node);
								allVersions.push(version);
							}
						}
					}

					// Generate files for each version
					for (const version of allVersions) {
						const sourceNode = versionToNode.get(version)!;
						const fileName = versionToFileName(version);

						if (hasDiscriminatorPattern(sourceNode)) {
							// Generate split structure for nodes with resource/operation or mode patterns
							// planSplitVersionFiles returns both type files AND schema files
							const versionDir = path.join(nodeDir, fileName);
							await fs.promises.mkdir(versionDir, { recursive: true });
							const files = planSplitVersionFiles(sourceNode, version);
							await this.writePlanToDisk(versionDir, files);
						} else {
							// Generate flat type file
							const typeContent = generateSingleVersionTypeFile(sourceNode, version);
							const filePath = path.join(nodeDir, `${fileName}.ts`);
							await fs.promises.writeFile(filePath, typeContent, 'utf-8');

							// Generate flat schema file
							const schemaContent = generateSingleVersionSchemaFile(sourceNode, version);
							const schemaFilePath = path.join(nodeDir, `${fileName}.schema.ts`);
							await fs.promises.writeFile(schemaFilePath, schemaContent, 'utf-8');
						}
					}

					// Generate index.ts
					const indexContent = generateVersionIndexFile(nodeVariants[0], allVersions);
					await fs.promises.writeFile(path.join(nodeDir, 'index.ts'), indexContent, 'utf-8');

					// Add first node variant for main index
					allNodes.push(nodeVariants[0]);
				} catch (error) {
					this.logger.error(`Error generating types for ${nodeName}:`, error);
				}
			}
		}

		// Generate main index file
		if (allNodes.length > 0) {
			const indexContent = generateIndexFile(allNodes);
			await fs.promises.writeFile(path.join(outputDir, 'index.ts'), indexContent, 'utf-8');
		}

		// Write hash file
		const hash = this.computeHash(content);
		await fs.promises.writeFile(hashFilePath, hash, 'utf-8');

		this.logger.info(`Generated types for ${allNodes.length} nodes in ${outputDir}`);
	}

	/**
	 * Write a plan (Map of relative paths to content) to disk
	 *
	 * @param baseDir Base directory for the files
	 * @param plan Map of relative path -> file content
	 */
	private async writePlanToDisk(baseDir: string, plan: Map<string, string>): Promise<void> {
		for (const [relativePath, content] of plan) {
			const fullPath = path.join(baseDir, relativePath);
			const dir = path.dirname(fullPath);
			await fs.promises.mkdir(dir, { recursive: true });
			await fs.promises.writeFile(fullPath, content, 'utf-8');
		}
	}
}
