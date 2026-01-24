/**
 * TypeScript compiler integration for code-level type checking.
 *
 * This module wraps generated TypeScript SDK code and runs the TypeScript
 * compiler to detect type errors before code execution.
 *
 * Uses SDK_API_CONTENT to provide actual SDK type definitions for validation.
 * Also loads generated node types from ~/.n8n/generated-types/ to validate
 * that node type names are valid.
 */

import * as ts from 'typescript';
import { SDK_API_CONTENT } from '@n8n/workflow-sdk';

import type { CodeViolation, CodeViolationName } from './violations';
import { getNodeTypeDeclarations } from './node-types-loader';

export interface TypeCheckResult {
	violations: CodeViolation[];
	score: number;
}

/** Virtual file paths for the in-memory file system */
const GENERATED_FILE = '/generated-workflow.ts';
const SDK_TYPES_FILE = '/node_modules/@n8n/workflow-sdk/index.d.ts';

/** Number of lines in the wrapper code before user's code starts */
const WRAPPER_OFFSET_LINES = 9;

/**
 * Function declarations to append to SDK_API_CONTENT.
 * SDK_API_CONTENT only contains type definitions (WorkflowFn, NodeFn, etc.),
 * but generated code imports the actual functions (workflow, node, etc.).
 * These declarations bridge that gap.
 *
 * We also add a TypedNodeFn that validates node types against KnownNodeType.
 */
const SDK_FUNCTION_DECLARATIONS = `

// =============================================================================
// Generated Node Type Declarations
// =============================================================================

// KnownNodeType is loaded from ~/.n8n/generated-types/ and appended here

// =============================================================================
// Type-Safe Node Input (validates node type is known)
// =============================================================================

/**
 * Node input with validated type field.
 * The type must be a known node type string.
 */
interface TypedNodeInput<
	TType extends KnownNodeType = KnownNodeType,
	TVersion extends number = number,
	TParams = unknown,
> {
	/** Node type (must be a known node type) */
	type: TType;
	/** Node version */
	version: TVersion;
	/** Node configuration */
	config: NodeConfig<TParams>;
}

/**
 * Trigger input with validated type field.
 */
interface TypedTriggerInput<
	TType extends KnownNodeType = KnownNodeType,
	TVersion extends number = number,
	TParams = unknown,
> {
	/** Trigger type (must be a known node type) */
	type: TType;
	/** Trigger version */
	version: TVersion;
	/** Trigger configuration */
	config: NodeConfig<TParams>;
}

/**
 * Type-safe node function that validates the type field.
 */
type TypedNodeFn = <TNode extends TypedNodeInput>(
	input: TNode,
) => NodeInstance<TNode['type'], \`\${TNode['version']}\`, unknown>;

/**
 * Type-safe trigger function that validates the type field.
 */
type TypedTriggerFn = <TTrigger extends TypedTriggerInput>(
	input: TTrigger,
) => TriggerInstance<TTrigger['type'], \`\${TTrigger['version']}\`, unknown>;

// =============================================================================
// Function Declarations (for type checking generated code)
// =============================================================================

/** Create a workflow builder */
export declare const workflow: WorkflowFn;

/** Create a node instance (validates node type) */
export declare const node: TypedNodeFn;

/** Create a trigger node instance (validates trigger type) */
export declare const trigger: TypedTriggerFn;

/** Create a sticky note */
export declare const sticky: StickyFn;

/** Create a placeholder value */
export declare const placeholder: PlaceholderFn;

/** Create a new credential marker */
export declare const newCredential: NewCredentialFn;

/** Create a merge composite */
export declare const merge: MergeFn;

/** Create an IF/ELSE composite */
export declare const ifElse: IfElseFn;

/** Create a switch/case composite */
export declare const switchCase: SwitchCaseFn;

/** Create a split in batches builder */
export declare const splitInBatches: SplitInBatchesFn;

/** Create a language model subnode */
export declare const languageModel: LanguageModelFn;

/** Create a memory subnode */
export declare const memory: MemoryFn;

/** Create a tool subnode */
export declare const tool: ToolFn;

/** Create an output parser subnode */
export declare const outputParser: OutputParserFn;

/** Create an embedding subnode */
export declare const embedding: EmbeddingFn;

/** Create a vector store subnode */
export declare const vectorStore: VectorStoreFn;

/** Create a retriever subnode */
export declare const retriever: RetrieverFn;

/** Create a document loader subnode */
export declare const documentLoader: DocumentLoaderFn;

/** Create a text splitter subnode */
export declare const textSplitter: TextSplitterFn;

/** Code helper for processing all items at once */
export declare const runOnceForAllItems: RunOnceForAllItemsFn;

/** Code helper for processing each item */
export declare const runOnceForEachItem: RunOnceForEachItemFn;

/** Fan out to multiple parallel nodes */
export declare function fanOut<T extends NodeInstance<string, string, unknown>[]>(targets: T): { __fanOut: true; targets: T };

/** Fan in from multiple nodes */
export declare function fanIn<T extends NodeInstance<string, string, unknown>[]>(sources: T): { __fanIn: true; sources: T };
`;

/**
 * Type-check generated TypeScript code against SDK types.
 * Creates an in-memory TypeScript program with the SDK types available.
 */
export function typeCheckCode(code: string): TypeCheckResult {
	// Wrap code in a function with SDK imports to make it valid TypeScript
	const wrappedCode = `
import {
  workflow, node, trigger, sticky, placeholder, newCredential,
  languageModel, memory, tool, outputParser, embedding, vectorStore,
  retriever, documentLoader, textSplitter, merge, ifElse, switchCase,
  splitInBatches, fanOut, fanIn, runOnceForAllItems, runOnceForEachItem
} from '@n8n/workflow-sdk';

export default function createWorkflow() {
  ${code}
}
`;

	// Create virtual source files
	const generatedSourceFile = ts.createSourceFile(
		GENERATED_FILE,
		wrappedCode,
		ts.ScriptTarget.ES2020,
		true,
	);

	// Get the node type declarations (KnownNodeType union)
	const nodeTypeDeclarations = getNodeTypeDeclarations();

	// Combine SDK_API_CONTENT with node types and function declarations
	// SDK_API_CONTENT has the type definitions, node types add KnownNodeType,
	// SDK_FUNCTION_DECLARATIONS has the function exports with type-safe wrappers
	const sdkTypesContent =
		SDK_API_CONTENT + '\n\n' + nodeTypeDeclarations + '\n' + SDK_FUNCTION_DECLARATIONS;
	const sdkSourceFile = ts.createSourceFile(
		SDK_TYPES_FILE,
		sdkTypesContent,
		ts.ScriptTarget.ES2020,
		true,
	);

	// Map of virtual files
	const virtualFiles = new Map<string, ts.SourceFile>([
		[GENERATED_FILE, generatedSourceFile],
		[SDK_TYPES_FILE, sdkSourceFile],
	]);

	// Compiler options for strict type checking
	const compilerOptions: ts.CompilerOptions = {
		target: ts.ScriptTarget.ES2020,
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.NodeNext,
		strict: true,
		skipLibCheck: true,
		noEmit: true,
		esModuleInterop: true,
		// Tell TS where to find our virtual SDK module
		baseUrl: '/',
		paths: {
			'@n8n/workflow-sdk': ['/node_modules/@n8n/workflow-sdk/index.d.ts'],
		},
	};

	// Create compiler host with virtual file system
	const host: ts.CompilerHost = {
		getSourceFile: (name, _languageVersion) => virtualFiles.get(name),
		getDefaultLibFileName: () => 'lib.d.ts',
		writeFile: () => {},
		getCurrentDirectory: () => '/',
		getCanonicalFileName: (f) => f,
		useCaseSensitiveFileNames: () => true,
		getNewLine: () => '\n',
		fileExists: (name) => virtualFiles.has(name) || name === 'lib.d.ts',
		readFile: (name) => {
			const file = virtualFiles.get(name);
			return file ? file.text : undefined;
		},
		resolveModuleNames: (moduleNames, _containingFile) => {
			return moduleNames.map((moduleName) => {
				// Resolve @n8n/workflow-sdk to our virtual SDK types file
				if (moduleName === '@n8n/workflow-sdk') {
					return {
						resolvedFileName: SDK_TYPES_FILE,
						isExternalLibraryImport: false,
					};
				}
				return undefined;
			});
		},
		directoryExists: () => true,
		getDirectories: () => [],
	};

	// Create program and get diagnostics
	const program = ts.createProgram([GENERATED_FILE], compilerOptions, host);
	const diagnostics = [...program.getSyntacticDiagnostics(), ...program.getSemanticDiagnostics()];

	// Convert diagnostics to violations
	const violations: CodeViolation[] = [];

	for (const diagnostic of diagnostics) {
		const messageText = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

		// Skip lib.d.ts related errors (we're not providing full lib types)
		if (
			messageText.includes("Cannot find name 'Array'") ||
			messageText.includes("Cannot find name 'Promise'") ||
			messageText.includes('Cannot find global type')
		) {
			continue;
		}

		const severity = mapDiagnosticCategory(diagnostic.category);

		let lineNumber: number | undefined;
		let column: number | undefined;

		if (diagnostic.file && diagnostic.start !== undefined) {
			const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
			// Adjust for wrapper code offset
			lineNumber = Math.max(1, line - WRAPPER_OFFSET_LINES);
			column = character + 1;
		}

		violations.push({
			name: mapDiagnosticToViolationName(diagnostic.code),
			type: severity,
			description: messageText,
			lineNumber,
			column,
			pointsDeducted: severity === 'critical' ? 0.3 : severity === 'major' ? 0.15 : 0.05,
		});
	}

	// Calculate score
	const totalDeductions = violations.reduce((sum, v) => sum + v.pointsDeducted, 0);
	const score = Math.max(0, 1 - totalDeductions);

	return { violations, score };
}

function mapDiagnosticCategory(category: ts.DiagnosticCategory): 'critical' | 'major' | 'minor' {
	switch (category) {
		case ts.DiagnosticCategory.Error:
			return 'critical';
		case ts.DiagnosticCategory.Warning:
			return 'major';
		default:
			return 'minor';
	}
}

function mapDiagnosticToViolationName(code: number): CodeViolationName {
	// Map common TS error codes to violation names
	// TS2304: Cannot find name 'X'
	if (code === 2304) return 'undefined-identifier';
	// TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'
	if (code === 2345) return 'incompatible-type';
	// TS2339: Property 'X' does not exist on type 'Y'
	if (code === 2339) return 'unknown-property';
	// TS2554: Expected X arguments, but got Y
	if (code === 2554) return 'missing-required-parameter';
	// TS2322: Type 'X' is not assignable to type 'Y'
	if (code === 2322) return 'incompatible-type';
	// Syntax errors (1xxx range)
	if (code >= 1000 && code < 2000) return 'syntax-error';

	return 'type-error';
}
