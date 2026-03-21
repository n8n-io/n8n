import { inTest } from '@n8n/backend-common';
import { createContext, Script } from 'vm';

export interface NodeSourceInfo {
	sourcePath: string;
	className: string;
}

export const nodeSourceRegistry = new WeakMap<object, NodeSourceInfo>();

const context = createContext({ require });
export const loadClassInIsolation = <T>(filePath: string, className: string) => {
	if (process.platform === 'win32') {
		filePath = filePath.replace(/\\/g, '/');
	}

	// Note: Skip the isolation because it breaks nock mocks in tests
	let instance: T;
	if (inTest) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		instance = new (require(filePath)[className])() as T;
	} else {
		const script = new Script(`new (require('${filePath}').${className})()`);
		instance = script.runInContext(context) as T;
	}

	nodeSourceRegistry.set(instance as object, { sourcePath: filePath, className });
	return instance;
};
