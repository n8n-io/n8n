import { Zone } from './zone';

/**
 * Settings contains static getters and setters that control Luxon's overall behavior.
 * Luxon is a simple library with few options, but the ones it does have live here.
 */
// tslint:disable-next-line:no-unnecessary-class
export class Settings {
    /**
     * Get the callback for returning the current timestamp.
     */
    static get now(): () => number;

    /**
     * Set the callback for returning the current timestamp.
     * The function should return a number, which will be interpreted as an Epoch millisecond count
     *
     * @example Settings.now = () => Date.now() + 3000 // pretend it is 3 seconds in the future
     * @example Settings.now = () => 0 // always pretend it's Jan 1, 1970 at midnight in UTC time
     */
    static set now(now: () => number);

    /**
     * The default time zone object currently used to create DateTimes. Does not affect existing instances.
     * The default value is the system's time zone (the one set on the machine that runs this code).
     * Getting this property always returns a Zone object.
     */
    static defaultZone: Zone | string;

    /**
     * Get the default locale to create DateTimes with. Does not affect existing instances.
     */
    static get defaultLocale(): string;

    /**
     * Set the default locale to create DateTimes with. Does not affect existing instances.
     */
    static set defaultLocale(locale: string);

    /**
     * Get the default numbering system to create DateTimes with. Does not affect existing instances.
     */
    static get defaultNumberingSystem(): string;

    /**
     * Set the default numbering system to create DateTimes with. Does not affect existing instances.
     */
    static set defaultNumberingSystem(numberingSystem: string);

    /**
     * Get the default output calendar to create DateTimes with. Does not affect existing instances.
     */
    static get defaultOutputCalendar(): string;

    /**
     * Set the default output calendar to create DateTimes with. Does not affect existing instances.
     */
    static set defaultOutputCalendar(outputCalendar: string);

    /**
     * Get whether Luxon will throw when it encounters invalid DateTimes, Durations, or Intervals
     */
    static get throwOnInvalid(): boolean;

    /**
     * Set whether Luxon will throw when it encounters invalid DateTimes, Durations, or Intervals
     */
    static set throwOnInvalid(t: boolean);

    /**
     * Reset Luxon's global caches. Should only be necessary in testing scenarios.
     */
    static resetCaches(): void;
}
