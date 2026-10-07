import { freezePackage } from '@n8n/node-sdk/freeze';
import path from 'node:path';

if (require.main === module) {
	const pkg = { name: '@n8n/nodes-integrations', dir: path.resolve(__dirname, '..') };
	void freezePackage(pkg, undefined, console.log);
}
