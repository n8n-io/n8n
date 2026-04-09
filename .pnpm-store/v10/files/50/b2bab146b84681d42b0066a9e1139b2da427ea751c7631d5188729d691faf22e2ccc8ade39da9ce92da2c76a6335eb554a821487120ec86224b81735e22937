import type { Faker } from '../..';
/**
 * Module to generate phone-related data.
 */
export declare class PhoneModule {
    private readonly faker;
    constructor(faker: Faker);
    /**
     * Generates a random phone number.
     *
     * @param format Format of the phone number. Defaults to a random phone number format.
     *
     * @see faker.phone.number()
     *
     * @example
     * faker.phone.phoneNumber() // '961-770-7727'
     * faker.phone.phoneNumber('501-###-###') // '501-039-841'
     * faker.phone.phoneNumber('+48 91 ### ## ##') // '+48 91 463 61 70'
     *
     * @since 2.0.1
     *
     * @deprecated Use faker.phone.number() instead.
     */
    phoneNumber(format?: string): string;
    /**
     * Generates a random phone number.
     *
     * @param format Format of the phone number. Defaults to a random phone number format.
     *
     * @example
     * faker.phone.number() // '961-770-7727'
     * faker.phone.number('501-###-###') // '501-039-841'
     * faker.phone.number('+48 91 ### ## ##') // '+48 91 463 61 70'
     *
     * @since 7.3.0
     */
    number(format?: string): string;
    /**
     * Returns phone number in a format of the given index from `faker.definitions.phone_number.formats`.
     *
     * @param phoneFormatsArrayIndex Index in the `faker.definitions.phone_number.formats` array. Defaults to `0`.
     *
     * @see faker.phone.phoneNumber()
     * @see faker.helpers.replaceSymbolWithNumber()
     *
     * @example
     * faker.phone.phoneNumberFormat() // '943-627-0355'
     * faker.phone.phoneNumberFormat(3) // '282.652.3201'
     *
     * @since 2.0.1
     *
     * @deprecated
     * Use faker.phone.phoneNumber() instead.
     */
    phoneNumberFormat(phoneFormatsArrayIndex?: number): string;
    /**
     * Returns a random phone number format.
     *
     * @see faker.phone.phoneNumber()
     * @see faker.definitions.phone_number.formats()
     *
     * @example
     * faker.phone.phoneFormats() // '!##.!##.####'
     *
     * @since 2.0.1
     *
     * @deprecated
     * Use `faker.phone.phoneNumber()` instead.
     */
    phoneFormats(): string;
    /**
     * Generates IMEI number.
     *
     * @example
     * faker.phone.imei() // '13-850175-913761-7'
     *
     * @since 6.2.0
     */
    imei(): string;
}
