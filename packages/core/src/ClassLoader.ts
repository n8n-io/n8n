import { createContext, Script } from 'node:vm';

const context = createContext({ require });
export const loadClassInIsolation = <T>(filePath: string, className: string) => {
	if (process.platform === 'win32') {
		filePath = filePath.replace(/\\/g, '/');
	}
	const script = new Script(`new (require('${filePath}').${className})()`);
	return script.runInContext(context) as T;
};
