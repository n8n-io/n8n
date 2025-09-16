import type { Document } from '@langchain/core/documents';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { ChainValues } from '@langchain/core/utils/types';
import { PromptTemplate, type BasePromptTemplate } from '@langchain/core/prompts';
import { sleep } from 'n8n-workflow';

interface BatchedSummarizationChainParams {
	model: BaseLanguageModel;
	type: 'map_reduce' | 'stuff' | 'refine';
	batchSize?: number;
	delayBetweenBatches?: number;
	combineMapPrompt?: BasePromptTemplate;
	combinePrompt?: BasePromptTemplate;
	prompt?: BasePromptTemplate;
	refinePrompt?: BasePromptTemplate;
	questionPrompt?: BasePromptTemplate;
	verbose?: boolean;
}

export class BatchedSummarizationChain {
	private model: BaseLanguageModel;
	private type: 'map_reduce' | 'stuff' | 'refine';
	private batchSize: number;
	private delayBetweenBatches: number;
	private combineMapPrompt?: BasePromptTemplate;
	private combinePrompt?: BasePromptTemplate;
	private prompt?: BasePromptTemplate;
	private refinePrompt?: BasePromptTemplate;
	private questionPrompt?: BasePromptTemplate;

	constructor(params: BatchedSummarizationChainParams) {
		this.model = params.model;
		this.type = params.type;
		this.batchSize = params.batchSize ?? 1;
		this.delayBetweenBatches = params.delayBetweenBatches ?? 0;
		this.combineMapPrompt = params.combineMapPrompt;
		this.combinePrompt = params.combinePrompt;
		this.prompt = params.prompt;
		this.refinePrompt = params.refinePrompt;
		this.questionPrompt = params.questionPrompt;
	}

	async invoke(input: { input_documents: Document[] }): Promise<ChainValues> {
		const { input_documents: documents } = input;

		switch (this.type) {
			case 'map_reduce':
				return await this.mapReduce(documents);
			case 'stuff':
				return await this.stuff(documents);
			case 'refine':
				return await this.refine(documents);
			default:
				throw new Error(`Unknown summarization type: ${this.type}`);
		}
	}

	private async mapReduce(documents: Document[]): Promise<ChainValues> {
		// Map phase: summarize each document with batching
		const summaries = await this.processDocumentsInBatches(documents, this.combineMapPrompt);

		// Reduce phase: combine summaries
		const summaryDocs = summaries.map((summary, index) => ({
			pageContent: summary,
			metadata: { index },
		}));

		const combinePrompt = this.combinePrompt ?? this.getDefaultCombinePrompt();
		const combinedText = summaryDocs.map((doc) => doc.pageContent).join('\n\n');
		const finalSummary = await combinePrompt.format({ text: combinedText });

		const result = await this.model.invoke(finalSummary);
		return { output_text: typeof result === 'string' ? result : result.content };
	}

	private async stuff(documents: Document[]): Promise<ChainValues> {
		const prompt = this.prompt ?? this.getDefaultPrompt();
		const combinedText = documents.map((doc) => doc.pageContent).join('\n\n');
		const formattedPrompt = await prompt.format({ text: combinedText });

		const result = await this.model.invoke(formattedPrompt);
		return { output_text: typeof result === 'string' ? result : result.content };
	}

	private async refine(documents: Document[]): Promise<ChainValues> {
		if (documents.length === 0) {
			return { output_text: '' };
		}

		const questionPrompt = this.questionPrompt ?? this.getDefaultPrompt();
		const refinePrompt = this.refinePrompt ?? this.getDefaultRefinePrompt();

		// Initial summary from first document
		const firstDoc = documents[0];
		const initialPrompt = await questionPrompt.format({ text: firstDoc.pageContent });
		const currentSummary = await this.model.invoke(initialPrompt);
		let currentSummaryText =
			typeof currentSummary === 'string' ? currentSummary : currentSummary.content;

		// Process remaining documents with batching
		if (documents.length > 1) {
			const remainingDocs = documents.slice(1);

			for (let i = 0; i < remainingDocs.length; i += this.batchSize) {
				const batch = remainingDocs.slice(i, i + this.batchSize);

				for (const doc of batch) {
					const refineFormatted = await refinePrompt.format({
						existing_answer: currentSummaryText,
						text: doc.pageContent,
					});

					const refined = await this.model.invoke(refineFormatted);
					currentSummaryText = typeof refined === 'string' ? refined : refined.content;
				}

				// Add delay between batches if not the last batch
				if (i + this.batchSize < remainingDocs.length && this.delayBetweenBatches > 0) {
					await sleep(this.delayBetweenBatches);
				}
			}
		}

		return { output_text: currentSummaryText };
	}

	private async processDocumentsInBatches(
		documents: Document[],
		promptTemplate?: BasePromptTemplate,
	): Promise<string[]> {
		const prompt = promptTemplate ?? this.getDefaultPrompt();
		const summaries: string[] = [];

		for (let i = 0; i < documents.length; i += this.batchSize) {
			const batch = documents.slice(i, i + this.batchSize);

			const batchPromises = batch.map(async (doc) => {
				const formatted = await prompt.format({ text: doc.pageContent });
				const result = await this.model.invoke(formatted);
				return typeof result === 'string' ? result : result.content;
			});

			const batchResults = await Promise.all(batchPromises);
			summaries.push(...batchResults);

			// Add delay between batches if not the last batch
			if (i + this.batchSize < documents.length && this.delayBetweenBatches > 0) {
				await sleep(this.delayBetweenBatches);
			}
		}

		return summaries;
	}

	private getDefaultPrompt(): PromptTemplate {
		return new PromptTemplate({
			template: 'Write a concise summary of the following:\n\n{text}\n\nCONCISE SUMMARY:',
			inputVariables: ['text'],
		});
	}

	private getDefaultCombinePrompt(): PromptTemplate {
		return new PromptTemplate({
			template: 'Write a concise summary of the following text:\n\n{text}\n\nCONCISE SUMMARY:',
			inputVariables: ['text'],
		});
	}

	private getDefaultRefinePrompt(): PromptTemplate {
		return new PromptTemplate({
			template: `Your job is to produce a final summary.
We have provided an existing summary up to a certain point: {existing_answer}
We have the opportunity to refine the existing summary (only if needed) with some more context below.
------------
{text}
------------
Given the new context, refine the original summary. If the context isn't useful, return the original summary.`,
			inputVariables: ['existing_answer', 'text'],
		});
	}

	withConfig(_config: any): BatchedSummarizationChain {
		// For compatibility with LangChain's withConfig method
		// In a full implementation, this would apply the config
		return this;
	}
}
