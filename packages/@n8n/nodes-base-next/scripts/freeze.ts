import { freezePackage } from '@n8n/node-sdk/freeze';

import { nodesBaseNext } from '../src/nodes';

if (require.main === module) void freezePackage(nodesBaseNext);
