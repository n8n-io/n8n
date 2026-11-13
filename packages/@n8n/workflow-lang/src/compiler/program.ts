import ts from 'typescript';

import { PRELUDE_SOURCES, SDK_SOURCE } from '../generated/sources.generated.ts';
import { selectNodeSources } from '../library/node-sources.ts';
import { LIB_DTS } from './lib-dts.ts';

export const WORKFLOW_FILE = '/workflow.ts';
export const SDK_FILE = '/sdk/index.ts';
export const LIB_FILE = '/lib.workflow.d.ts';

export const COMPILER_OPTIONS: ts.CompilerOptions = {
	target: ts.ScriptTarget.ES2022,
	module: ts.ModuleKind.ESNext,
	moduleResolution: ts.ModuleResolutionKind.Bundler,
	noLib: true,
	strict: true,
	noEmit: true,
	useUnknownInCatchVariables: false,
	allowImportingTsExtensions: true,
	types: [],
	skipLibCheck: true,
};

/** Parsed files that do not change between compiles, by virtual path. */
const sharedFiles = new Map<string, ts.SourceFile>();

export interface ProgramInput {
	/** Allows implicit `any`, for legacy JavaScript expressions. */
	looseTypes?: boolean;
	/** Path of the workflow file in the virtual file system. */
	fileName?: string;
	source: string;
	/** Prelude sources by virtual path. The default is the bundled prelude. */
	prelude?: Record<string, string>;
	/** Node library sources by virtual path. The default is the bundled library. */
	nodes?: Record<string, string>;
}

export interface WorkflowProgram {
	program: ts.Program;
	checker: ts.TypeChecker;
	workflowFile: ts.SourceFile;
	preludeFiles: ts.SourceFile[];
	nodeFiles: ts.SourceFile[];
	sdkFile: ts.SourceFile;
}

/**
 * Creates a type-checked program from in-memory files only. It does no file
 * system access, so it also runs in a browser web worker.
 */
export function createWorkflowProgram(input: ProgramInput): WorkflowProgram {
	const files = new Map<string, string>();
	const workflowName = input.fileName ?? WORKFLOW_FILE;
	files.set(workflowName, input.source);
	files.set(SDK_FILE, SDK_SOURCE);
	files.set(LIB_FILE, LIB_DTS);
	const prelude = input.prelude ?? PRELUDE_SOURCES;
	// Only the library nodes that the workflow names: the library is large.
	const nodes = input.nodes ?? selectNodeSources(input.source);
	const preludeNames = Object.keys(prelude).map((p) => `/${p}`);
	const nodeNames = Object.keys(nodes).map((p) => `/${p}`);
	for (const [p, text] of Object.entries(prelude)) files.set(`/${p}`, text);
	for (const [p, text] of Object.entries(nodes)) files.set(`/${p}`, text);

	const getSourceFile = (
		fileName: string,
		languageVersion: ts.ScriptTarget | ts.CreateSourceFileOptions,
	) => {
		const text = files.get(fileName);
		if (text === undefined) return undefined;
		// The workflow file changes with each compile. The lib, SDK, prelude and
		// node files do not, so their parsed and bound trees are shared.
		if (fileName === workflowName)
			return ts.createSourceFile(fileName, text, languageVersion, true);
		const hit = sharedFiles.get(fileName);
		if (hit && hit.text === text) return hit;
		const sf = ts.createSourceFile(fileName, text, languageVersion, true);
		sharedFiles.set(fileName, sf);
		return sf;
	};

	const host: ts.CompilerHost = {
		getSourceFile,
		getDefaultLibFileName: () => LIB_FILE,
		writeFile: () => {},
		getCurrentDirectory: () => '/',
		getDirectories: () => [],
		fileExists: (f) => files.has(f),
		readFile: (f) => files.get(f),
		getCanonicalFileName: (f) => f,
		useCaseSensitiveFileNames: () => true,
		getNewLine: () => '\n',
		resolveModuleNameLiterals: (literals) =>
			literals.map((lit) => {
				if (lit.text === '@n8n/workflow-lang') {
					return {
						resolvedModule: {
							resolvedFileName: SDK_FILE,
							extension: ts.Extension.Ts,
							isExternalLibraryImport: false,
						},
					};
				}
				return { resolvedModule: undefined };
			}),
	};

	const program = ts.createProgram({
		rootNames: [LIB_FILE, workflowName, ...preludeNames, ...nodeNames],
		options: input.looseTypes ? { ...COMPILER_OPTIONS, noImplicitAny: false } : COMPILER_OPTIONS,
		host,
	});
	const get = (name: string) => {
		const sf = program.getSourceFile(name);
		if (!sf) throw new Error(`missing source file ${name}`);
		return sf;
	};
	return {
		program,
		checker: program.getTypeChecker(),
		workflowFile: get(workflowName),
		preludeFiles: preludeNames.map(get),
		nodeFiles: nodeNames.map(get),
		sdkFile: get(SDK_FILE),
	};
}
