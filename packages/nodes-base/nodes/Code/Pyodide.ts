import { dirname } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import type { PyodideInterface } from 'pyodide';

let pyodideInstance: PyodideInterface | undefined;

export async function LoadPyodide(packageCacheDir: string): Promise<PyodideInterface> {
	if (pyodideInstance === undefined) {
		const { loadPyodide } = await import('pyodide');
		const { XMLHttpRequest } = await import('xmlhttprequest-ssl');
		const indexURL = dirname(require.resolve('pyodide'));
		const context = createContext({
			loadPyodide,
			indexURL,
			packageCacheDir,
			jsglobals: {
				Object,
				console,
				XMLHttpRequest,
			},
		});
		pyodideInstance = (await runInContext(
			'loadPyodide({ indexURL, packageCacheDir, jsglobals })',
			context,
		)) as PyodideInterface;

		await pyodideInstance.runPythonAsync(`
from _pyodide_core import jsproxy_typedict
from js import Object
`);
	}

	return pyodideInstance;
}
