import type { PyodideInterface } from 'pyodide';

let pyodideInstance: PyodideInterface | undefined;

export async function LoadPyodide(): Promise<PyodideInterface> {
	if (pyodideInstance === undefined) {
		const { loadPyodide } = await import('pyodide');
		pyodideInstance = await loadPyodide();

		await pyodideInstance.runPythonAsync(`
from _pyodide_core import jsproxy_typedict
from js import Object
`);
	}

	return pyodideInstance;
}
