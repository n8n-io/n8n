import { freezePackage } from '@n8n/node-sdk/freeze';

import { nodesIntegrations } from '../src/nodes';

if (require.main === module) void freezePackage(nodesIntegrations);
