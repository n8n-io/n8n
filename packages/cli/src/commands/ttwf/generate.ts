import { Command } from '@n8n/decorators';
import { z } from 'zod';

import { BaseCommand } from '../base-command';

// interface WorkflowGenerationDatasetItem {
// 	prompt: string;
// 	referenceWorkflow: string;
// }
// We'll use this later for evals
// async function _waitForWorkflowGenerated(aiResponse: AsyncGenerator<{ messages: any[] }>) {
// 	let workflowJson: string | undefined;

// 	for await (const chunk of aiResponse) {
// 		const wfGeneratedMessage = chunk.messages.find(
// 			(m): m is WorkflowGeneratedMessage =>
// 				'type' in m && (m as { type?: string }).type === 'workflow-generated',
// 		);

// 		if (wfGeneratedMessage?.codeSnippet) {
// 			workflowJson = wfGeneratedMessage.codeSnippet;
// 		}
// 	}

// 	if (!workflowJson) {
// 		// FIXME: Use proper error class
// 		throw new UserError('No workflow generated message found in AI response');
// 	}

// 	return workflowJson;
// }

const flagsSchema = z.object({
	prompt: z
		.string()
		.alias('p')
		.describe('Prompt to generate a workflow from. Mutually exclusive with --input.')
		.optional(),
	input: z
		.string()
		.alias('i')
		.describe('Input dataset file name. Mutually exclusive with --prompt.')
		.optional(),
	output: z
		.string()
		.alias('o')
		.describe('Output file name to save the results. Default is ttwf-results.jsonl')
		.default('ttwf-results.jsonl'),
	limit: z
		.number()
		.int()
		.alias('l')
		.describe('Number of items from the dataset to process. Only valid with --input.')
		.default(-1),
	concurrency: z
		.number()
		.int()
		.alias('c')
		.describe('Number of items to process in parallel. Only valid with --input.')
		.default(1),
});

@Command({
	name: 'ttwf:generate',
	description: 'Create a workflow(s) using AI Text-to-Workflow builder',
	examples: [
		'$ n8n ttwf:generate --prompt "Create a telegram chatbot that can tell current weather in Berlin" --output result.json',
		'$ n8n ttwf:generate --input dataset.jsonl --output results.jsonl',
	],
	flagsSchema,
})
export class TTWFGenerateCommand extends BaseCommand<z.infer<typeof flagsSchema>> {
	/**
	 * Reads the dataset file in JSONL format
	 */
	// We'll use this later for evals
	// private async readDataset(filePath: string): Promise<WorkflowGenerationDatasetItem[]> {
	// 	try {
	// 		const data = await fs.promises.readFile(filePath, { encoding: 'utf-8' });

	// 		const lines = data.split('\n').filter((line) => line.trim() !== '');

	// 		if (lines.length === 0) {
	// 			throw new UserError('Dataset file is empty or contains no valid lines');
	// 		}

	// 		return lines.map((line, index) => {
	// 			try {
	// 				return jsonParse<WorkflowGenerationDatasetItem>(line);
	// 			} catch (error) {
	// 				throw new UserError(`Invalid JSON line on index: ${index}`);
	// 			}
	// 		});
	// 	} catch (error) {
	// 		throw new UserError(`Failed to read dataset file: ${error}`);
	// 	}
	// }

	async run() {
		this.logger.error(
			'This command is displayed until all ai-workflow builder related PR are merged',
		);
		// const { flags } = this;

		// if (!flags.input && !flags.prompt) {
		// 	throw new UserError('Either --input or --prompt must be provided.');
		// }

		// if (flags.input && flags.prompt) {
		// 	throw new UserError('You cannot use --input and --prompt together. Use one or the other.');
		// }

		// const nodeTypes = Container.get(NodeTypes);
		// const wfBuilder = new AiWorkflowBuilderService(nodeTypes);

		// if (flags.prompt) {
		// 	// Single prompt mode
		// 	if (flags.output && fs.existsSync(flags.output)) {
		// 		if (fs.lstatSync(flags.output).isDirectory()) {
		// 			this.logger.info('The parameter --output must be a writeable file');
		// 			return;
		// 		}

		// 		this.logger.warn('The output file already exists. It will be overwritten.');
		// 		fs.unlinkSync(flags.output);
		// 	}

		// 	try {
		// 		this.logger.info(`Processing prompt: ${flags.prompt}`);

		// 		const aiResponse = wfBuilder.chat({ question: flags.prompt });

		// 		const generatedWorkflow = await waitForWorkflowGenerated(aiResponse);

		// 		this.logger.info(`Generated workflow for prompt: ${flags.prompt}`);

		// 		if (flags.output) {
		// 			fs.writeFileSync(flags.output, generatedWorkflow);
		// 			this.logger.info(`Workflow saved to ${flags.output}`);
		// 		} else {
		// 			this.logger.info('Generated Workflow:');
		// 			// Pretty print JSON
		// 			this.logger.info(JSON.stringify(JSON.parse(generatedWorkflow), null, 2));
		// 		}
		// 	} catch (e) {
		// 		const errorMessage = e instanceof Error ? e.message : 'An error occurred';
		// 		this.logger.error(`Error processing prompt "${flags.prompt}": ${errorMessage}`);
		// 	}
		// } else if (flags.input) {
		// 	// Batch mode
		// 	const output = flags.output ?? 'ttwf-results.jsonl';
		// 	if (fs.existsSync(output)) {
		// 		if (fs.lstatSync(output).isDirectory()) {
		// 			this.logger.info('The parameter --output must be a writeable file');
		// 			return;
		// 		}

		// 		this.logger.warn('The output file already exists. It will be overwritten.');
		// 		fs.unlinkSync(output);
		// 	}

		// 	const pool = new WorkerPool<string>(flags.concurrency ?? 1);

		// 	const dataset = await this.readDataset(flags.input);

		// 	// Open file for writing results
		// 	const outputStream = fs.createWriteStream(output, { flags: 'a' });

		// 	const datasetWithLimit = (flags.limit ?? -1) > 0 ? dataset.slice(0, flags.limit) : dataset;

		// 	await Promise.allSettled(
		// 		datasetWithLimit.map(async (item) => {
		// 			try {
		// 				const generatedWorkflow = await pool.execute(async () => {
		// 					this.logger.info(`Processing prompt: ${item.prompt}`);

		// 					const aiResponse = wfBuilder.chat({ question: item.prompt });

		// 					return await waitForWorkflowGenerated(aiResponse);
		// 				});

		// 				this.logger.info(`Generated workflow for prompt: ${item.prompt}`);

		// 				// Write the generated workflow to the output file
		// 				outputStream.write(
		// 					JSON.stringify({
		// 						prompt: item.prompt,
		// 						generatedWorkflow,
		// 						referenceWorkflow: item.referenceWorkflow,
		// 					}) + '\n',
		// 				);
		// 			} catch (e) {
		// 				const errorMessage = e instanceof Error ? e.message : 'An error occurred';
		// 				this.logger.error(`Error processing prompt "${item.prompt}": ${errorMessage}`);
		// 				// Optionally write the error to the output file
		// 				outputStream.write(
		// 					JSON.stringify({
		// 						prompt: item.prompt,
		// 						referenceWorkflow: item.referenceWorkflow,
		// 						errorMessage,
		// 					}) + '\n',
		// 				);
		// 			}
		// 		}),
		// 	);

		// 	outputStream.end();
		// }
	}

	async catch(error: Error) {
		this.logger.error('\nGOT ERROR');
		this.logger.error('====================================');
		this.logger.error(error.message);
		this.logger.error(error.stack!);
	}
}
