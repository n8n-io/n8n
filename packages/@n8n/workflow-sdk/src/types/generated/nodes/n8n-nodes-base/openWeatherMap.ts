/**
 * OpenWeatherMap Node Types
 *
 * Gets current and future weather information
 * @see https://docs.n8n.io/integrations/builtin/app-nodes/openweathermap/
 *
 * @generated - Do not edit manually. Run `pnpm generate-types` to regenerate.
 */

// @ts-nocheck - Generated file may have unused imports

import type { Expression, CredentialReference, NodeConfig } from '../../../base';

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
	 */
	cityName: string | Expression<string>;
	/**
	 * The ID of city to return the weather of. List can be downloaded here: http://bulk.openweathermap.org/sample/.
	 * @default 160001123
	 */
	cityId: number | Expression<number>;
	/**
	 * The latitude of the location to return the weather of
	 */
	latitude: string | Expression<string>;
	/**
	 * The longitude of the location to return the weather of
	 */
	longitude: string | Expression<string>;
	/**
	 * The ID of city to return the weather of. List can be downloaded here: http://bulk.openweathermap.org/sample/.
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

export type OpenWeatherMapV1Node = {
	type: 'n8n-nodes-base.openWeatherMap';
	version: 1;
	config: NodeConfig<OpenWeatherMapV1Params>;
	credentials?: OpenWeatherMapV1Credentials;
};

export type OpenWeatherMapNode = OpenWeatherMapV1Node;
