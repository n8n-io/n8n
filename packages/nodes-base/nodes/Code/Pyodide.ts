import { dirname } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import type { PyodideAPI } from 'pyodide';

let pyodideInstance: PyodideAPI | undefined;

export async function LoadPyodide(packageCacheDir: string): Promise<PyodideAPI> {
	if (pyodideInstance === undefined) {
		const { loadPyodide } = await import('pyodide');
		const { XMLHttpRequest } = await import('xmlhttprequest-ssl');
		const indexURL = dirname(require.resolve('pyodide'));
		const context = createContext({
			loadPyodide,
			indexURL,
			packageCacheDir,
			jsglobals: {
				console,
				fetch,
				AbortController,
				AbortSignal,
				Object,
				XMLHttpRequest,
			},
		});
		pyodideInstance = (await runInContext(
			'loadPyodide({ indexURL, packageCacheDir, jsglobals })',
			context,
		)) as PyodideInterface;

		await pyodideInstance.runPythonAsync(`
import os

def blocked_function(*args, **kwargs):
    raise RuntimeError("Blocked for security reasons")

os.system = blocked_function

from importlib.abc import MetaPathFinder
from importlib.machinery import ModuleSpec
from types import ModuleType
from typing import Sequence, Optional

from _pyodide_core import jsproxy_typedict
from js import Object

Object.constructor.constructor = blocked_function

import sys
class blocked_module:
    def __getattr__(self, name):
        blocked_function()

sys.modules['js'] = blocked_module()
`);
	}

	return pyodideInstance;
}
