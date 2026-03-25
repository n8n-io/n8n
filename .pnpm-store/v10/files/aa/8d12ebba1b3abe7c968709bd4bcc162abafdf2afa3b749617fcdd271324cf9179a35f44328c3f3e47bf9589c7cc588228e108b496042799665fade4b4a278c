/**
 * IATA stands for [International Air Transport Association](https://iata.org).
 * It's the trade association for the world's airlines and it is
 * responsible for setting standards relating to many aspects of airline
 * operations.
 */
import { ModuleBase } from '../../internal/module-base';
export declare enum Aircraft {
    Narrowbody = "narrowbody",
    Regional = "regional",
    Widebody = "widebody"
}
export type AircraftType = `${Aircraft}`;
export interface Airline {
    /**
     * The name of the airline (e.g. `'American Airlines'`).
     */
    readonly name: string;
    /**
     * The 2 character IATA code of the airline (e.g. `'AA'`).
     */
    readonly iataCode: string;
}
export interface Airplane {
    /**
     * The name of the airplane (e.g. `'Airbus A321'`).
     */
    readonly name: string;
    /**
     * The IATA code of the airplane (e.g. `'321'`).
     */
    readonly iataTypeCode: string;
}
export interface Airport {
    /**
     * The name of the airport (e.g. `'Dallas Fort Worth International Airport'`).
     */
    readonly name: string;
    /**
     * The IATA code of the airport (e.g. `'DFW'`).
     */
    readonly iataCode: string;
}
/**
 * Module to generate airline and airport related data.
 *
 * ### Overview
 *
 * Several methods in this module return objects rather than strings. For example, you can use `faker.airline.airport().iataCode` to pick out the specific property you need.
 *
 * For a random airport, use [`airport()`](https://fakerjs.dev/api/airline.html#airport).
 *
 * For a random airline, use [`airline()`](https://fakerjs.dev/api/airline.html#airline).
 *
 * For a dummy booking, a passenger will generally book a flight on a specific [`flightNumber()`](https://fakerjs.dev/api/airline.html#flightnumber), [`airplane()`](https://fakerjs.dev/api/airline.html#airplane), be allocated a [`seat()`](https://fakerjs.dev/api/airline.html#seat), and [`recordLocator()`](https://fakerjs.dev/api/airline.html#recordlocator).
 *
 * ### Related Modules
 *
 * - To generate sample passenger data, you can use the methods of the [`faker.person`](https://fakerjs.dev/api/person.html) module.
 */
export declare class AirlineModule extends ModuleBase {
    /**
     * Generates a random airport.
     *
     * @example
     * faker.airline.airport() // { name: 'Dallas Fort Worth International Airport', iataCode: 'DFW' }
     *
     * @since 8.0.0
     */
    airport(): Airport;
    /**
     * Generates a random airline.
     *
     * @example
     * faker.airline.airline() // { name: 'American Airlines', iataCode: 'AA' }
     *
     * @since 8.0.0
     */
    airline(): Airline;
    /**
     * Generates a random airplane.
     *
     * @example
     * faker.airline.airplane() // { name: 'Airbus A321neo', iataTypeCode: '32Q' }
     *
     * @since 8.0.0
     */
    airplane(): Airplane;
    /**
     * Generates a random [record locator](https://en.wikipedia.org/wiki/Record_locator). Record locators
     * are used by airlines to identify reservations. They're also known as booking reference numbers,
     * locator codes, confirmation codes, or reservation codes.
     *
     * @param options The options to use.
     * @param options.allowNumerics Whether to allow numeric characters. Defaults to `false`.
     * @param options.allowVisuallySimilarCharacters Whether to allow visually similar characters such as '1' and 'I'. Defaults to `false`.
     *
     * @example
     * faker.airline.recordLocator() // 'KIFRWE'
     * faker.airline.recordLocator({ allowNumerics: true }) // 'E5TYEM'
     * faker.airline.recordLocator({ allowVisuallySimilarCharacters: true }) // 'ANZNEI'
     * faker.airline.recordLocator({ allowNumerics: true, allowVisuallySimilarCharacters: true }) // '1Z2Z3E'
     *
     * @since 8.0.0
     */
    recordLocator(options?: {
        /**
         * Whether to allow numeric characters.
         *
         * @default false
         */
        allowNumerics?: boolean;
        /**
         * Whether to allow visually similar characters such as '1' and 'I'.
         *
         * @default false
         */
        allowVisuallySimilarCharacters?: boolean;
    }): string;
    /**
     * Generates a random seat.
     *
     * @param options The options to use.
     * @param options.aircraftType The aircraft type. Can be one of `narrowbody`, `regional`, `widebody`. Defaults to `narrowbody`.
     *
     * @example
     * faker.airline.seat() // '22C'
     * faker.airline.seat({ aircraftType: 'regional' }) // '7A'
     * faker.airline.seat({ aircraftType: 'widebody' }) // '42K'
     *
     * @since 8.0.0
     */
    seat(options?: {
        /**
         * The aircraft type. Can be one of `narrowbody`, `regional`, `widebody`.
         *
         * @default 'narrowbody'
         */
        aircraftType?: AircraftType;
    }): string;
    /**
     * Returns a random aircraft type.
     *
     * @example
     * faker.airline.aircraftType() // 'narrowbody'
     *
     * @since 8.0.0
     */
    aircraftType(): AircraftType;
    /**
     * Returns a random flight number. Flight numbers are always 1 to 4 digits long. Sometimes they are
     * used without leading zeros (e.g.: `American Airlines flight 425`) and sometimes with leading
     * zeros, often with the airline code prepended (e.g.: `AA0425`).
     *
     * To generate a flight number prepended with an airline code, combine this function with the
     * `airline()` function and use template literals:
     * ```
     * `${faker.airline.airline().iataCode}${faker.airline.flightNumber({ addLeadingZeros: true })}` // 'AA0798'
     * ```
     *
     * @param options The options to use.
     * @param options.length The number or range of digits to generate. Defaults to `{ min: 1, max: 4 }`.
     * @param options.addLeadingZeros Whether to pad the flight number up to 4 digits with leading zeros. Defaults to `false`.
     *
     * @example
     * faker.airline.flightNumber() // '2405'
     * faker.airline.flightNumber({ addLeadingZeros: true }) // '0249'
     * faker.airline.flightNumber({ addLeadingZeros: true, length: 2 }) // '0042'
     * faker.airline.flightNumber({ addLeadingZeros: true, length: { min: 2, max: 3 } }) // '0624'
     * faker.airline.flightNumber({ length: 3 }) // '425'
     * faker.airline.flightNumber({ length: { min: 2, max: 3 } }) // '84'
     *
     * @since 8.0.0
     */
    flightNumber(options?: {
        /**
         * The number or range of digits to generate.
         *
         * @default { min: 1, max: 4 }
         */
        length?: number | {
            /**
             * The minimum number of digits to generate.
             */
            min: number;
            /**
             * The maximum number of digits to generate.
             */
            max: number;
        };
        /**
         * Whether to pad the flight number up to 4 digits with leading zeros.
         *
         * @default false
         */
        addLeadingZeros?: boolean;
    }): string;
}
