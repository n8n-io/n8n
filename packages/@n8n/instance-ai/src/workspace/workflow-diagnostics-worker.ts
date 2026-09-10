import path from 'node:path';
import type { Diagnostic } from 'typescript/unstable/async';

// Pin the experimental API. Verify its contract before upgrading.
export const SANDBOX_TYPESCRIPT_VERSION = '7.0.2';

const TSCONFIG = {
	compilerOptions: {
		strict: true,
		// The SDK types mark onTrue/onFalse as optional. They are present at runtime.
		strictNullChecks: false,
		noEmit: true,
		target: 'ES2022',
		types: ['node'],
		module: 'ES2022',
		moduleResolution: 'bundler',
		esModuleInterop: true,
		skipLibCheck: true,
	},
	include: ['src/**/*.ts', 'chunks/**/*.ts'],
};

export const TSCONFIG_JSON = JSON.stringify(TSCONFIG, null, 2);

function formatMessage(diagnostic: Diagnostic, indent = ''): string {
	return [
		indent + diagnostic.text,
		...(diagnostic.messageChain ?? []).map((child) => formatMessage(child, indent + '  ')),
	].join('\n');
}

// Check only the requested source and its imports. Do not execute the source.
async function main(): Promise<void> {
	// The sandbox installs this dependency from its own package manifest.
	// eslint-disable-next-line import-x/no-extraneous-dependencies
	const { API, DiagnosticCategory } = await import('typescript/unstable/async');
	const cwd = process.cwd();
	const configPath = path.join(cwd, `.workflow-diagnostics-${process.pid}.json`);
	const config = JSON.stringify({
		...TSCONFIG,
		files: [path.resolve(process.argv[2])],
		include: [],
	});
	const api = new API({
		cwd,
		fs: {
			fileExists: (file) => (file === configPath ? true : undefined),
			readFile: (file) => (file === configPath ? config : undefined),
		},
	});
	try {
		const snapshot = await api.updateSnapshot({ openProjects: [configPath] });
		const project = snapshot.getProject(configPath);
		if (!project) throw new Error('Cannot open the workflow project');
		const program = project.program;
		const diagnostics = [
			...(await program.getSyntacticDiagnostics()),
			...(await program.getBindDiagnostics()),
			...(await program.getSemanticDiagnostics()),
		];
		const errors: string[] = [];
		for (const diagnostic of diagnostics) {
			if (diagnostic.category !== DiagnosticCategory.Error) continue;
			if (!diagnostic.fileName || diagnostic.pos < 0) continue;
			const file = path.relative(cwd, diagnostic.fileName);
			if (file.startsWith('..' + path.sep) || file.split(path.sep).includes('node_modules'))
				continue;
			const source = await program.getSourceFile(diagnostic.fileName);
			if (!source || source.isDeclarationFile) continue;
			const position = source.getLineAndCharacterOfPosition(diagnostic.pos);
			const location = `${file}(${position.line + 1},${position.character + 1})`;
			errors.push(`${location}: error TS${diagnostic.code}: ${formatMessage(diagnostic)}`);
		}
		console.log(JSON.stringify([...new Set(errors)]));
	} finally {
		await api.close();
	}
}

// The host imports the config. Only the sandbox executes the worker.
if (require.main === module) {
	void main();
}
