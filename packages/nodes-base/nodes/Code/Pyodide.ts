import { dirname } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import type { PyodideInterface } from 'pyodide';
import { Container } from '@n8n/di';
import { GlobalConfig } from '@n8n/config';

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
import os

def blocked_system(*args, **kwargs):
    raise RuntimeError("os.system is blocked for security reasons.")

os.system = blocked_system

from importlib.abc import MetaPathFinder
from importlib.machinery import ModuleSpec
from types import ModuleType
from typing import Sequence, Optional

from _pyodide_core import jsproxy_typedict
from js import Object
`);
		const globalConfig = Container.get(GlobalConfig);
		const packagesToPreload = globalConfig.nodes.pythonPackagesPreload;

		if (packagesToPreload) {
			const packages = packagesToPreload.split(',').map((p) => p.trim());
			await pyodideInstance.loadPackage(packages);
		}
	}

	return pyodideInstance;
}
