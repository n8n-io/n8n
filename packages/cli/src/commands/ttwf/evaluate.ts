import { AiWorkflowBuilderService } from '@n8n/ai-workflow-builder';
import { Container } from '@n8n/di';
import { Flags } from '@oclif/core';
import fs from 'fs';
import { jsonParse, UserError } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

import { WorkerPool } from './worker-pool';
import { BaseCommand } from '../base-command';

interface WorkflowGeneratedMessage {
	role: 'assistant';
	type: 'workflow-generated';
	codeSnippet: string;
}

interface WorkflowGenerationDatasetItem {
	prompt: string;
	referenceWorkflow: string;
}

async function waitForWorkflowGenerated(aiResponse: AsyncGenerator<{ messages: any[] }>) {
	let workflowJson: string | undefined;

	for await (const chunk of aiResponse) {
		const wfGeneratedMessage = chunk.messages.find(
			(m): m is WorkflowGeneratedMessage =>
				'type' in m && (m as { type?: string }).type === 'workflow-generated',
		);

		if (wfGeneratedMessage?.codeSnippet) {
			workflowJson = wfGeneratedMessage.codeSnippet;
		}
	}

	if (!workflowJson) {
		// FIXME: Use proper error class
		throw new UserError('No workflow generated message found in AI response');
	}

	return workflowJson;
}

export class EvaluateTTWFCommand extends BaseCommand {
	static description = '\nEvaluate AI Text-to-Workflow builder';

	static examples = ['$ n8n ttwf:evaluate'];

	static flags = {
		help: Flags.help({ char: 'h' }),
		input: Flags.string({
			char: 'i',
			description: 'Input dataset file name',
		}),
		output: Flags.string({
			char: 'o',
			description: 'Output file name to save the results',
			default: 'ttwf-evaluation-results.jsonl',
		}),
		limit: Flags.integer({
			char: 'l',
			description: 'Number of items from the dataset to process',
			default: 2,
		}),
		concurrency: Flags.integer({
			char: 'c',
			description: 'Number of items to process in parallel',
			default: 1,
		}),
	};

	/**
	 * Reads the dataset file in JSONL format
	 */
	private async readDataset(filePath: string): Promise<WorkflowGenerationDatasetItem[]> {
		try {
			const data = await fs.promises.readFile(filePath, { encoding: 'utf-8' });

			const lines = data.split('\n').filter((line) => line.trim() !== '');

			if (lines.length === 0) {
				throw new UserError('Dataset file is empty or contains no valid lines');
			}

			return lines.map((line, index) => {
				try {
					return jsonParse<WorkflowGenerationDatasetItem>(line);
				} catch (error) {
					throw new UserError(`Invalid JSON line on index: ${index}`);
				}
			});
		} catch (error) {
			throw new UserError(`Failed to read dataset file: ${error}`);
		}
	}

	async run() {
		const { flags } = await this.parse(EvaluateTTWFCommand);

		if (!flags.input) {
			this.logger.info('An input dataset file --input must be provided');
			return;
		}

		if (fs.existsSync(flags.output)) {
			if (fs.lstatSync(flags.output).isDirectory()) {
				this.logger.info('The parameter --output must be a writeable file');
				return;
			}

			this.logger.warn('The output file already exists. It will be overwritten.');
			fs.unlinkSync(flags.output);
		}

		const nodeTypes = Container.get(NodeTypes);
		const wfBuilder = new AiWorkflowBuilderService(nodeTypes);

		// const wfBuilderEvaluator = new AiWorkflowBuilderEvaluatorService();

		const pool = new WorkerPool<string>(flags.concurrency);

		const dataset = await this.readDataset(flags.input);

		// Open file for writing results
		const outputStream = fs.createWriteStream(flags.output, { flags: 'a' });

		await Promise.allSettled(
			dataset.slice(0, flags.limit).map(async (item) => {
				try {
					const generatedWorkflow = await pool.execute(async () => {
						this.logger.info(`Processing prompt: ${item.prompt}`);

						const aiResponse = wfBuilder.chat({ question: item.prompt });

						return await waitForWorkflowGenerated(aiResponse);
					});

					this.logger.info(`Generated workflow for prompt: ${item.prompt}`);

					// Write the generated workflow to the output file
					outputStream.write(
						JSON.stringify({
							prompt: item.prompt,
							generatedWorkflow,
							referenceWorkflow: item.referenceWorkflow,
						}) + '\n',
					);
				} catch (e) {
					const errorMessage = e instanceof UserError ? e.message : 'An error occurred';
					this.logger.error(`Error processing prompt "${item.prompt}": ${errorMessage}`);
					// Optionally write the error to the output file
					outputStream.write(
						JSON.stringify({
							prompt: item.prompt,
							referenceWorkflow: item.referenceWorkflow,
							errorMessage,
						}) + '\n',
					);
				}
			}),
		);

		// for (const item of dataset.slice(0, flags.limit)) {
		// 	this.logger.info(`Processing prompt: ${item.prompt}`);
		// 	this.logger.info(`Reference workflow: ${item.referenceWorkflow}`);
		//
		// 	try {
		// 		// Generate the workflow based on the prompt
		// 		const aiResponse = wfBuilder.chat({ question: item.prompt });
		//
		// 		const wf = await waitForWorkflowGenerated(aiResponse);
		// 		this.logger.info(`Generated workflow: ${wf}`);
		//
		// 		// Score the generated workflow against the reference workflow
		// 		const scores = await wfBuilderEvaluator.scoreGeneratedWorkflow(
		// 			jsonParse<SimpleWorkflow>(wf),
		// 			jsonParse<SimpleWorkflow>(item.referenceWorkflow),
		// 		);
		//
		// 		console.log(scores);
		// 	} catch (e) {}
		// }
	}

	async catch(error: Error) {
		this.logger.error('\nGOT ERROR');
		this.logger.error('====================================');
		this.logger.error(error.message);
		this.logger.error(error.stack!);
	}
}
