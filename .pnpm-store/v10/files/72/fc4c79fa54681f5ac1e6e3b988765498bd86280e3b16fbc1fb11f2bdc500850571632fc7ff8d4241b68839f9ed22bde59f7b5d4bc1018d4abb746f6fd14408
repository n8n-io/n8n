/* eslint-disable no-param-reassign */

import * as common from './common';
import * as constants from './v4/constants';
import { AddressError } from './address-error';

/**
 * Represents an IPv4 address
 * @class Address4
 * @param {string} address - An IPv4 address string
 */
export class Address4 {
  address: string;
  addressMinusSuffix?: string;
  groups: number = constants.GROUPS;
  parsedAddress: string[] = [];
  parsedSubnet: string = '';
  subnet: string = '/32';
  subnetMask: number = 32;
  v4: boolean = true;

  constructor(address: string) {
    this.address = address;

    const subnet = constants.RE_SUBNET_STRING.exec(address);

    if (subnet) {
      this.parsedSubnet = subnet[0].replace('/', '');
      this.subnetMask = parseInt(this.parsedSubnet, 10);
      this.subnet = `/${this.subnetMask}`;

      if (this.subnetMask < 0 || this.subnetMask > constants.BITS) {
        throw new AddressError('Invalid subnet mask.');
      }

      address = address.replace(constants.RE_SUBNET_STRING, '');
    }

    this.addressMinusSuffix = address;

    this.parsedAddress = this.parse(address);
  }

  static isValid(address: string): boolean {
    try {
      // eslint-disable-next-line no-new
      new Address4(address);

      return true;
    } catch (e) {
      return false;
    }
  }

  /*
   * Parses a v4 address
   */
  parse(address: string) {
    const groups = address.split('.');

    if (!address.match(constants.RE_ADDRESS)) {
      throw new AddressError('Invalid IPv4 address.');
    }

    return groups;
  }

  /**
   * Returns the correct form of an address
   * @memberof Address4
   * @instance
   * @returns {String}
   */
  correctForm(): string {
    return this.parsedAddress.map((part) => parseInt(part, 10)).join('.');
  }

  /**
   * Returns true if the address is correct, false otherwise
   * @memberof Address4
   * @instance
   * @returns {Boolean}
   */
  isCorrect = common.isCorrect(constants.BITS);

  /**
   * Converts a hex string to an IPv4 address object
   * @memberof Address4
   * @static
   * @param {string} hex - a hex string to convert
   * @returns {Address4}
   */
  static fromHex(hex: string): Address4 {
    const padded = hex.replace(/:/g, '').padStart(8, '0');
    const groups = [];
    let i;

    for (i = 0; i < 8; i += 2) {
      const h = padded.slice(i, i + 2);

      groups.push(parseInt(h, 16));
    }

    return new Address4(groups.join('.'));
  }

  /**
   * Converts an integer into a IPv4 address object
   * @memberof Address4
   * @static
   * @param {integer} integer - a number to convert
   * @returns {Address4}
   */
  static fromInteger(integer: number): Address4 {
    return Address4.fromHex(integer.toString(16));
  }

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
  static fromArpa(arpaFormAddress: string): Address4 {
    // remove ending ".in-addr.arpa." or just "."
    const leader = arpaFormAddress.replace(/(\.in-addr\.arpa)?\.$/, '');

    const address = leader.split('.').reverse().join('.');

    return new Address4(address);
  }

  /**
   * Converts an IPv4 address object to a hex string
   * @memberof Address4
   * @instance
   * @returns {String}
   */
  toHex(): string {
    return this.parsedAddress.map((part) => common.stringToPaddedHex(part)).join(':');
  }

  /**
   * Converts an IPv4 address object to an array of bytes
   * @memberof Address4
   * @instance
   * @returns {Array}
   */
  toArray(): number[] {
    return this.parsedAddress.map((part) => parseInt(part, 10));
  }

  /**
   * Converts an IPv4 address object to an IPv6 address group
   * @memberof Address4
   * @instance
   * @returns {String}
   */
  toGroup6(): string {
    const output = [];
    let i;

    for (i = 0; i < constants.GROUPS; i += 2) {
      output.push(
        `${common.stringToPaddedHex(this.parsedAddress[i])}${common.stringToPaddedHex(
          this.parsedAddress[i + 1],
        )}`,
      );
    }

    return output.join(':');
  }

  /**
   * Returns the address as a `bigint`
   * @memberof Address4
   * @instance
   * @returns {bigint}
   */
  bigInt(): bigint {
    return BigInt(`0x${this.parsedAddress.map((n) => common.stringToPaddedHex(n)).join('')}`);
  }

  /**
   * Helper function getting start address.
   * @memberof Address4
   * @instance
   * @returns {bigint}
   */
  _startAddress(): bigint {
    return BigInt(`0b${this.mask() + '0'.repeat(constants.BITS - this.subnetMask)}`);
  }

  /**
   * The first address in the range given by this address' subnet.
   * Often referred to as the Network Address.
   * @memberof Address4
   * @instance
   * @returns {Address4}
   */
  startAddress(): Address4 {
    return Address4.fromBigInt(this._startAddress());
  }

  /**
   * The first host address in the range given by this address's subnet ie
   * the first address after the Network Address
   * @memberof Address4
   * @instance
   * @returns {Address4}
   */
  startAddressExclusive(): Address4 {
    const adjust = BigInt('1');
    return Address4.fromBigInt(this._startAddress() + adjust);
  }

  /**
   * Helper function getting end address.
   * @memberof Address4
   * @instance
   * @returns {bigint}
   */
  _endAddress(): bigint {
    return BigInt(`0b${this.mask() + '1'.repeat(constants.BITS - this.subnetMask)}`);
  }

  /**
   * The last address in the range given by this address' subnet
   * Often referred to as the Broadcast
   * @memberof Address4
   * @instance
   * @returns {Address4}
   */
  endAddress(): Address4 {
    return Address4.fromBigInt(this._endAddress());
  }

  /**
   * The last host address in the range given by this address's subnet ie
   * the last address prior to the Broadcast Address
   * @memberof Address4
   * @instance
   * @returns {Address4}
   */
  endAddressExclusive(): Address4 {
    const adjust = BigInt('1');
    return Address4.fromBigInt(this._endAddress() - adjust);
  }

  /**
   * Converts a BigInt to a v4 address object
   * @memberof Address4
   * @static
   * @param {bigint} bigInt - a BigInt to convert
   * @returns {Address4}
   */
  static fromBigInt(bigInt: bigint): Address4 {
    return Address4.fromHex(bigInt.toString(16));
  }

  /**
   * Convert a byte array to an Address4 object
   * @memberof Address4
   * @static
   * @param {Array<number>} bytes - an array of 4 bytes (0-255)
   * @returns {Address4}
   */
  static fromByteArray(bytes: Array<number>): Address4 {
    if (bytes.length !== 4) {
      throw new AddressError('IPv4 addresses require exactly 4 bytes');
    }

    // Validate that all bytes are within valid range (0-255)
    for (let i = 0; i < bytes.length; i++) {
      if (!Number.isInteger(bytes[i]) || bytes[i] < 0 || bytes[i] > 255) {
        throw new AddressError('All bytes must be integers between 0 and 255');
      }
    }

    return this.fromUnsignedByteArray(bytes);
  }

  /**
   * Convert an unsigned byte array to an Address4 object
   * @memberof Address4
   * @static
   * @param {Array<number>} bytes - an array of 4 unsigned bytes (0-255)
   * @returns {Address4}
   */
  static fromUnsignedByteArray(bytes: Array<number>): Address4 {
    if (bytes.length !== 4) {
      throw new AddressError('IPv4 addresses require exactly 4 bytes');
    }

    const address = bytes.join('.');
    return new Address4(address);
  }

  /**
   * Returns the first n bits of the address, defaulting to the
   * subnet mask
   * @memberof Address4
   * @instance
   * @returns {String}
   */
  mask(mask?: number): string {
    if (mask === undefined) {
      mask = this.subnetMask;
    }

    return this.getBitsBase2(0, mask);
  }

  /**
   * Returns the bits in the given range as a base-2 string
   * @memberof Address4
   * @instance
   * @returns {string}
   */
  getBitsBase2(start: number, end: number): string {
    return this.binaryZeroPad().slice(start, end);
  }

  /**
   * Return the reversed ip6.arpa form of the address
   * @memberof Address4
   * @param {Object} options
   * @param {boolean} options.omitSuffix - omit the "in-addr.arpa" suffix
   * @instance
   * @returns {String}
   */
  reverseForm(options?: common.ReverseFormOptions): string {
    if (!options) {
      options = {};
    }

    const reversed = this.correctForm().split('.').reverse().join('.');

    if (options.omitSuffix) {
      return reversed;
    }

    return `${reversed}.in-addr.arpa.`;
  }

  /**
   * Returns true if the given address is in the subnet of the current address
   * @memberof Address4
   * @instance
   * @returns {boolean}
   */
  isInSubnet = common.isInSubnet;

  /**
   * Returns true if the given address is a multicast address
   * @memberof Address4
   * @instance
   * @returns {boolean}
   */
  isMulticast(): boolean {
    return this.isInSubnet(new Address4('224.0.0.0/4'));
  }

  /**
   * Returns a zero-padded base-2 string representation of the address
   * @memberof Address4
   * @instance
   * @returns {string}
   */
  binaryZeroPad(): string {
    return this.bigInt().toString(2).padStart(constants.BITS, '0');
  }

  /**
   * Groups an IPv4 address for inclusion at the end of an IPv6 address
   * @returns {String}
   */
  groupForV6(): string {
    const segments = this.parsedAddress;

    return this.address.replace(
      constants.RE_ADDRESS,
      `<span class="hover-group group-v4 group-6">${segments
        .slice(0, 2)
        .join('.')}</span>.<span class="hover-group group-v4 group-7">${segments
        .slice(2, 4)
        .join('.')}</span>`,
    );
  }
}
