import { freezePackage } from '@n8n/node-sdk/freeze';

import { nodesCore } from '../src/index';

if (require.main === module) void freezePackage(nodesCore);
