import { freezePackage } from '@n8n/node-sdk/freeze';
import path from 'node:path';

if (require.main === module) {
	void freezePackage({ name: '@n8n/nodes-integrations', dir: path.resolve(__dirname, '..') });
}
