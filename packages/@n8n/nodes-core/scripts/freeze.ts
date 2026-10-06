import { freezePackage } from '@n8n/node-sdk/freeze';
import path from 'node:path';

if (require.main === module) {
	void freezePackage({ name: '@n8n/nodes-core', dir: path.resolve(__dirname, '..') });
}
