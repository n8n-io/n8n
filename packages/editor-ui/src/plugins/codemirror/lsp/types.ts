import type { CompletionResult } from '@codemirror/autocomplete';
import type { Diagnostic } from '@codemirror/lint';
import type ts from 'typescript';
import type { Schema } from '@/Interface';
import type { CodeExecutionMode } from 'n8n-workflow';

export interface HoverInfo {
	start: number;
	end: number;
	typeDef?: readonly ts.DefinitionInfo[];
	quickInfo: ts.QuickInfo | undefined;
}

export type WorkerInitOptions = {
	id: string;
	content: string;
	allNodeNames: string[];
	inputNodeNames: string[];
	variables: string[];
	mode: CodeExecutionMode;
};

export type NodeDataFetcher = (
	nodeName: string,
) => Promise<{ json: Schema | undefined; binary: string[] } | undefined>;

export type LanguageServiceWorker = {
	init(options: WorkerInitOptions, nodeDataFetcher: NodeDataFetcher): Promise<void>;
	updateFile(content: string): void;
	updateMode(mode: CodeExecutionMode): void;
	updateNodeTypes(): void;
	getCompletionsAtPos(
		pos: number,
		wordBefore: string,
	): Promise<{ result: CompletionResult; isGlobal: boolean } | null>;
	getDiagnostics(): Diagnostic[];
	getHoverTooltip(pos: number): HoverInfo | null;
};
