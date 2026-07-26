import moment from 'moment-timezone';
import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { SeaTableApi } from '../SeaTableApi.credentials';

describe('SeaTableApi credential', () => {
	test('timezone options match the moment-timezone country zone list', () => {
		const timezoneProperty = new SeaTableApi().properties.find(
			(property: INodeProperties) => property.name === 'timezone',
		);

		const fromMomentApi = moment.tz
			.countries()
			.reduce(
				(tz: INodePropertyOptions[], country: string) =>
					tz.concat(
						moment.tz.zonesForCountry(country).map((zone) => ({ value: zone, name: zone })),
					),
				[],
			);

		expect(timezoneProperty?.options).toEqual(fromMomentApi);
	});
});
