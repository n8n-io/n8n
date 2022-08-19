import { Script } from 'vm';

export const loadClassInIsolation = (filePath: string, className: string) => {
	const script = new Script(`new (require('${filePath}').${className})()`);
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return
	return script.runInNewContext({ require });
};
