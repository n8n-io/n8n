import type { PyodideInterface } from 'pyodide';

let pyodideInstance: PyodideInterface | undefined;

export async function LoadPyodide(): Promise<PyodideInterface> {
	if (pyodideInstance === undefined) {
		// TODO: Find better way to suppress warnings
		//@ts-ignore
		globalThis.Blob = (await import('node:buffer')).Blob;

		// From: https://github.com/nodejs/node/issues/30810
		const { emitWarning } = process;
		process.emitWarning = (warning, ...args) => {
			if (args[0] === 'ExperimentalWarning') {
				return;
			}
			if (args[0] && typeof args[0] === 'object' && args[0].type === 'ExperimentalWarning') {
				return;
			}
			return emitWarning(warning, ...(args as string[]));
		};

		const { loadPyodide } = await import('pyodide');
		pyodideInstance = await loadPyodide();
	}

	return pyodideInstance;
}
