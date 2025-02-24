import { INodeProperties } from 'n8n-workflow';
import { deviceDefinitionsProperties } from '../descriptions/DeviceDefinitionsDescription';
import { DimoHelper } from '../DimoHelper';

const deviceDefinitionsReqs = new Map([
  ['decodeVin', async (helper: DimoHelper, developerJwt: string, basePath: string) => {
    const countryCode = helper.executeFunctions.getNodeParameter('countryCode', 0) as string;
    const vin = helper.executeFunctions.getNodeParameter('vin', 0) as string;

    const response = await helper.executeFunctions.helpers.request({
      method: 'POST',
      url: `${basePath}/device-definitions/decode-vin`,
      headers: {
        Authorization: `Bearer ${developerJwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        countryCode,
        vin,
      }),
    });
    return JSON.parse(response);
  }],
  ['search', async (helper: DimoHelper, developerJwt: string, basePath: string) => {
    const searchParams: Record<string, string | number> = {};
    const paramList = ['query', 'makeSlug', 'modelSlug', 'year', 'page', 'pageSize'];

    for (const param of paramList) {
      const value = helper.executeFunctions.getNodeParameter(param, 0);
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string' || typeof value === 'number') {
          searchParams[param] = value;
        } else {
          searchParams[param] = String(value);
        }
      }
    }

    const response = await helper.executeFunctions.helpers.request({
      method: 'GET',
      url: `${basePath}/device-definitions/search`,
      headers: {
        Authorization: `Bearer ${developerJwt}`,
        'Content-Type': 'application/json',
      },
      qs: searchParams,
    });
    return JSON.parse(response);
  }],
]);

export const devicedefinitions = {
	getProperties(): INodeProperties[] {
		return deviceDefinitionsProperties;
	},

	async execute(helper: DimoHelper, operation: string) {
		const developerJwt = await helper.getDeveloperJwt();

		const basePath =
			helper.credentials.environment === 'Dev'
				? 'https://device-definitions-api.dev.dimo.zone'
				: 'https://device-definitions-api.dimo.zone';

		const executeOperation = deviceDefinitionsReqs.get(operation);
		if (!executeOperation) {
			throw new Error(`The operation ${operation} is not supported.`);
		}

		return executeOperation(helper, developerJwt, basePath);
	},
};
