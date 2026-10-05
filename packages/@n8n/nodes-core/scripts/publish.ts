import { publishPackage } from '@n8n/node-sdk/publish';

import { nodesCore } from '../src/index';

if (require.main === module) {
	void publishPackage(nodesCore, process.argv.slice(2), console.log).catch((error: unknown) => {
		console.error(error);
		process.exitCode = 1;
	});
}
