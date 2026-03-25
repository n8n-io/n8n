import { ModuleBase } from '../../internal/module-base';
/**
 * Module to generate addresses and locations. Prior to Faker 8.0.0, this module was known as `faker.address`.
 *
 * ### Overview
 *
 * For a typical street address for a locale, use [`streetAddress()`](https://fakerjs.dev/api/location.html#streetaddress), [`city()`](https://fakerjs.dev/api/location.html#city), [`state()`](https://fakerjs.dev/api/location.html#state) (or [`stateAbbr()`](https://fakerjs.dev/api/location.html#stateabbr)), and [`zipCode()`](https://fakerjs.dev/api/location.html#zipcode). Most locales provide localized versions for a specific country.
 *
 * If you need latitude and longitude coordinates, use [`latitude()`](https://fakerjs.dev/api/location.html#latitude) and [`longitude()`](https://fakerjs.dev/api/location.html#longitude), or [`nearbyGPSCoordinate()`](https://fakerjs.dev/api/location.html#nearbygpscoordinate) for a latitude/longitude near a given location.
 *
 * For a random country, you can use [`country()`](https://fakerjs.dev/api/location.html#country) or [`countryCode()`](https://fakerjs.dev/api/location.html#countrycode).
 */
export declare class LocationModule extends ModuleBase {
    /**
     * Generates random zip code from specified format. If format is not specified,
     * the locale's zip format is used.
     *
     * @param options The format used to generate the zip code or an options object.
     * @param options.state The state to generate the zip code for.
     * If the current locale does not have a corresponding `postcode_by_state` definition, an error is thrown.
     * @param options.format The optional format used to generate the zip code.
     * By default, a random format is used from the locale zip formats.
     * This won't be used if the state option is specified.
     *
     * @see faker.helpers.replaceSymbols(): For more information about how the pattern is used.
     *
     * @example
     * faker.location.zipCode() // '17839'
     * faker.location.zipCode('####') // '6925'
     *
     * @since 8.0.0
     */
    zipCode(options?: string | {
        /**
         * The state to generate the zip code for.
         *
         * If the current locale does not have a corresponding `postcode_by_state` definition, an error is thrown.
         */
        state?: string;
        /**
         * The optional format used to generate the zip code.
         *
         * This won't be used if the state option is specified.
         *
         * @default faker.definitions.location.postcode
         */
        format?: string;
    }): string;
    /**
     * Generates random zip code from state abbreviation.
     *
     * If the current locale does not have a corresponding `postcode_by_state` definition, an error is thrown.
     *
     * @param options A state abbreviation or an options object.
     * @param options.state The abbreviation of the state to generate the zip code for.
     * If not specified, a random zip code is generated according to the locale's zip format.
     *
     * @see faker.location.zipCode(): For the replacement method.
     *
     * @example
     * fakerEN_US.location.zipCodeByState("AK") // '99595'
     * fakerEN_US.location.zipCodeByState() // '47683-9880'
     * fakerEN_US.location.zipCodeByState({ state: "AK" }) // '99595'
     *
     * @since 8.0.0
     *
     * @deprecated Use `faker.location.zipCode({ state })` instead.
     */
    zipCodeByState(options?: string | {
        /**
         * The abbreviation of the state to generate the zip code for.
         * If not specified, a random zip code is generated according to the locale's zip format.
         */
        state?: string;
    }): string;
    /**
     * Generates a random localized city name.
     *
     * @example
     * faker.location.city() // 'East Jarretmouth'
     * fakerDE.location.city() // 'Bad Lilianadorf'
     *
     * @since 8.0.0
     */
    city(): string;
    /**
     * Returns a random city name from a list of real cities for the locale.
     *
     * @see faker.location.city(): For the replacement method.
     *
     * @example
     * faker.location.cityName() // 'San Rafael'
     * fakerDE.location.cityName() // 'Nürnberg'
     *
     * @since 8.0.0
     *
     * @deprecated Use `faker.location.city()` instead.
     */
    cityName(): string;
    /**
     * Generates a random building number.
     *
     * @example
     * faker.location.buildingNumber() // '379'
     *
     * @since 8.0.0
     */
    buildingNumber(): string;
    /**
     * Generates a random localized street name.
     *
     * @example
     * faker.location.street() // 'Schroeder Isle'
     *
     * @since 8.0.0
     */
    street(): string;
    /**
     * Returns a random localized street name.
     *
     * @see faker.location.street(): For the replacement method.
     *
     * @example
     * fakerDE.location.streetName() // 'Cavill Avenue'
     *
     * @since 8.0.0
     *
     * @deprecated Use `faker.location.street()` instead.
     */
    streetName(): string;
    /**
     * Generates a random localized street address.
     *
     * @param options Whether to use a full address or an options object.
     * @param options.useFullAddress When true this will generate a full address.
     * Otherwise it will just generate a street address.
     *
     * @example
     * faker.location.streetAddress() // '0917 O'Conner Estates'
     * faker.location.streetAddress(false) // '34830 Erdman Hollow'
     * faker.location.streetAddress(true) // '3393 Ronny Way Apt. 742'
     * faker.location.streetAddress({ useFullAddress: true }) // '7917 Miller Park Apt. 410'
     *
     * @since 8.0.0
     */
    streetAddress(options?: boolean | {
        /**
         * When true this will generate a full address.
         * Otherwise it will just generate a street address.
         */
        useFullAddress?: boolean;
    }): string;
    /**
     * Generates a random localized secondary address. This refers to a specific location at a given address
     * such as an apartment or room number.
     *
     * @example
     * faker.location.secondaryAddress() // 'Apt. 861'
     *
     * @since 8.0.0
     */
    secondaryAddress(): string;
    /**
     * Returns a random localized county, or other equivalent second-level administrative entity for the locale's country such as a district or department.
     *
     * @example
     * fakerEN_GB.location.county() // 'Cambridgeshire'
     * fakerEN_US.location.county() // 'Monroe County'
     *
     * @since 8.0.0
     */
    county(): string;
    /**
     * Returns a random country name.
     *
     * @example
     * faker.location.country() // 'Greece'
     *
     * @since 8.0.0
     */
    country(): string;
    /**
     * Returns a random [ISO_3166-1](https://en.wikipedia.org/wiki/ISO_3166-1) country code.
     *
     * @param options The code to return or an options object.
     * @param options.variant The variant to return. Can be one of:
     *
     * - `'alpha-2'` (two-letter code)
     * - `'alpha-3'` (three-letter code)
     * - `'numeric'` (numeric code)
     *
     * Defaults to `'alpha-2'`.
     *
     * @example
     * faker.location.countryCode() // 'SJ'
     * faker.location.countryCode('alpha-2') // 'GA'
     * faker.location.countryCode('alpha-3') // 'TJK'
     * faker.location.countryCode('numeric') // '528'
     *
     * @since 8.0.0
     */
    countryCode(options?: 'alpha-2' | 'alpha-3' | 'numeric' | {
        /**
         * The code to return.
         * Can be either `'alpha-2'` (two-letter code),
         * `'alpha-3'` (three-letter code)
         * or `'numeric'` (numeric code).
         *
         * @default 'alpha-2'
         */
        variant?: 'alpha-2' | 'alpha-3' | 'numeric';
    }): string;
    /**
     * Returns a random localized state, or other equivalent first-level administrative entity for the locale's country such as a province or region.
     * Generally, these are the ISO 3166-2 subdivisions for a country.
     * If a locale doesn't correspond to one specific country, the method may return ISO 3166-2 subdivisions from one or more countries that uses that language. For example, the `ar` locale includes subdivisions from Arabic-speaking countries, such as Tunisia, Algeria, Syria, Lebanon, etc.
     * For historical compatibility reasons, the default `en` locale only includes states in the United States (identical to `en_US`). However, you can use other English locales, such as `en_IN`, `en_GB`, and `en_AU`, if needed.
     *
     * @param options An options object.
     * @param options.abbreviated If true this will return abbreviated first-level administrative entity names.
     * Otherwise this will return the long name. Defaults to `false`.
     *
     * @example
     * faker.location.state() // 'Mississippi'
     * fakerEN_CA.location.state() // 'Saskatchewan'
     * fakerDE.location.state() // 'Nordrhein-Westfalen'
     * faker.location.state({ abbreviated: true }) // 'LA'
     *
     * @since 8.0.0
     */
    state(options?: {
        /**
         * If true this will return abbreviated first-level administrative entity names.
         * Otherwise this will return the long name.
         *
         * @default false
         */
        abbreviated?: boolean;
    }): string;
    /**
     * Returns a random localized state's abbreviated name from this country.
     *
     * @example
     * faker.location.stateAbbr() // 'ND'
     *
     * @since 8.0.0
     *
     * @deprecated Use `faker.location.state({ abbreviated: true })` instead.
     */
    stateAbbr(): string;
    /**
     * Generates a random latitude.
     *
     * @param options An options object.
     * @param options.max The upper bound for the latitude to generate. Defaults to `90`.
     * @param options.min The lower bound for the latitude to generate. Defaults to `-90`.
     * @param options.precision The number of decimal points of precision for the latitude. Defaults to `4`.
     *
     * @example
     * faker.location.latitude() // -30.9501
     * faker.location.latitude({ max: 10 }) // 5.7225
     * faker.location.latitude({ max: 10, min: -10 }) // -9.6273
     * faker.location.latitude({ max: 10, min: -10, precision: 5 }) // 2.68452
     *
     * @since 8.0.0
     */
    latitude(options?: {
        /**
         * The upper bound for the latitude to generate.
         *
         * @default 90
         */
        max?: number;
        /**
         * The lower bound for the latitude to generate.
         *
         * @default -90
         */
        min?: number;
        /**
         * The number of decimal points of precision for the latitude.
         *
         * @default 4
         */
        precision?: number;
    }): number;
    /**
     * Generates a random latitude.
     *
     * @param max The upper bound for the latitude to generate. Defaults to `90`.
     * @param min The lower bound for the latitude to generate. Defaults to `-90`.
     * @param precision The number of decimal points of precision for the latitude. Defaults to `4`.
     *
     * @example
     * faker.location.latitude() // -30.9501
     * faker.location.latitude(10) // 5.7225
     * faker.location.latitude(10, -10) // -9.6273
     * faker.location.latitude(10, -10, 5) // 2.68452
     *
     * @since 8.0.0
     *
     * @deprecated Use `faker.location.latitude({ max, min, precision })` instead.
     */
    latitude(max?: number, min?: number, precision?: number): number;
    /**
     * Generates a random latitude.
     *
     * @param options The upper bound for the latitude or an options object.
     * @param options.max The upper bound for the latitude to generate. Defaults to `90`.
     * @param options.min The lower bound for the latitude to generate. Defaults to `-90`.
     * @param options.precision The number of decimal points of precision for the latitude. Defaults to `4`.
     * @param legacyMin The lower bound for the latitude to generate. Defaults to `-90`.
     * @param legacyPrecision The number of decimal points of precision for the latitude. Defaults to `4`.
     *
     * @example
     * faker.location.latitude() // -30.9501
     * faker.location.latitude({ max: 10 }) // 5.7225
     * faker.location.latitude({ max: 10, min: -10 }) // -9.6273
     * faker.location.latitude({ max: 10, min: -10, precision: 5 }) // 2.68452
     *
     * @since 8.0.0
     */
    latitude(options: number | {
        /**
         * The upper bound for the latitude to generate.
         *
         * @default 90
         */
        max?: number;
        /**
         * The lower bound for the latitude to generate.
         *
         * @default -90
         */
        min?: number;
        /**
         * The number of decimal points of precision for the latitude.
         *
         * @default 4
         */
        precision?: number;
    }, legacyMin?: number, legacyPrecision?: number): number;
    /**
     * Generates a random longitude.
     *
     * @param options An options object.
     * @param options.max The upper bound for the longitude to generate. Defaults to `180`.
     * @param options.min The lower bound for the longitude to generate. Defaults to `-180`.
     * @param options.precision The number of decimal points of precision for the longitude. Defaults to `4`.
     *
     * @example
     * faker.location.longitude() // -30.9501
     * faker.location.longitude({ max: 10 }) // 5.7225
     * faker.location.longitude({ max: 10, min: -10 }) // -9.6273
     * faker.location.longitude({ max: 10, min: -10, precision: 5 }) // 2.68452
     *
     * @since 8.0.0
     */
    longitude(options?: {
        /**
         * The upper bound for the longitude to generate.
         *
         * @default 180
         */
        max?: number;
        /**
         * The lower bound for the longitude to generate.
         *
         * @default -180
         */
        min?: number;
        /**
         * The number of decimal points of precision for the longitude.
         *
         * @default 4
         */
        precision?: number;
    }): number;
    /**
     * Generates a random longitude.
     *
     * @param max The upper bound for the longitude to generate. Defaults to `180`.
     * @param min The lower bound for the longitude to generate. Defaults to `-180`.
     * @param precision The number of decimal points of precision for the longitude. Defaults to `4`.
     *
     * @example
     * faker.location.longitude() // -30.9501
     * faker.location.longitude({ max: 10 }) // 5.7225
     * faker.location.longitude({ max: 10, min: -10 }) // -9.6273
     * faker.location.longitude({ max: 10, min: -10, precision: 5 }) // 2.68452
     *
     * @since 8.0.0
     *
     * @deprecated Use `faker.location.longitude({ max, min, precision })` instead.
     */
    longitude(max?: number, min?: number, precision?: number): number;
    /**
     * Generates a random longitude.
     *
     * @param options The upper bound for the longitude or an options object.
     * @param options.max The upper bound for the longitude to generate. Defaults to `180`.
     * @param options.min The lower bound for the longitude to generate. Defaults to `-180`.
     * @param options.precision The number of decimal points of precision for the longitude. Defaults to `4`.
     * @param legacyMin The lower bound for the longitude to generate. Defaults to `-180`.
     * @param legacyPrecision The number of decimal points of precision for the longitude. Defaults to `4`.
     *
     * @example
     * faker.location.longitude() // -30.9501
     * faker.location.longitude({ max: 10 }) // 5.7225
     * faker.location.longitude({ max: 10, min: -10 }) // -9.6273
     * faker.location.longitude({ max: 10, min: -10, precision: 5 }) // 2.68452
     *
     * @since 8.0.0
     */
    longitude(options?: number | {
        /**
         * The upper bound for the longitude to generate.
         *
         * @default 180
         */
        max?: number;
        /**
         * The lower bound for the longitude to generate.
         *
         * @default -180
         */
        min?: number;
        /**
         * The number of decimal points of precision for the longitude.
         *
         * @default 4
         */
        precision?: number;
    }, legacyMin?: number, legacyPrecision?: number): number;
    /**
     * Returns a random direction (cardinal and ordinal; northwest, east, etc).
     *
     * @param options The options to use.
     * @param options.abbreviated If true this will return abbreviated directions (NW, E, etc).
     * Otherwise this will return the long name. Defaults to `false`.
     *
     * @example
     * faker.location.direction() // 'Northeast'
     * faker.location.direction({ abbreviated: true }) // 'SW'
     *
     * @since 8.0.0
     */
    direction(options?: {
        /**
         * If true this will return abbreviated directions (NW, E, etc).
         * Otherwise this will return the long name.
         *
         * @default false
         */
        abbreviated?: boolean;
    }): string;
    /**
     * Returns a random direction (cardinal and ordinal; northwest, east, etc).
     *
     * @param abbreviated If true this will return abbreviated directions (NW, E, etc).
     * Otherwise this will return the long name. Defaults to `false`.
     *
     * @example
     * faker.location.direction() // 'Northeast'
     * faker.location.direction(false) // 'South'
     * faker.location.direction(true) // 'NE'
     *
     * @since 8.0.0
     *
     * @deprecated Use `faker.location.direction({ abbreviated })` instead.
     */
    direction(abbreviated?: boolean): string;
    /**
     * Returns a random direction (cardinal and ordinal; northwest, east, etc).
     *
     * @param options Whether to use abbreviated or an options object.
     * @param options.abbreviated If true this will return abbreviated directions (NW, E, etc).
     * Otherwise this will return the long name. Defaults to `false`.
     *
     * @example
     * faker.location.direction() // 'Northeast'
     * faker.location.direction({ abbreviated: true }) // 'SW'
     *
     * @since 8.0.0
     */
    direction(options?: boolean | {
        /**
         * If true this will return abbreviated directions (NW, E, etc).
         * Otherwise this will return the long name.
         *
         * @default false
         */
        abbreviated?: boolean;
    }): string;
    /**
     * Returns a random cardinal direction (north, east, south, west).
     *
     * @param options The options to use.
     * @param options.abbreviated If true this will return abbreviated directions (N, E, etc).
     * Otherwise this will return the long name. Defaults to `false`.
     *
     * @example
     * faker.location.cardinalDirection() // 'North'
     * faker.location.cardinalDirection({ abbreviated: true }) // 'W'
     *
     * @since 8.0.0
     */
    cardinalDirection(options?: {
        /**
         * If true this will return abbreviated directions (N, E, etc).
         * Otherwise this will return the long name.
         *
         * @default false
         */
        abbreviated?: boolean;
    }): string;
    /**
     * Returns a random cardinal direction (north, east, south, west).
     *
     * @param abbreviated If true this will return abbreviated directions (N, E, etc).
     * Otherwise this will return the long name. Defaults to `false`.
     *
     * @example
     * faker.location.cardinalDirection() // 'North'
     * faker.location.cardinalDirection(false) // 'South'
     * faker.location.cardinalDirection(true) // 'N'
     *
     * @since 8.0.0
     *
     * @deprecated Use `faker.location.cardinalDirection({ abbreviated })` instead.
     */
    cardinalDirection(abbreviated?: boolean): string;
    /**
     * Returns a random cardinal direction (north, east, south, west).
     *
     * @param options Whether to use abbreviated or an options object. Defaults to`{}`.
     * @param options.abbreviated If true this will return abbreviated directions (N, E, etc).
     * Otherwise this will return the long name. Defaults to `false`.
     *
     * @example
     * faker.location.cardinalDirection() // 'North'
     * faker.location.cardinalDirection({ abbreviated: true }) // 'W'
     *
     * @since 8.0.0
     */
    cardinalDirection(options?: boolean | {
        /**
         * If true this will return abbreviated directions (N, E, etc).
         * Otherwise this will return the long name.
         *
         * @default false
         */
        abbreviated?: boolean;
    }): string;
    /**
     * Returns a random ordinal direction (northwest, southeast, etc).
     *
     * @param options Whether to use abbreviated or an options object.
     * @param options.abbreviated If true this will return abbreviated directions (NW, SE, etc).
     * Otherwise this will return the long name. Defaults to `false`.
     *
     * @example
     * faker.location.ordinalDirection() // 'Northeast'
     * faker.location.ordinalDirection({ abbreviated: true }) // 'SW'
     *
     * @since 8.0.0
     */
    ordinalDirection(options?: {
        /**
         * If true this will return abbreviated directions (NW, SE, etc).
         * Otherwise this will return the long name.
         *
         * @default false
         */
        abbreviated?: boolean;
    }): string;
    /**
     * Returns a random ordinal direction (northwest, southeast, etc).
     *
     * @param abbreviated If true this will return abbreviated directions (NW, SE, etc).
     * Otherwise this will return the long name. Defaults to `false`.
     *
     * @example
     * faker.location.ordinalDirection() // 'Northeast'
     * faker.location.ordinalDirection(false) // 'Northwest'
     * faker.location.ordinalDirection(true) // 'NE'
     *
     * @since 8.0.0
     *
     * @deprecated Use `faker.location.ordinalDirection({ abbreviated })` instead.
     */
    ordinalDirection(abbreviated?: boolean): string;
    /**
     * Returns a random ordinal direction (northwest, southeast, etc).
     *
     * @param options Whether to use abbreviated or an options object.
     * @param options.abbreviated If true this will return abbreviated directions (NW, SE, etc).
     * Otherwise this will return the long name. Defaults to `false`.
     *
     * @example
     * faker.location.ordinalDirection() // 'Northeast'
     * faker.location.ordinalDirection({ abbreviated: true }) // 'SW'
     *
     * @since 8.0.0
     */
    ordinalDirection(options?: boolean | {
        /**
         * If true this will return abbreviated directions (NW, SE, etc).
         * Otherwise this will return the long name.
         *
         * @default false
         */
        abbreviated?: boolean;
    }): string;
    /**
     * Generates a random GPS coordinate within the specified radius from the given coordinate.
     *
     * @param options The options for generating a GPS coordinate.
     * @param options.origin The original coordinate to get a new coordinate close to.
     * If no coordinate is given, a random one will be chosen.
     * @param options.radius The maximum distance from the given coordinate to the new coordinate. Defaults to `10`.
     * @param options.isMetric If `true` assume the radius to be in kilometers. If `false` for miles. Defaults to `false`.
     *
     * @example
     * faker.location.nearbyGPSCoordinate() // [ 33.8475, -170.5953 ]
     * faker.location.nearbyGPSCoordinate({ origin: [33, -170] }) // [ 33.0165, -170.0636 ]
     * faker.location.nearbyGPSCoordinate({ origin: [33, -170], radius: 1000, isMetric: true }) // [ 37.9163, -179.2408 ]
     *
     * @since 8.0.0
     */
    nearbyGPSCoordinate(options?: {
        /**
         * The original coordinate to get a new coordinate close to.
         */
        origin?: [latitude: number, longitude: number];
        /**
         * The maximum distance from the given coordinate to the new coordinate.
         *
         * @default 10
         */
        radius?: number;
        /**
         * If `true` assume the radius to be in kilometers. If `false` for miles.
         *
         * @default false
         */
        isMetric?: boolean;
    }): [latitude: number, longitude: number];
    /**
     * Generates a random GPS coordinate within the specified radius from the given coordinate.
     *
     * @param coordinate The original coordinate to get a new coordinate close to.
     * If no coordinate is given, a random one will be chosen.
     * @param radius The maximum distance from the given coordinate to the new coordinate. Defaults to `10`.
     * @param isMetric If `true` assume the radius to be in kilometers. If `false` for miles. Defaults to `false`.
     *
     * @example
     * faker.location.nearbyGPSCoordinate() // [ 33.8475, -170.5953 ]
     * faker.location.nearbyGPSCoordinate([33, -170]) // [ 33.0165, -170.0636 ]
     * faker.location.nearbyGPSCoordinate([33, -170], 1000, true) // [ 37.9163, -179.2408 ]
     *
     * @since 8.0.0
     *
     * @deprecated Use `faker.location.nearbyGPSCoordinate({ origin, radius, isMetric })` instead.
     */
    nearbyGPSCoordinate(coordinate?: [latitude: number, longitude: number], radius?: number, isMetric?: boolean): [latitude: number, longitude: number];
    /**
     * Generates a random GPS coordinate within the specified radius from the given coordinate.
     *
     * @param options The options for generating a GPS coordinate.
     * @param options.origin The original coordinate to get a new coordinate close to.
     * If no coordinate is given, a random one will be chosen.
     * @param options.radius The maximum distance from the given coordinate to the new coordinate. Defaults to `10`.
     * @param options.isMetric If `true` assume the radius to be in kilometers. If `false` for miles. Defaults to `false`.
     * @param legacyRadius Deprecated, use `options.radius` instead. Defaults to `10`.
     * @param legacyIsMetric Deprecated, use `options.isMetric` instead. Defaults to `false`.
     *
     * @example
     * faker.location.nearbyGPSCoordinate() // [ 33.8475, -170.5953 ]
     * faker.location.nearbyGPSCoordinate({ origin: [33, -170] }) // [ 33.0165, -170.0636 ]
     * faker.location.nearbyGPSCoordinate({ origin: [33, -170], radius: 1000, isMetric: true }) // [ 37.9163, -179.2408 ]
     *
     * @since 8.0.0
     */
    nearbyGPSCoordinate(options?: [latitude: number, longitude: number] | {
        /**
         * The original coordinate to get a new coordinate close to.
         */
        origin?: [latitude: number, longitude: number];
        /**
         * The maximum distance from the given coordinate to the new coordinate.
         *
         * @default 10
         */
        radius?: number;
        /**
         * If `true` assume the radius to be in kilometers. If `false` for miles.
         *
         * @default false
         */
        isMetric?: boolean;
    }, legacyRadius?: number, legacyIsMetric?: boolean): [latitude: number, longitude: number];
    /**
     * Returns a random time zone.
     *
     * @example
     * faker.location.timeZone() // 'Pacific/Guam'
     *
     * @since 8.0.0
     */
    timeZone(): string;
}
