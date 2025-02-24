import { INodeProperties } from 'n8n-workflow';
import { attestationProperties } from '../descriptions/AttestationDescription';
import { DimoHelper } from '../DimoHelper';

const attestationReqs = new Map([
  ['createVinVc', async (helper: DimoHelper, tokenId: number, vehicleJwt: string, basePath: string) => {
    const response = await helper.executeFunctions.helpers.request({
      method: 'POST',
      url: `${basePath}/v1/vc/vin/${tokenId}`,
      headers: {
        Authorization: `Bearer ${vehicleJwt}`,
        'Content-Type': 'application/json',
      },
      qs: { force: true },
    });

    return {
      message: response.message,
      response: response,
    };
  }],
  ['createPomVc', async (helper: DimoHelper, tokenId: number, vehicleJwt: string, basePath: string) => {
    const response = await helper.executeFunctions.helpers.request({
      method: 'POST',
      url: `${basePath}/v1/vc/pom/${tokenId}`,
      headers: {
        Authorization: `Bearer ${vehicleJwt}`,
        'Content-Type': 'application/json',
      },
    });

    return {
      message: response.message,
      response: response,
    };
  }],
]);

export const attestation = {
	getProperties(): INodeProperties[] {
		return attestationProperties;
	},

	async execute(helper: DimoHelper, operation: string) {
		const developerJwt = await helper.getDeveloperJwt();
		const tokenId = helper.executeFunctions.getNodeParameter('tokenId', 0) as number;
		const privilegesString = await helper.permissionsDecoder(tokenId);

		const vehicleJwt = await helper.getVehicleJwt(developerJwt, tokenId, privilegesString);

		const basePath =
			helper.credentials.environment === 'Dev'
				? 'https://attestation-api.dev.dimo.zone'
				: 'https://attestation-api.dimo.zone';

		const executeOperation = attestationReqs.get(operation);
		if (!executeOperation) {
			throw new Error(`The operation ${operation} is not supported.`);
		}

		return executeOperation(helper, tokenId, vehicleJwt, basePath);
	},
};
