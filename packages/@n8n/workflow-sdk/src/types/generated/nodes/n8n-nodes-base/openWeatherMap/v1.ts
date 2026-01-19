/**
 * OpenWeatherMap Node - Version 1
 * Gets current and future weather information
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../../base';

// ===========================================================================
// Parameters
// ===========================================================================

export interface OpenWeatherMapV1Params {
	operation?: 'currentWeather' | '5DayForecast' | Expression<string>;
/**
 * The format in which format the data should be returned
 * @default metric
 */
		format?: 'imperial' | 'metric' | 'standard' | Expression<string>;
/**
 * How to define the location for which to return the weather
 * @default cityName
 */
		locationSelection?: 'cityName' | 'cityId' | 'coordinates' | 'zipCode' | Expression<string>;
/**
 * The name of the city to return the weather of
 * @displayOptions.show { locationSelection: ["cityName"] }
 */
		cityName: string | Expression<string>;
/**
 * The ID of city to return the weather of. List can be downloaded here: http://bulk.openweathermap.org/sample/.
 * @displayOptions.show { locationSelection: ["cityId"] }
 * @default 160001123
 */
		cityId: number | Expression<number>;
/**
 * The latitude of the location to return the weather of
 * @displayOptions.show { locationSelection: ["coordinates"] }
 */
		latitude: string | Expression<string>;
/**
 * The longitude of the location to return the weather of
 * @displayOptions.show { locationSelection: ["coordinates"] }
 */
		longitude: string | Expression<string>;
/**
 * The ID of city to return the weather of. List can be downloaded here: http://bulk.openweathermap.org/sample/.
 * @displayOptions.show { locationSelection: ["zipCode"] }
 */
		zipCode: string | Expression<string>;
/**
 * The two letter language code to get your output in (eg. en, de, ...).
 */
		language?: string | Expression<string>;
}

// ===========================================================================
// Credentials
// ===========================================================================

export interface OpenWeatherMapV1Credentials {
	openWeatherMapApi: CredentialReference;
}

// ===========================================================================
// Node Types
// ===========================================================================

interface OpenWeatherMapV1NodeBase {
	type: 'n8n-nodes-base.openWeatherMap';
	version: 1;
	credentials?: OpenWeatherMapV1Credentials;
}

export type OpenWeatherMapV1ParamsNode = OpenWeatherMapV1NodeBase & {
	config: NodeConfig<OpenWeatherMapV1Params>;
};

export type OpenWeatherMapV1Node = OpenWeatherMapV1ParamsNode;