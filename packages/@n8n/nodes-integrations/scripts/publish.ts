import { publishPackage } from '@n8n/node-sdk/publish';
import path from 'node:path';

if (require.main === module) {
	const pkg = { name: '@n8n/nodes-integrations', dir: path.resolve(__dirname, '..') };
	void publishPackage(pkg, process.argv.slice(2), console.log).catch((error: unknown) => {
		console.error(error);
		process.exitCode = 1;
	});
}
