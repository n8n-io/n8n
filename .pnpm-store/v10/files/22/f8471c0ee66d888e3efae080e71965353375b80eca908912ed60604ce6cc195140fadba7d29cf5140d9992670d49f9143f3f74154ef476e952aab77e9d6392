import * as common from './common';
import { Address4 } from './ipv4';
interface SixToFourProperties {
    prefix: string;
    gateway: string;
}
interface TeredoProperties {
    prefix: string;
    server4: string;
    client4: string;
    flags: string;
    coneNat: boolean;
    microsoft: {
        reserved: boolean;
        universalLocal: boolean;
        groupIndividual: boolean;
        nonce: string;
    };
    udpPort: string;
}
/**
 * Represents an IPv6 address
 * @class Address6
 * @param {string} address - An IPv6 address string
 * @param {number} [groups=8] - How many octets to parse
 * @example
 * var address = new Address6('2001::/32');
 */
export declare class Address6 {
    address4?: Address4;
    address: string;
    addressMinusSuffix: string;
    elidedGroups?: number;
    elisionBegin?: number;
    elisionEnd?: number;
    groups: number;
    parsedAddress4?: string;
    parsedAddress: string[];
    parsedSubnet: string;
    subnet: string;
    subnetMask: number;
    v4: boolean;
    zone: string;
    constructor(address: string, optionalGroups?: number);
    static isValid(address: string): boolean;
    /**
     * Convert a BigInt to a v6 address object
     * @memberof Address6
     * @static
     * @param {bigint} bigInt - a BigInt to convert
     * @returns {Address6}
     * @example
     * var bigInt = BigInt('1000000000000');
     * var address = Address6.fromBigInt(bigInt);
     * address.correctForm(); // '::e8:d4a5:1000'
     */
    static fromBigInt(bigInt: bigint): Address6;
    /**
     * Convert a URL (with optional port number) to an address object
     * @memberof Address6
     * @static
     * @param {string} url - a URL with optional port number
     * @example
     * var addressAndPort = Address6.fromURL('http://[ffff::]:8080/foo/');
     * addressAndPort.address.correctForm(); // 'ffff::'
     * addressAndPort.port; // 8080
     */
    static fromURL(url: string): {
        error: string;
        address: null;
        port: null;
    } | {
        address: Address6;
        port: number | null;
        error?: undefined;
    };
    /**
     * Create an IPv6-mapped address given an IPv4 address
     * @memberof Address6
     * @static
     * @param {string} address - An IPv4 address string
     * @returns {Address6}
     * @example
     * var address = Address6.fromAddress4('192.168.0.1');
     * address.correctForm(); // '::ffff:c0a8:1'
     * address.to4in6(); // '::ffff:192.168.0.1'
     */
    static fromAddress4(address: string): Address6;
    /**
     * Return an address from ip6.arpa form
     * @memberof Address6
     * @static
     * @param {string} arpaFormAddress - an 'ip6.arpa' form address
     * @returns {Adress6}
     * @example
     * var address = Address6.fromArpa(e.f.f.f.3.c.2.6.f.f.f.e.6.6.8.e.1.0.6.7.9.4.e.c.0.0.0.0.1.0.0.2.ip6.arpa.)
     * address.correctForm(); // '2001:0:ce49:7601:e866:efff:62c3:fffe'
     */
    static fromArpa(arpaFormAddress: string): Address6;
    /**
     * Return the Microsoft UNC transcription of the address
     * @memberof Address6
     * @instance
     * @returns {String} the Microsoft UNC transcription of the address
     */
    microsoftTranscription(): string;
    /**
     * Return the first n bits of the address, defaulting to the subnet mask
     * @memberof Address6
     * @instance
     * @param {number} [mask=subnet] - the number of bits to mask
     * @returns {String} the first n bits of the address as a string
     */
    mask(mask?: number): string;
    /**
     * Return the number of possible subnets of a given size in the address
     * @memberof Address6
     * @instance
     * @param {number} [subnetSize=128] - the subnet size
     * @returns {String}
     */
    possibleSubnets(subnetSize?: number): string;
    /**
     * Helper function getting start address.
     * @memberof Address6
     * @instance
     * @returns {bigint}
     */
    _startAddress(): bigint;
    /**
     * The first address in the range given by this address' subnet
     * Often referred to as the Network Address.
     * @memberof Address6
     * @instance
     * @returns {Address6}
     */
    startAddress(): Address6;
    /**
     * The first host address in the range given by this address's subnet ie
     * the first address after the Network Address
     * @memberof Address6
     * @instance
     * @returns {Address6}
     */
    startAddressExclusive(): Address6;
    /**
     * Helper function getting end address.
     * @memberof Address6
     * @instance
     * @returns {bigint}
     */
    _endAddress(): bigint;
    /**
     * The last address in the range given by this address' subnet
     * Often referred to as the Broadcast
     * @memberof Address6
     * @instance
     * @returns {Address6}
     */
    endAddress(): Address6;
    /**
     * The last host address in the range given by this address's subnet ie
     * the last address prior to the Broadcast Address
     * @memberof Address6
     * @instance
     * @returns {Address6}
     */
    endAddressExclusive(): Address6;
    /**
     * Return the scope of the address
     * @memberof Address6
     * @instance
     * @returns {String}
     */
    getScope(): string;
    /**
     * Return the type of the address
     * @memberof Address6
     * @instance
     * @returns {String}
     */
    getType(): string;
    /**
     * Return the bits in the given range as a BigInt
     * @memberof Address6
     * @instance
     * @returns {bigint}
     */
    getBits(start: number, end: number): bigint;
    /**
     * Return the bits in the given range as a base-2 string
     * @memberof Address6
     * @instance
     * @returns {String}
     */
    getBitsBase2(start: number, end: number): string;
    /**
     * Return the bits in the given range as a base-16 string
     * @memberof Address6
     * @instance
     * @returns {String}
     */
    getBitsBase16(start: number, end: number): string;
    /**
     * Return the bits that are set past the subnet mask length
     * @memberof Address6
     * @instance
     * @returns {String}
     */
    getBitsPastSubnet(): string;
    /**
     * Return the reversed ip6.arpa form of the address
     * @memberof Address6
     * @param {Object} options
     * @param {boolean} options.omitSuffix - omit the "ip6.arpa" suffix
     * @instance
     * @returns {String}
     */
    reverseForm(options?: common.ReverseFormOptions): string;
    /**
     * Return the correct form of the address
     * @memberof Address6
     * @instance
     * @returns {String}
     */
    correctForm(): string;
    /**
     * Return a zero-padded base-2 string representation of the address
     * @memberof Address6
     * @instance
     * @returns {String}
     * @example
     * var address = new Address6('2001:4860:4001:803::1011');
     * address.binaryZeroPad();
     * // '0010000000000001010010000110000001000000000000010000100000000011
     * //  0000000000000000000000000000000000000000000000000001000000010001'
     */
    binaryZeroPad(): string;
    parse4in6(address: string): string;
    parse(address: string): string[];
    /**
     * Return the canonical form of the address
     * @memberof Address6
     * @instance
     * @returns {String}
     */
    canonicalForm(): string;
    /**
     * Return the decimal form of the address
     * @memberof Address6
     * @instance
     * @returns {String}
     */
    decimal(): string;
    /**
     * Return the address as a BigInt
     * @memberof Address6
     * @instance
     * @returns {bigint}
     */
    bigInt(): bigint;
    /**
     * Return the last two groups of this address as an IPv4 address string
     * @memberof Address6
     * @instance
     * @returns {Address4}
     * @example
     * var address = new Address6('2001:4860:4001::1825:bf11');
     * address.to4().correctForm(); // '24.37.191.17'
     */
    to4(): Address4;
    /**
     * Return the v4-in-v6 form of the address
     * @memberof Address6
     * @instance
     * @returns {String}
     */
    to4in6(): string;
    /**
     * Return an object containing the Teredo properties of the address
     * @memberof Address6
     * @instance
     * @returns {Object}
     */
    inspectTeredo(): TeredoProperties;
    /**
     * Return an object containing the 6to4 properties of the address
     * @memberof Address6
     * @instance
     * @returns {Object}
     */
    inspect6to4(): SixToFourProperties;
    /**
     * Return a v6 6to4 address from a v6 v4inv6 address
     * @memberof Address6
     * @instance
     * @returns {Address6}
     */
    to6to4(): Address6 | null;
    /**
     * Return a byte array
     * @memberof Address6
     * @instance
     * @returns {Array}
     */
    toByteArray(): number[];
    /**
     * Return an unsigned byte array
     * @memberof Address6
     * @instance
     * @returns {Array}
     */
    toUnsignedByteArray(): number[];
    /**
     * Convert a byte array to an Address6 object
     * @memberof Address6
     * @static
     * @returns {Address6}
     */
    static fromByteArray(bytes: Array<any>): Address6;
    /**
     * Convert an unsigned byte array to an Address6 object
     * @memberof Address6
     * @static
     * @returns {Address6}
     */
    static fromUnsignedByteArray(bytes: Array<any>): Address6;
    /**
     * Returns true if the given address is in the subnet of the current address
     * @memberof Address6
     * @instance
     * @returns {boolean}
     */
    isInSubnet: typeof common.isInSubnet;
    /**
     * Returns true if the address is correct, false otherwise
     * @memberof Address6
     * @instance
     * @returns {boolean}
     */
    isCorrect: (this: Address4 | Address6) => boolean;
    /**
     * Returns true if the address is in the canonical form, false otherwise
     * @memberof Address6
     * @instance
     * @returns {boolean}
     */
    isCanonical(): boolean;
    /**
     * Returns true if the address is a link local address, false otherwise
     * @memberof Address6
     * @instance
     * @returns {boolean}
     */
    isLinkLocal(): boolean;
    /**
     * Returns true if the address is a multicast address, false otherwise
     * @memberof Address6
     * @instance
     * @returns {boolean}
     */
    isMulticast(): boolean;
    /**
     * Returns true if the address is a v4-in-v6 address, false otherwise
     * @memberof Address6
     * @instance
     * @returns {boolean}
     */
    is4(): boolean;
    /**
     * Returns true if the address is a Teredo address, false otherwise
     * @memberof Address6
     * @instance
     * @returns {boolean}
     */
    isTeredo(): boolean;
    /**
     * Returns true if the address is a 6to4 address, false otherwise
     * @memberof Address6
     * @instance
     * @returns {boolean}
     */
    is6to4(): boolean;
    /**
     * Returns true if the address is a loopback address, false otherwise
     * @memberof Address6
     * @instance
     * @returns {boolean}
     */
    isLoopback(): boolean;
    /**
     * @returns {String} the address in link form with a default port of 80
     */
    href(optionalPort?: number | string): string;
    /**
     * @returns {String} a link suitable for conveying the address via a URL hash
     */
    link(options?: {
        className?: string;
        prefix?: string;
        v4?: boolean;
    }): string;
    /**
     * Groups an address
     * @returns {String}
     */
    group(): string;
    /**
     * Generate a regular expression string that can be used to find or validate
     * all variations of this address
     * @memberof Address6
     * @instance
     * @param {boolean} substringSearch
     * @returns {string}
     */
    regularExpressionString(this: Address6, substringSearch?: boolean): string;
    /**
     * Generate a regular expression that can be used to find or validate all
     * variations of this address.
     * @memberof Address6
     * @instance
     * @param {boolean} substringSearch
     * @returns {RegExp}
     */
    regularExpression(this: Address6, substringSearch?: boolean): RegExp;
}
export {};
//# sourceMappingURL=ipv6.d.ts.map