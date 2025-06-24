import type { SimpleWorkflow } from '@n8n/ai-workflow-builder';
import {
	AiWorkflowBuilderService,
	AiWorkflowBuilderEvaluatorService,
} from '@n8n/ai-workflow-builder';
import { Container } from '@n8n/di';
import { Flags } from '@oclif/core';
import fs from 'fs';
import { jsonParse, UserError } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

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
		limit: Flags.integer({
			char: 'l',
			description: 'Number of items from the dataset to process',
			default: 2,
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

		const nodeTypes = Container.get(NodeTypes);
		const wfBuilder = new AiWorkflowBuilderService(nodeTypes);

		const wfBuilderEvaluator = new AiWorkflowBuilderEvaluatorService();

		const dataset = await this.readDataset(flags.input);

		for (const item of dataset.slice(0, flags.limit)) {
			this.logger.info(`Processing prompt: ${item.prompt}`);
			this.logger.info(`Reference workflow: ${item.referenceWorkflow}`);

			// Generate the workflow based on the prompt
			const aiResponse = wfBuilder.chat({ question: item.prompt });

			const wf = await waitForWorkflowGenerated(aiResponse);
			this.logger.info(`Generated workflow: ${wf}`);

			// Score the generated workflow against the reference workflow
			const scores = await wfBuilderEvaluator.scoreGeneratedWorkflow(
				jsonParse<SimpleWorkflow>(wf),
				jsonParse<SimpleWorkflow>(item.referenceWorkflow),
			);

			console.log(scores);
		}
	}

	async catch(error: Error) {
		this.logger.error('\nGOT ERROR');
		this.logger.error('====================================');
		this.logger.error(error.message);
		this.logger.error(error.stack!);
	}
}
