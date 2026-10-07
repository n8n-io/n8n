import { packPackage } from '@n8n/node-sdk/pack';
import path from 'node:path';

if (require.main === module) {
	const pkg = { name: '@n8n/nodes-integrations', dir: path.resolve(__dirname, '..') };
	void packPackage(pkg, undefined, console.log);
}
