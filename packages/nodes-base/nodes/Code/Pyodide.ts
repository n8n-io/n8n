import type { PyodideInterface } from 'pyodide';
import { loadPyodide } from 'pyodide';

let pyodideInstance: PyodideInterface | undefined;

export async function LoadPyodide(): Promise<PyodideInterface> {
	if (pyodideInstance === undefined) {
		pyodideInstance = await loadPyodide();
	}

	return pyodideInstance;
}
