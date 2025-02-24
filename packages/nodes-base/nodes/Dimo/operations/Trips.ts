import { INodeProperties } from 'n8n-workflow';
import { tripsProperties } from '../descriptions/TripsDescription';

export const trips = {
	getProperties(): INodeProperties[] {
		return tripsProperties;
	},

	async execute(helper: any, operation: string) {
		const developerJwt = await helper.getDeveloperJwt();
		const tokenId = helper.executeFunctions.getNodeParameter('tokenId', 0) as number;
		const privilegesString = await helper.permissionsDecoder(tokenId);

		const vehicleJwt = await helper.getVehicleJwt(developerJwt, tokenId, privilegesString);

		const basePath =
			helper.credentials.environment === 'Dev'
				? 'https://trips-api.dev.dimo.zone'
				: 'https://trips-api.dimo.zone';

		try {
			const tripsResponse = await helper.executeFunctions.helpers.request({
				method: 'GET',
				url: `${basePath}/v1/vehicle/${tokenId}/trips`,
				headers: {
					Authorization: `Bearer ${vehicleJwt}`,
					'Content-Type': 'application/json',
				},
			});

			return JSON.parse(tripsResponse);
		} catch {
			throw new Error(`The operation failed: ${operation}`);
		}
	},
};
