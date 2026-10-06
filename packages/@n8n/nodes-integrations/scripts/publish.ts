import { publishPackage } from '@n8n/node-sdk/publish';

import { nodesIntegrations } from '../src/nodes';

if (require.main === module) {
	void publishPackage(nodesIntegrations, process.argv.slice(2), console.log).catch(
		(error: unknown) => {
			console.error(error);
			process.exitCode = 1;
		},
	);
}
