import { inTest } from '@n8n/backend-common';
import { createContext, Script } from 'vm';

const context = createContext({ require });
export const loadClassInIsolation = <T>(filePath: string, className: string) => {
	if (process.platform === 'win32') {
		filePath = filePath.replace(/\\/g, '/');
	}

	// Note: Skip the isolation because it breaks nock mocks in tests
	if (inTest) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		return new (require(filePath)[className])() as T;
	} else {
		const script = new Script(`new (require('${filePath}').${className})()`);
		return script.runInContext(context) as T;
	}
};
