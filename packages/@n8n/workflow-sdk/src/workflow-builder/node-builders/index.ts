// Node builder factories

// Core node builder
export {
	node,
	trigger,
	sticky,
	placeholder,
	newCredential,
	ifElse,
	switchCase,
	merge,
	isInputTarget,
	isIfElseBuilder,
	isSwitchCaseBuilder,
	type MergeFactoryConfig,
} from './node-builder';

// Subnode builders for AI/LangChain nodes
export {
	languageModel,
	memory,
	tool,
	outputParser,
	embedding,
	embeddings,
	vectorStore,
	retriever,
	documentLoader,
	textSplitter,
	reranker,
	fromAi,
} from './subnode-builders';
