import { dirname } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import type { PyodideInterface } from 'pyodide';
import { Container } from '@n8n/di';
import { JsRunnerConfig } from '@n8n/task-runner/src/config/js-runner-config';

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
blocked_modules = ["os"]

import sys
for module_name in blocked_modules:
	del sys.modules[module_name]

from importlib.abc import MetaPathFinder
from importlib.machinery import ModuleSpec
from types import ModuleType
from typing import Sequence, Optional

class ImportBlocker(MetaPathFinder):
	def find_spec(
		self,
		fullname: str,
		path: Sequence[bytes | str] | None,
		target: ModuleType | None = None,
) -> Optional[ModuleSpec]:
		if fullname in blocked_modules:
				raise ModuleNotFoundError(f"Module {fullname!r} is blocked", name=fullname)
		return None

sys.meta_path.insert(0, ImportBlocker())

from _pyodide_core import jsproxy_typedict
from js import Object
`);
		const jsRunnerConfig = Container.get(JsRunnerConfig);
		const packagesToPreload = jsRunnerConfig.pythonCodeNodePreload;

		if (packagesToPreload) {
			const packages = packagesToPreload.split(',').map((p) => p.trim());
			await pyodideInstance.loadPackage(packages);
		}
	}

	return pyodideInstance;
}
