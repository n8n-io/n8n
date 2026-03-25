import * as _nanoid from 'nanoid';
import * as _nanoid_nonsecure from 'nanoid/non-secure';
import * as _uuid from 'uuid';
declare type Locale = (string & {}) | 'en' | 'fr' | 'fr-CA' | 'es';
export declare const nanoId: typeof _nanoid;
export declare const nonsecure: typeof _nanoid_nonsecure;
export declare const uuid: typeof _uuid;
export declare const setSeed: (seed: string) => void;
export declare const addLocale: (name: string, localeData: any) => void;
export declare const setDefaultLocale: (locale: Locale) => void;
export declare const number: (options?: {
    min?: number;
    max?: number;
    float?: boolean;
}) => number;
export declare const boolean: () => boolean;
export declare const arrayElement: <T>(array: T[]) => T;
export declare const array: <T>(count: number, cb: (index: number) => T) => T[];
export declare const objectElement: (obj: any) => {
    key: string;
    value: unknown;
};
declare type Gender = 'male' | 'female';
export declare const firstName: (options?: {
    locale?: Locale;
    gender?: Gender;
}) => string;
export declare const phoneNumber: (options?: {
    locale?: Locale;
    formats?: string[];
}) => string;
export declare const county: (options?: {
    locale?: Locale;
}) => string;
export declare const province: (options?: {
    locale?: Locale;
}) => string;
export declare const cityName: (options?: {
    locale?: Locale;
}) => string;
export declare const cityPrefix: (options?: {
    locale?: Locale;
}) => string;
export declare const citySuffix: (options?: {
    locale?: Locale;
}) => string;
declare type PlaceImgCategory = 'any' | 'animals' | 'architecture' | 'nature' | 'people' | 'tech';
declare type PlaceImgFilter = 'grayscale' | 'sepia';
export declare const imageUrlFromPlaceIMG: (options: {
    width: number;
    height: number;
    category?: PlaceImgCategory;
    filter?: PlaceImgFilter;
}) => string;
export declare const imageUrlFromPlaceholder: (options: {
    width: number;
    height?: number;
    backColor?: string;
    textColor?: string;
    textValue?: string;
}) => string;
export declare const lastName: (options?: {
    locale?: Locale;
}) => string;
export declare const name: (options?: {
    locale?: Locale;
    gender?: Gender;
}) => string;
export declare const jobTitle: (options?: {
    locale?: Locale;
}) => string;
export declare const jobType: (options?: {
    locale?: Locale;
}) => string;
export declare const jobArea: (options?: {
    locale?: Locale;
}) => string;
export declare const jobDescriptor: (options?: {
    locale?: Locale;
}) => string;
export declare const ip: () => string;
export declare const port: () => number;
export declare const ipv6: () => string;
export declare const color: (options?: {
    r?: number;
    g?: number;
    b?: number;
}) => string;
export declare const hex: (count?: number) => string;
declare type WordType = 'verb' | 'preposition' | 'noun' | 'interjection' | 'conjunction' | 'adverb' | 'adjective';
export declare const word: (options?: {
    locale?: Locale;
    type?: WordType;
    filter?: (word: string) => void;
}) => string;
export declare const username: (options?: {
    locale?: Locale;
    type?: number;
    firstName?: string;
    lastName?: string;
}) => string;
declare type MacAddressSeparator = '' | '.' | ':' | '-' | ' ';
declare type MacAddressTransmission = 'unicast' | 'multicast';
declare type MacAddressAdministration = 'laa' | 'uaa';
export declare const macAddress: (options?: {
    separator?: MacAddressSeparator;
    transmission?: MacAddressTransmission;
    administration?: MacAddressAdministration;
}) => string;
export declare const email: (options?: {
    locale?: Locale;
    firstName?: string;
    lastName?: string;
    provider?: string;
}) => string;
export declare const domainName: (options?: {
    locale?: Locale;
}) => string;
export declare const domainSuffix: (options?: {
    locale?: Locale;
}) => string;
export declare const domainUrl: (options?: {
    locale?: Locale;
}) => string;
export declare const zipCode: (options?: {
    locale?: Locale;
    format?: string;
}) => string;
export declare const streetSuffix: (options?: {
    locale?: Locale;
}) => string;
export declare const streetPrefix: (options?: {
    locale?: Locale;
}) => string;
export declare const streetName: (options?: {
    locale?: Locale;
}) => string;
export declare const streetAddress: (options?: {
    locale?: Locale;
}) => string;
export declare const timeZone: (options?: {
    locale?: Locale;
}) => string;
export declare const latitude: () => string;
export declare const longitude: () => string;
export declare const latLong: () => string;
declare type DirectionType = 'cardinal' | 'ordinal';
export declare const direction: (options?: {
    locale?: Locale;
    type?: DirectionType;
    useAbbr?: boolean;
}) => any;
export declare const state: (options?: {
    locale?: Locale;
    useAbbr?: boolean;
}) => string;
declare type CountryCodeType = 'alpha2' | 'alpha3';
export declare const country: (options?: {
    locale?: Locale;
    useCode?: CountryCodeType;
}) => string;
export declare const price: (options?: {
    locale?: Locale;
    min?: number;
    max?: number;
    currency?: string;
}) => string;
declare type CreditCardProvider = 'solo' | 'visa' | 'mastercard' | 'maestro' | 'laser' | 'jcb' | 'instapayment' | 'discover' | 'dinersClub' | 'americanExpress';
export declare const creditCardNumber: (options?: {
    provider?: CreditCardProvider;
}) => string;
export declare const creditCardCVV: () => string;
export declare const semver: () => string;
export declare const month: (options?: {
    locale?: Locale;
    useAbbr?: boolean;
}) => string;
export declare const weekday: (options?: {
    locale?: Locale;
    useAbbr?: boolean;
}) => string;
export declare const date: (options?: {
    from?: Date;
    to?: Date;
}) => Date;
export declare const bitcoinAddress: () => string;
export declare const mimeType: () => string;
export declare const fileExt: () => string;
export declare const dirPath: () => string;
export declare const fileName: () => string;
export declare const filePath: () => string;
interface PasswordOptions {
    maxLength?: number;
    minLength?: number;
    uppercases?: boolean;
    lowercases?: boolean;
    numbers?: boolean | number;
    symbols?: boolean | number | string;
    exclude?: (string & {}) | 'similar';
}
export declare const password: (options?: PasswordOptions) => string;
declare const _default: {
    setDefaultLocale: (locale: Locale) => void;
    addLocale: (name: string, localeData: any) => void;
    cityName: (options?: {
        locale?: Locale;
    }) => string;
    citySuffix: (options?: {
        locale?: Locale;
    }) => string;
    cityPrefix: (options?: {
        locale?: Locale;
    }) => string;
    number: (options?: {
        min?: number;
        max?: number;
        float?: boolean;
    }) => number;
    phoneNumber: (options?: {
        locale?: Locale;
        formats?: string[];
    }) => string;
    firstName: (options?: {
        locale?: Locale;
        gender?: Gender;
    }) => string;
    arrayElement: <T>(array: T[]) => T;
    boolean: () => boolean;
    imageUrlFromPlaceIMG: (options: {
        width: number;
        height: number;
        category?: PlaceImgCategory;
        filter?: PlaceImgFilter;
    }) => string;
    imageUrlFromPlaceholder: (options: {
        width: number;
        height?: number;
        backColor?: string;
        textColor?: string;
        textValue?: string;
    }) => string;
    objectElement: (obj: any) => {
        key: string;
        value: unknown;
    };
    array: <T_1>(count: number, cb: (index: number) => T_1) => T_1[];
    lastName: (options?: {
        locale?: Locale;
    }) => string;
    name: (options?: {
        locale?: Locale;
        gender?: Gender;
    }) => string;
    jobTitle: (options?: {
        locale?: Locale;
    }) => string;
    jobArea: (options?: {
        locale?: Locale;
    }) => string;
    jobDescriptor: (options?: {
        locale?: Locale;
    }) => string;
    jobType: (options?: {
        locale?: Locale;
    }) => string;
    ip: () => string;
    port: () => number;
    word: (options?: {
        locale?: Locale;
        type?: WordType;
        filter?: (word: string) => void;
    }) => string;
    ipv6: () => string;
    color: (options?: {
        r?: number;
        g?: number;
        b?: number;
    }) => string;
    username: (options?: {
        locale?: Locale;
        type?: number;
        firstName?: string;
        lastName?: string;
    }) => string;
    macAddress: (options?: {
        separator?: MacAddressSeparator;
        transmission?: MacAddressTransmission;
        administration?: MacAddressAdministration;
    }) => string;
    domainSuffix: (options?: {
        locale?: Locale;
    }) => string;
    domainName: (options?: {
        locale?: Locale;
    }) => string;
    email: (options?: {
        locale?: Locale;
        firstName?: string;
        lastName?: string;
        provider?: string;
    }) => string;
    domainUrl: (options?: {
        locale?: Locale;
    }) => string;
    zipCode: (options?: {
        locale?: Locale;
        format?: string;
    }) => string;
    streetPrefix: (options?: {
        locale?: Locale;
    }) => string;
    streetSuffix: (options?: {
        locale?: Locale;
    }) => string;
    streetName: (options?: {
        locale?: Locale;
    }) => string;
    streetAddress: (options?: {
        locale?: Locale;
    }) => string;
    timeZone: (options?: {
        locale?: Locale;
    }) => string;
    latitude: () => string;
    longitude: () => string;
    latLong: () => string;
    direction: (options?: {
        locale?: Locale;
        type?: DirectionType;
        useAbbr?: boolean;
    }) => any;
    state: (options?: {
        locale?: Locale;
        useAbbr?: boolean;
    }) => string;
    country: (options?: {
        locale?: Locale;
        useCode?: CountryCodeType;
    }) => string;
    county: (options?: {
        locale?: Locale;
    }) => string;
    province: (options?: {
        locale?: Locale;
    }) => string;
    price: (options?: {
        locale?: Locale;
        min?: number;
        max?: number;
        currency?: string;
    }) => string;
    creditCardNumber: (options?: {
        provider?: CreditCardProvider;
    }) => string;
    creditCardCVV: () => string;
    semver: () => string;
    month: (options?: {
        locale?: Locale;
        useAbbr?: boolean;
    }) => string;
    weekday: (options?: {
        locale?: Locale;
        useAbbr?: boolean;
    }) => string;
    date: (options?: {
        from?: Date;
        to?: Date;
    }) => Date;
    bitcoinAddress: () => string;
    mimeType: () => string;
    fileExt: () => string;
    dirPath: () => string;
    filePath: () => string;
    fileName: () => string;
    setSeed: (seed: string) => void;
    hex: (count?: number) => string;
    password: (options?: PasswordOptions) => string;
    nanoId: typeof _nanoid;
    uuid: typeof _uuid;
    nonsecure: typeof _nanoid_nonsecure;
};
export default _default;
