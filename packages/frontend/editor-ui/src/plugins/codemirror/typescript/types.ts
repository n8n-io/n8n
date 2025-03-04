import type { Schema } from '@/Interface';
import type { CompletionResult } from '@codemirror/autocomplete';
import type { Diagnostic } from '@codemirror/lint';
import type { CodeExecutionMode } from 'n8n-workflow';
import type ts from 'typescript';
import type * as Comlink from 'comlink';
import type { ChangeSet } from '@codemirror/state';

export interface HoverInfo {
	start: number;
	end: number;
	typeDef?: readonly ts.DefinitionInfo[];
	quickInfo: ts.QuickInfo | undefined;
}

export type WorkerInitOptions = {
	id: string;
	content: string[];
	allNodeNames: string[];
	inputNodeNames: string[];
	variables: string[];
	mode: CodeExecutionMode;
};

export type NodeData = { json: Schema | undefined; binary: string[]; params: Schema };
export type NodeDataFetcher = (nodeName: string) => Promise<NodeData | undefined>;

export type LanguageServiceWorker = {
	updateFile(changes: ChangeSet): void;
	updateMode(mode: CodeExecutionMode): void;
	updateNodeTypes(): void;
	getCompletionsAtPos(pos: number): Promise<{ result: CompletionResult; isGlobal: boolean } | null>;
	getDiagnostics(): Diagnostic[];
	getHoverTooltip(pos: number): HoverInfo | null;
};

export type LanguageServiceWorkerInit = {
	init(
		options: WorkerInitOptions,
		nodeDataFetcher: NodeDataFetcher,
	): Promise<LanguageServiceWorker>;
};

export type RemoteLanguageServiceWorkerInit = {
	init(
		options: WorkerInitOptions,
		nodeDataFetcher: NodeDataFetcher,
	): Comlink.Remote<LanguageServiceWorker>;
};
