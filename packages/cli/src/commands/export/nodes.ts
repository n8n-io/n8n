import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import type { INodeTypeBaseDescription } from 'n8n-workflow';
import path from 'path';
import z from 'zod';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';

import { BaseCommand } from '../base-command';

const flagsSchema = z.object({
	output: z
		.string()
		.default('./nodes.json')
		.describe('Path to the output file for node types JSON'),
});

@Command({
	name: 'export:nodes',
	description: 'Export all node types to a JSON file',
	examples: ['', '--output=/tmp/nodes.json'],
	flagsSchema,
})
export class ExportNodes extends BaseCommand<z.infer<typeof flagsSchema>> {
	async run() {
		const outputPath = path.resolve(this.flags.output);
		const outputDir = path.dirname(outputPath);

		this.logger.info(`Exporting node types to ${outputPath}...`);

		// Ensure output directory exists
		await mkdir(outputDir, { recursive: true });

		const loadNodesAndCredentials = Container.get(LoadNodesAndCredentials);
		const { nodes } = loadNodesAndCredentials.types;

		this.logger.info(`Found ${nodes.length} node types`);

		// Write nodes to JSON file using streaming
		this.writeNodesJSON(outputPath, nodes);

		this.logger.info(`Successfully exported ${nodes.length} node types to ${outputPath}`);
	}

	private writeNodesJSON(filePath: string, nodes: INodeTypeBaseDescription[]) {
		const stream = createWriteStream(filePath, 'utf-8');
		stream.write('[\n');
		nodes.forEach((entry, index) => {
			stream.write(JSON.stringify(entry));
			if (index !== nodes.length - 1) stream.write(',');
			stream.write('\n');
		});
		stream.write(']\n');
		stream.end();
	}
}
