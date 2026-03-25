import * as common from './common';
import { BigInteger } from 'jsbn';
/**
 * Represents an IPv4 address
 * @class Address4
 * @param {string} address - An IPv4 address string
 */
export declare class Address4 {
    address: string;
    addressMinusSuffix?: string;
    groups: number;
    parsedAddress: string[];
    parsedSubnet: string;
    subnet: string;
    subnetMask: number;
    v4: boolean;
    constructor(address: string);
    static isValid(address: string): boolean;
    parse(address: string): string[];
    /**
     * Returns the correct form of an address
     * @memberof Address4
     * @instance
     * @returns {String}
     */
    correctForm(): string;
    /**
     * Returns true if the address is correct, false otherwise
     * @memberof Address4
     * @instance
     * @returns {Boolean}
     */
    isCorrect: (this: Address4 | import("./ipv6").Address6) => boolean;
    /**
     * Converts a hex string to an IPv4 address object
     * @memberof Address4
     * @static
     * @param {string} hex - a hex string to convert
     * @returns {Address4}
     */
    static fromHex(hex: string): Address4;
    /**
     * Converts an integer into a IPv4 address object
     * @memberof Address4
     * @static
     * @param {integer} integer - a number to convert
     * @returns {Address4}
     */
    static fromInteger(integer: number): Address4;
    /**
     * Return an address from in-addr.arpa form
     * @memberof Address4
     * @static
     * @param {string} arpaFormAddress - an 'in-addr.arpa' form ipv4 address
     * @returns {Adress4}
     * @example
     * var address = Address4.fromArpa(42.2.0.192.in-addr.arpa.)
     * address.correctForm(); // '192.0.2.42'
     */
    static fromArpa(arpaFormAddress: string): Address4;
    /**
     * Converts an IPv4 address object to a hex string
     * @memberof Address4
     * @instance
     * @returns {String}
     */
    toHex(): string;
    /**
     * Converts an IPv4 address object to an array of bytes
     * @memberof Address4
     * @instance
     * @returns {Array}
     */
    toArray(): number[];
    /**
     * Converts an IPv4 address object to an IPv6 address group
     * @memberof Address4
     * @instance
     * @returns {String}
     */
    toGroup6(): string;
    /**
     * Returns the address as a BigInteger
     * @memberof Address4
     * @instance
     * @returns {BigInteger}
     */
    bigInteger(): BigInteger;
    /**
     * Helper function getting start address.
     * @memberof Address4
     * @instance
     * @returns {BigInteger}
     */
    _startAddress(): BigInteger;
    /**
     * The first address in the range given by this address' subnet.
     * Often referred to as the Network Address.
     * @memberof Address4
     * @instance
     * @returns {Address4}
     */
    startAddress(): Address4;
    /**
     * The first host address in the range given by this address's subnet ie
     * the first address after the Network Address
     * @memberof Address4
     * @instance
     * @returns {Address4}
     */
    startAddressExclusive(): Address4;
    /**
     * Helper function getting end address.
     * @memberof Address4
     * @instance
     * @returns {BigInteger}
     */
    _endAddress(): BigInteger;
    /**
     * The last address in the range given by this address' subnet
     * Often referred to as the Broadcast
     * @memberof Address4
     * @instance
     * @returns {Address4}
     */
    endAddress(): Address4;
    /**
     * The last host address in the range given by this address's subnet ie
     * the last address prior to the Broadcast Address
     * @memberof Address4
     * @instance
     * @returns {Address4}
     */
    endAddressExclusive(): Address4;
    /**
     * Converts a BigInteger to a v4 address object
     * @memberof Address4
     * @static
     * @param {BigInteger} bigInteger - a BigInteger to convert
     * @returns {Address4}
     */
    static fromBigInteger(bigInteger: BigInteger): Address4;
    /**
     * Returns the first n bits of the address, defaulting to the
     * subnet mask
     * @memberof Address4
     * @instance
     * @returns {String}
     */
    mask(mask?: number): string;
    /**
     * Returns the bits in the given range as a base-2 string
     * @memberof Address4
     * @instance
     * @returns {string}
     */
    getBitsBase2(start: number, end: number): string;
    /**
     * Return the reversed ip6.arpa form of the address
     * @memberof Address4
     * @param {Object} options
     * @param {boolean} options.omitSuffix - omit the "in-addr.arpa" suffix
     * @instance
     * @returns {String}
     */
    reverseForm(options?: common.ReverseFormOptions): string;
    /**
     * Returns true if the given address is in the subnet of the current address
     * @memberof Address4
     * @instance
     * @returns {boolean}
     */
    isInSubnet: typeof common.isInSubnet;
    /**
     * Returns true if the given address is a multicast address
     * @memberof Address4
     * @instance
     * @returns {boolean}
     */
    isMulticast(): boolean;
    /**
     * Returns a zero-padded base-2 string representation of the address
     * @memberof Address4
     * @instance
     * @returns {string}
     */
    binaryZeroPad(): string;
    /**
     * Groups an IPv4 address for inclusion at the end of an IPv6 address
     * @returns {String}
     */
    groupForV6(): string;
}
//# sourceMappingURL=ipv4.d.ts.map