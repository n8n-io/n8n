import { dirname } from 'node:path';
import type { PyodideInterface } from 'pyodide';

let pyodideInstance: PyodideInterface | undefined;

export async function LoadPyodide(packageCacheDir: string): Promise<PyodideInterface> {
	if (pyodideInstance === undefined) {
		const { loadPyodide } = await import('pyodide');
		const indexURL = dirname(require.resolve('pyodide'));
		pyodideInstance = await loadPyodide({ indexURL, packageCacheDir });

		await pyodideInstance.runPythonAsync(`
from _pyodide_core import jsproxy_typedict
from js import Object
`);
	}

	return pyodideInstance;
}
