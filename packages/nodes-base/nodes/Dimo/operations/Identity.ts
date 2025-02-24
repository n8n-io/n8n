import { INodeProperties } from 'n8n-workflow';
import { identityProperties } from '../descriptions/IdentityDescription';
import { DimoHelper } from '../DimoHelper';

const identityReqs = new Map([
  ['customIdentity', async (helper: DimoHelper, basePath: string) => {
    const customQuery = helper.executeFunctions.getNodeParameter('customIdentityQuery', 0) as string;
    const variablesStr = helper.executeFunctions.getNodeParameter('variables', 0) as string;
    const variables = variablesStr ? JSON.parse(variablesStr) : {};

    const response = await helper.executeFunctions.helpers.request({
      method: 'POST',
      url: basePath,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'dimo-n8n-node',
      },
      body: JSON.stringify({
        query: customQuery,
        variables,
      }),
    });
    return JSON.parse(response);
  }],
  ['countDimoVehicles', async (helper: DimoHelper, basePath: string) => {
    const query = `{
      vehicles(first: 10) {
        totalCount
      }
    }`;

    const response = await helper.executeFunctions.helpers.request({
      method: 'POST',
      url: basePath,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'dimo-n8n-node',
      },
      body: JSON.stringify({
        query,
        variables: {},
      }),
    });
    return JSON.parse(response);
  }],
]);

export const identity = {
	getProperties(): INodeProperties[] {
		return identityProperties;
	},

	async execute(helper: DimoHelper, operation: string) {
		const basePath =
			helper.credentials.environment === 'Dev'
				? 'https://identity-api.dev.dimo.zone/query'
				: 'https://identity-api.dimo.zone/query';

		const executeOperation = identityReqs.get(operation);
		if (!executeOperation) {
			throw new Error(`The operation ${operation} is not supported.`);
		}

		return executeOperation(helper, basePath);
	},
};
