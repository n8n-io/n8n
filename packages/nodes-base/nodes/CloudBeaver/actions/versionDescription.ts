import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import * as database from './database/Database.resource';

export const versionDescription: INodeTypeDescription = {
	displayName: 'CloudBeaver',
	name: 'cloudBeaver',
	icon: 'file:cloudbeaver.svg',
	group: ['input'],
	version: 1,
	description: 'Execute SQL queries via CloudBeaver',
	defaults: { name: 'CloudBeaver' },
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'cloudBeaverApi',
			required: true,
			testedBy: 'cloudBeaverApiTest',
		},
	],
	properties: [...database.description],
};
