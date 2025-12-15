#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { jsonParse } from 'n8n-workflow';
import { basename, dirname, join } from 'path';
import pc from 'picocolors';

import { mermaidStringify, type MermaidOptions } from '@/tools/utils/markdown-workflow.utils';
import type { WorkflowMetadata } from '@/types';
import type { SimpleWorkflow } from '@/types/workflow';

/**
 * Type guard to check if value is a direct workflow format (nodes and connections at root)
 */
function isDirectWorkflowFormat(value: unknown): value is SimpleWorkflow & { name?: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'nodes' in value &&
		'connections' in value &&
		Array.isArray((value as Record<string, unknown>).nodes)
	);
}

/**
 * Type guard to check if value is a WorkflowMetadata format (nested workflow object)
 */
function isWorkflowMetadataFormat(
	value: unknown,
): value is { workflow: SimpleWorkflow; name?: string } {
	if (typeof value !== 'object' || value === null || !('workflow' in value)) {
		return false;
	}
	const workflow = (value as Record<string, unknown>).workflow;
	return isDirectWorkflowFormat(workflow);
}

interface CliOptions {
	inputFile: string;
	outputFile?: string;
	includeNodeName: boolean;
	includeNodeType: boolean;
	includeNodeParameters: boolean;
}

function printUsage(): void {
	console.log(`
${pc.bold('Usage:')} workflow-to-mermaid <workflow.json> [options]

${pc.bold('Description:')}
  Converts a n8n workflow JSON file to a Mermaid flowchart diagram.
  By default, outputs to a markdown file with the same name in the same directory.

${pc.bold('Options:')}
  -o, --output <file>     Output file path (default: same name as input with .md extension)
  --no-node-name          Exclude node names from diagram
  --no-node-type          Exclude node types from diagram comments
  --node-params           Include node parameters in diagram comments
  -h, --help              Show this help message

${pc.bold('Examples:')}
  workflow-to-mermaid my-workflow.json
  workflow-to-mermaid my-workflow.json -o output.md
  workflow-to-mermaid my-workflow.json --no-node-type --node-params
`);
}

interface ParseResult {
	options?: CliOptions;
	exitCode?: number;
}

function parseArgs(args: string[]): ParseResult {
	const cliArgs = args.slice(2);

	if (cliArgs.length === 0 || cliArgs.includes('-h') || cliArgs.includes('--help')) {
		printUsage();
		return { exitCode: 0 };
	}

	const options: CliOptions = {
		inputFile: '',
		includeNodeName: true,
		includeNodeType: true,
		includeNodeParameters: false,
	};

	let i = 0;
	while (i < cliArgs.length) {
		const arg = cliArgs[i];

		if (arg === '-o' || arg === '--output') {
			i++;
			if (i >= cliArgs.length) {
				console.error(pc.red('Error: --output requires a file path'));
				return { exitCode: 1 };
			}
			options.outputFile = cliArgs[i];
		} else if (arg === '--no-node-name') {
			options.includeNodeName = false;
		} else if (arg === '--no-node-type') {
			options.includeNodeType = false;
		} else if (arg === '--node-params') {
			options.includeNodeParameters = true;
		} else if (arg.startsWith('-')) {
			console.error(pc.red(`Error: Unknown option: ${arg}`));
			printUsage();
			return { exitCode: 1 };
		} else if (!options.inputFile) {
			options.inputFile = arg;
		} else {
			console.error(pc.red(`Error: Unexpected argument: ${arg}`));
			printUsage();
			return { exitCode: 1 };
		}
		i++;
	}

	if (!options.inputFile) {
		console.error(pc.red('Error: Input file is required'));
		printUsage();
		return { exitCode: 1 };
	}

	return { options };
}

function loadWorkflow(filePath: string): WorkflowMetadata {
	const content = readFileSync(filePath, 'utf-8');
	const json: unknown = jsonParse(content);

	// Handle both formats:
	// 1. Direct workflow format: { nodes: [...], connections: {...}, name?: string }
	// 2. WorkflowMetadata format: { workflow: { nodes: [...], connections: {...} }, name?: string }
	if (isDirectWorkflowFormat(json)) {
		const name = json.name ?? basename(filePath, '.json');
		return {
			name,
			workflow: {
				name,
				nodes: json.nodes,
				connections: json.connections,
			},
		};
	}

	if (isWorkflowMetadataFormat(json)) {
		const workflowName = json.workflow.name ?? basename(filePath, '.json');
		return {
			name: json.name ?? workflowName,
			workflow: {
				name: workflowName,
				nodes: json.workflow.nodes,
				connections: json.workflow.connections,
			},
		};
	}

	throw new Error(
		'Invalid workflow format: expected nodes and connections at root or under workflow key',
	);
}

function main(): void {
	const result = parseArgs(process.argv);
	if (result.exitCode !== undefined) {
		process.exit(result.exitCode);
	}

	const options = result.options!;

	try {
		console.log(pc.blue(`\nLoading workflow from: ${options.inputFile}`));

		const workflow = loadWorkflow(options.inputFile);

		const mermaidOptions: MermaidOptions = {
			includeNodeName: options.includeNodeName,
			includeNodeType: options.includeNodeType,
			includeNodeParameters: options.includeNodeParameters,
			collectNodeConfigurations: false,
		};

		console.log(
			pc.dim(
				`  Options: name=${mermaidOptions.includeNodeName}, type=${mermaidOptions.includeNodeType}, params=${mermaidOptions.includeNodeParameters}`,
			),
		);

		const mermaid = mermaidStringify(workflow, mermaidOptions);

		// Determine output file path
		const outputFile =
			options.outputFile ??
			join(dirname(options.inputFile), basename(options.inputFile, '.json') + '.md');

		// Write markdown file with mermaid content
		const markdownContent = `# ${workflow.name}\n\n${mermaid}\n`;
		writeFileSync(outputFile, markdownContent);

		const nodeCount = workflow.workflow.nodes.filter(
			(n) => n.type !== 'n8n-nodes-base.stickyNote',
		).length;

		console.log(pc.green('\n✓ Successfully converted workflow to Mermaid!'));
		console.log(pc.dim(`  Nodes: ${nodeCount}`));
		console.log(pc.dim(`  Output: ${outputFile}\n`));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(pc.red(`\n✗ Error: ${message}\n`));
		process.exit(1);
	}
}

main();
