import type { SemanticGraph } from '../types';

export interface DataFlowGeneratorContext {
	indent: number;
	graph: SemanticGraph;
	nodeNameToVarName: Map<string, string>;
	usedVarNames: Set<string>;
}
