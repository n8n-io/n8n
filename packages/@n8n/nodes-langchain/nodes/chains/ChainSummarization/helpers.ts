import { PromptTemplate } from '@langchain/core/prompts';
import type { SummarizationChainParams } from 'langchain/chains';
interface ChainTypeOptions {
	combineMapPrompt?: string;
	prompt?: string;
	refinePrompt?: string;
	refineQuestionPrompt?: string;
}

export function getChainPromptsArgs(
	type: 'stuff' | 'map_reduce' | 'refine',
	options: ChainTypeOptions,
) {
	const chainArgs: SummarizationChainParams = {
		type,
	};
	// Map reduce prompt override
	if (type === 'map_reduce') {
		const mapReduceArgs = chainArgs as SummarizationChainParams & {
			type: 'map_reduce';
		};
		if (options.combineMapPrompt) {
			mapReduceArgs.combineMapPrompt = new PromptTemplate({
				template: options.combineMapPrompt,
				inputVariables: ['text'],
			});
		}
		if (options.prompt) {
			mapReduceArgs.combinePrompt = new PromptTemplate({
				template: options.prompt,
				inputVariables: ['text'],
			});
		}
	}

	// Stuff prompt override
	if (type === 'stuff') {
		const stuffArgs = chainArgs as SummarizationChainParams & {
			type: 'stuff';
		};
		if (options.prompt) {
			stuffArgs.prompt = new PromptTemplate({
				template: options.prompt,
				inputVariables: ['text'],
			});
		}
	}

	// Refine prompt override
	if (type === 'refine') {
		const refineArgs = chainArgs as SummarizationChainParams & {
			type: 'refine';
		};

		if (options.refinePrompt) {
			refineArgs.refinePrompt = new PromptTemplate({
				template: options.refinePrompt,
				inputVariables: ['existing_answer', 'text'],
			});
		}

		if (options.refineQuestionPrompt) {
			refineArgs.questionPrompt = new PromptTemplate({
				template: options.refineQuestionPrompt,
				inputVariables: ['text'],
			});
		}
	}

	return chainArgs;
}
