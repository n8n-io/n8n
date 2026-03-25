/* eslint-disable prefer-destructuring */
/* eslint-disable no-param-reassign */

import * as common from './common';
import * as constants4 from './v4/constants';
import * as constants6 from './v6/constants';
import * as helpers from './v6/helpers';
import { Address4 } from './ipv4';
import {
  ADDRESS_BOUNDARY,
  possibleElisions,
  simpleRegularExpression,
} from './v6/regular-expressions';
import { AddressError } from './address-error';
import { BigInteger } from 'jsbn';
import { sprintf } from 'sprintf-js';

function assert(condition: any): asserts condition {
  if (!condition) {
    throw new Error('Assertion failed.');
  }
}

function addCommas(number: string): string {
  const r = /(\d+)(\d{3})/;

  while (r.test(number)) {
    number = number.replace(r, '$1,$2');
  }

  return number;
}

function spanLeadingZeroes4(n: string): string {
  n = n.replace(/^(0{1,})([1-9]+)$/, '<span class="parse-error">$1</span>$2');
  n = n.replace(/^(0{1,})(0)$/, '<span class="parse-error">$1</span>$2');

  return n;
}

/*
 * A helper function to compact an array
 */
function compact(address: string[], slice: number[]) {
  const s1 = [];
  const s2 = [];
  let i;

  for (i = 0; i < address.length; i++) {
    if (i < slice[0]) {
      s1.push(address[i]);
    } else if (i > slice[1]) {
      s2.push(address[i]);
    }
  }

  return s1.concat(['compact']).concat(s2);
}

function paddedHex(octet: string): string {
  return sprintf('%04x', parseInt(octet, 16));
}

function unsignByte(b: number) {
  // eslint-disable-next-line no-bitwise
  return b & 0xff;
}


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
export class Address6 {
  address4?: Address4;
  address: string;
  addressMinusSuffix: string = '';
  elidedGroups?: number;
  elisionBegin?: number;
  elisionEnd?: number;
  groups: number;
  parsedAddress4?: string;
  parsedAddress: string[];
  parsedSubnet: string = '';
  subnet: string = '/128';
  subnetMask: number = 128;
  v4: boolean = false;
  zone: string = '';

  constructor(address: string, optionalGroups?: number) {
    if (optionalGroups === undefined) {
      this.groups = constants6.GROUPS;
    } else {
      this.groups = optionalGroups;
    }

    this.address = address;

    const subnet = constants6.RE_SUBNET_STRING.exec(address);

    if (subnet) {
      this.parsedSubnet = subnet[0].replace('/', '');
      this.subnetMask = parseInt(this.parsedSubnet, 10);
      this.subnet = `/${this.subnetMask}`;

      if (
        Number.isNaN(this.subnetMask) ||
        this.subnetMask < 0 ||
        this.subnetMask > constants6.BITS
      ) {
        throw new AddressError('Invalid subnet mask.');
      }

      address = address.replace(constants6.RE_SUBNET_STRING, '');
    } else if (/\//.test(address)) {
      throw new AddressError('Invalid subnet mask.');
    }

    const zone = constants6.RE_ZONE_STRING.exec(address);

    if (zone) {
      this.zone = zone[0];

      address = address.replace(constants6.RE_ZONE_STRING, '');
    }

    this.addressMinusSuffix = address;

    this.parsedAddress = this.parse(this.addressMinusSuffix);
  }

  static isValid(address: string): boolean {
    try {
      // eslint-disable-next-line no-new
      new Address6(address);

      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Convert a BigInteger to a v6 address object
   * @memberof Address6
   * @static
   * @param {BigInteger} bigInteger - a BigInteger to convert
   * @returns {Address6}
   * @example
   * var bigInteger = new BigInteger('1000000000000');
   * var address = Address6.fromBigInteger(bigInteger);
   * address.correctForm(); // '::e8:d4a5:1000'
   */
  static fromBigInteger(bigInteger: BigInteger): Address6 {
    const hex = bigInteger.toString(16).padStart(32, '0');
    const groups = [];
    let i;

    for (i = 0; i < constants6.GROUPS; i++) {
      groups.push(hex.slice(i * 4, (i + 1) * 4));
    }

    return new Address6(groups.join(':'));
  }

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
  static fromURL(url: string) {
    let host: string;
    let port: string | number | null = null;
    let result: string[] | null;

    // If we have brackets parse them and find a port
    if (url.indexOf('[') !== -1 && url.indexOf(']:') !== -1) {
      result = constants6.RE_URL_WITH_PORT.exec(url);

      if (result === null) {
        return {
          error: 'failed to parse address with port',
          address: null,
          port: null,
        };
      }

      host = result[1];
      port = result[2];
      // If there's a URL extract the address
    } else if (url.indexOf('/') !== -1) {
      // Remove the protocol prefix
      url = url.replace(/^[a-z0-9]+:\/\//, '');

      // Parse the address
      result = constants6.RE_URL.exec(url);

      if (result === null) {
        return {
          error: 'failed to parse address from URL',
          address: null,
          port: null,
        };
      }

      host = result[1];
      // Otherwise just assign the URL to the host and let the library parse it
    } else {
      host = url;
    }

    // If there's a port convert it to an integer
    if (port) {
      port = parseInt(port, 10);

      // squelch out of range ports
      if (port < 0 || port > 65536) {
        port = null;
      }
    } else {
      // Standardize `undefined` to `null`
      port = null;
    }

    return {
      address: new Address6(host),
      port,
    };
  }

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
  static fromAddress4(address: string): Address6 {
    const address4 = new Address4(address);

    const mask6 = constants6.BITS - (constants4.BITS - address4.subnetMask);

    return new Address6(`::ffff:${address4.correctForm()}/${mask6}`);
  }

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
  static fromArpa(arpaFormAddress: string): Address6 {
    // remove ending ".ip6.arpa." or just "."
    let address = arpaFormAddress.replace(/(\.ip6\.arpa)?\.$/, '');
    const semicolonAmount = 7;

    // correct ip6.arpa form with ending removed will be 63 characters
    if (address.length !== 63) {
      throw new AddressError("Invalid 'ip6.arpa' form.");
    }

    const parts = address.split('.').reverse();

    for (let i = semicolonAmount; i > 0; i--) {
      const insertIndex = i * 4;
      parts.splice(insertIndex, 0, ':');
    }

    address = parts.join('');

    return new Address6(address);
  }

  /**
   * Return the Microsoft UNC transcription of the address
   * @memberof Address6
   * @instance
   * @returns {String} the Microsoft UNC transcription of the address
   */
  microsoftTranscription(): string {
    return sprintf('%s.ipv6-literal.net', this.correctForm().replace(/:/g, '-'));
  }

  /**
   * Return the first n bits of the address, defaulting to the subnet mask
   * @memberof Address6
   * @instance
   * @param {number} [mask=subnet] - the number of bits to mask
   * @returns {String} the first n bits of the address as a string
   */
  mask(mask: number = this.subnetMask): string {
    return this.getBitsBase2(0, mask);
  }

  /**
   * Return the number of possible subnets of a given size in the address
   * @memberof Address6
   * @instance
   * @param {number} [size=128] - the subnet size
   * @returns {String}
   */
  // TODO: probably useful to have a numeric version of this too
  possibleSubnets(subnetSize: number = 128): string {
    const availableBits = constants6.BITS - this.subnetMask;
    const subnetBits = Math.abs(subnetSize - constants6.BITS);
    const subnetPowers = availableBits - subnetBits;

    if (subnetPowers < 0) {
      return '0';
    }

    return addCommas(new BigInteger('2', 10).pow(subnetPowers).toString(10));
  }

  /**
   * Helper function getting start address.
   * @memberof Address6
   * @instance
   * @returns {BigInteger}
   */
  _startAddress(): BigInteger {
    return new BigInteger(this.mask() + '0'.repeat(constants6.BITS - this.subnetMask), 2);
  }

  /**
   * The first address in the range given by this address' subnet
   * Often referred to as the Network Address.
   * @memberof Address6
   * @instance
   * @returns {Address6}
   */
  startAddress(): Address6 {
    return Address6.fromBigInteger(this._startAddress());
  }

  /**
   * The first host address in the range given by this address's subnet ie
   * the first address after the Network Address
   * @memberof Address6
   * @instance
   * @returns {Address6}
   */
  startAddressExclusive(): Address6 {
    const adjust = new BigInteger('1');
    return Address6.fromBigInteger(this._startAddress().add(adjust));
  }

  /**
   * Helper function getting end address.
   * @memberof Address6
   * @instance
   * @returns {BigInteger}
   */
  _endAddress(): BigInteger {
    return new BigInteger(this.mask() + '1'.repeat(constants6.BITS - this.subnetMask), 2);
  }

  /**
   * The last address in the range given by this address' subnet
   * Often referred to as the Broadcast
   * @memberof Address6
   * @instance
   * @returns {Address6}
   */
  endAddress(): Address6 {
    return Address6.fromBigInteger(this._endAddress());
  }

  /**
   * The last host address in the range given by this address's subnet ie
   * the last address prior to the Broadcast Address
   * @memberof Address6
   * @instance
   * @returns {Address6}
   */
  endAddressExclusive(): Address6 {
    const adjust = new BigInteger('1');
    return Address6.fromBigInteger(this._endAddress().subtract(adjust));
  }

  /**
   * Return the scope of the address
   * @memberof Address6
   * @instance
   * @returns {String}
   */
  getScope(): string {
    let scope = constants6.SCOPES[this.getBits(12, 16).intValue()];

    if (this.getType() === 'Global unicast' && scope !== 'Link local') {
      scope = 'Global';
    }

    return scope || 'Unknown';
  }

  /**
   * Return the type of the address
   * @memberof Address6
   * @instance
   * @returns {String}
   */
  getType(): string {
    for (const subnet of Object.keys(constants6.TYPES)) {
      if (this.isInSubnet(new Address6(subnet))) {
        return constants6.TYPES[subnet] as string;
      }
    }

    return 'Global unicast';
  }

  /**
   * Return the bits in the given range as a BigInteger
   * @memberof Address6
   * @instance
   * @returns {BigInteger}
   */
  getBits(start: number, end: number): BigInteger {
    return new BigInteger(this.getBitsBase2(start, end), 2);
  }

  /**
   * Return the bits in the given range as a base-2 string
   * @memberof Address6
   * @instance
   * @returns {String}
   */
  getBitsBase2(start: number, end: number): string {
    return this.binaryZeroPad().slice(start, end);
  }

  /**
   * Return the bits in the given range as a base-16 string
   * @memberof Address6
   * @instance
   * @returns {String}
   */
  getBitsBase16(start: number, end: number): string {
    const length = end - start;

    if (length % 4 !== 0) {
      throw new Error('Length of bits to retrieve must be divisible by four');
    }

    return this.getBits(start, end)
      .toString(16)
      .padStart(length / 4, '0');
  }

  /**
   * Return the bits that are set past the subnet mask length
   * @memberof Address6
   * @instance
   * @returns {String}
   */
  getBitsPastSubnet(): string {
    return this.getBitsBase2(this.subnetMask, constants6.BITS);
  }

  /**
   * Return the reversed ip6.arpa form of the address
   * @memberof Address6
   * @param {Object} options
   * @param {boolean} options.omitSuffix - omit the "ip6.arpa" suffix
   * @instance
   * @returns {String}
   */
  reverseForm(options?: common.ReverseFormOptions): string {
    if (!options) {
      options = {};
    }

    const characters = Math.floor(this.subnetMask / 4);

    const reversed = this.canonicalForm()
      .replace(/:/g, '')
      .split('')
      .slice(0, characters)
      .reverse()
      .join('.');

    if (characters > 0) {
      if (options.omitSuffix) {
        return reversed;
      }

      return sprintf('%s.ip6.arpa.', reversed);
    }

    if (options.omitSuffix) {
      return '';
    }

    return 'ip6.arpa.';
  }

  /**
   * Return the correct form of the address
   * @memberof Address6
   * @instance
   * @returns {String}
   */
  correctForm(): string {
    let i;
    let groups = [];

    let zeroCounter = 0;
    const zeroes = [];

    for (i = 0; i < this.parsedAddress.length; i++) {
      const value = parseInt(this.parsedAddress[i], 16);

      if (value === 0) {
        zeroCounter++;
      }

      if (value !== 0 && zeroCounter > 0) {
        if (zeroCounter > 1) {
          zeroes.push([i - zeroCounter, i - 1]);
        }

        zeroCounter = 0;
      }
    }

    // Do we end with a string of zeroes?
    if (zeroCounter > 1) {
      zeroes.push([this.parsedAddress.length - zeroCounter, this.parsedAddress.length - 1]);
    }

    const zeroLengths = zeroes.map((n) => n[1] - n[0] + 1);

    if (zeroes.length > 0) {
      const index = zeroLengths.indexOf(Math.max(...zeroLengths) as number);

      groups = compact(this.parsedAddress, zeroes[index]);
    } else {
      groups = this.parsedAddress;
    }

    for (i = 0; i < groups.length; i++) {
      if (groups[i] !== 'compact') {
        groups[i] = parseInt(groups[i], 16).toString(16);
      }
    }

    let correct = groups.join(':');

    correct = correct.replace(/^compact$/, '::');
    correct = correct.replace(/^compact|compact$/, ':');
    correct = correct.replace(/compact/, '');

    return correct;
  }

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
  binaryZeroPad(): string {
    return this.bigInteger().toString(2).padStart(constants6.BITS, '0');
  }

  // TODO: Improve the semantics of this helper function
  parse4in6(address: string): string {
    const groups = address.split(':');
    const lastGroup = groups.slice(-1)[0];

    const address4 = lastGroup.match(constants4.RE_ADDRESS);

    if (address4) {
      this.parsedAddress4 = address4[0];
      this.address4 = new Address4(this.parsedAddress4);

      for (let i = 0; i < this.address4.groups; i++) {
        if (/^0[0-9]+/.test(this.address4.parsedAddress[i])) {
          throw new AddressError(
            "IPv4 addresses can't have leading zeroes.",
            address.replace(
              constants4.RE_ADDRESS,
              this.address4.parsedAddress.map(spanLeadingZeroes4).join('.')
            )
          );
        }
      }

      this.v4 = true;

      groups[groups.length - 1] = this.address4.toGroup6();

      address = groups.join(':');
    }

    return address;
  }

  // TODO: Make private?
  parse(address: string): string[] {
    address = this.parse4in6(address);

    const badCharacters = address.match(constants6.RE_BAD_CHARACTERS);

    if (badCharacters) {
      throw new AddressError(
        sprintf(
          'Bad character%s detected in address: %s',
          badCharacters.length > 1 ? 's' : '',
          badCharacters.join('')
        ),
        address.replace(constants6.RE_BAD_CHARACTERS, '<span class="parse-error">$1</span>')
      );
    }

    const badAddress = address.match(constants6.RE_BAD_ADDRESS);

    if (badAddress) {
      throw new AddressError(
        sprintf('Address failed regex: %s', badAddress.join('')),
        address.replace(constants6.RE_BAD_ADDRESS, '<span class="parse-error">$1</span>')
      );
    }

    let groups: string[] = [];

    const halves = address.split('::');

    if (halves.length === 2) {
      let first = halves[0].split(':');
      let last = halves[1].split(':');

      if (first.length === 1 && first[0] === '') {
        first = [];
      }

      if (last.length === 1 && last[0] === '') {
        last = [];
      }

      const remaining = this.groups - (first.length + last.length);

      if (!remaining) {
        throw new AddressError('Error parsing groups');
      }

      this.elidedGroups = remaining;

      this.elisionBegin = first.length;
      this.elisionEnd = first.length + this.elidedGroups;

      groups = groups.concat(first);

      for (let i = 0; i < remaining; i++) {
        groups.push('0');
      }

      groups = groups.concat(last);
    } else if (halves.length === 1) {
      groups = address.split(':');

      this.elidedGroups = 0;
    } else {
      throw new AddressError('Too many :: groups found');
    }

    groups = groups.map((group: string) => sprintf('%x', parseInt(group, 16)));

    if (groups.length !== this.groups) {
      throw new AddressError('Incorrect number of groups found');
    }

    return groups;
  }

  /**
   * Return the canonical form of the address
   * @memberof Address6
   * @instance
   * @returns {String}
   */
  canonicalForm(): string {
    return this.parsedAddress.map(paddedHex).join(':');
  }

  /**
   * Return the decimal form of the address
   * @memberof Address6
   * @instance
   * @returns {String}
   */
  decimal(): string {
    return this.parsedAddress.map((n) => sprintf('%05d', parseInt(n, 16))).join(':');
  }

  /**
   * Return the address as a BigInteger
   * @memberof Address6
   * @instance
   * @returns {BigInteger}
   */
  bigInteger(): BigInteger {
    return new BigInteger(this.parsedAddress.map(paddedHex).join(''), 16);
  }

  /**
   * Return the last two groups of this address as an IPv4 address string
   * @memberof Address6
   * @instance
   * @returns {Address4}
   * @example
   * var address = new Address6('2001:4860:4001::1825:bf11');
   * address.to4().correctForm(); // '24.37.191.17'
   */
  to4(): Address4 {
    const binary = this.binaryZeroPad().split('');

    return Address4.fromHex(new BigInteger(binary.slice(96, 128).join(''), 2).toString(16));
  }

  /**
   * Return the v4-in-v6 form of the address
   * @memberof Address6
   * @instance
   * @returns {String}
   */
  to4in6(): string {
    const address4 = this.to4();
    const address6 = new Address6(this.parsedAddress.slice(0, 6).join(':'), 6);

    const correct = address6.correctForm();

    let infix = '';

    if (!/:$/.test(correct)) {
      infix = ':';
    }

    return correct + infix + address4.address;
  }

  /**
   * Return an object containing the Teredo properties of the address
   * @memberof Address6
   * @instance
   * @returns {Object}
   */
  inspectTeredo(): TeredoProperties {
    /*
    - Bits 0 to 31 are set to the Teredo prefix (normally 2001:0000::/32).
    - Bits 32 to 63 embed the primary IPv4 address of the Teredo server that
      is used.
    - Bits 64 to 79 can be used to define some flags. Currently only the
      higher order bit is used; it is set to 1 if the Teredo client is
      located behind a cone NAT, 0 otherwise. For Microsoft's Windows Vista
      and Windows Server 2008 implementations, more bits are used. In those
      implementations, the format for these 16 bits is "CRAAAAUG AAAAAAAA",
      where "C" remains the "Cone" flag. The "R" bit is reserved for future
      use. The "U" bit is for the Universal/Local flag (set to 0). The "G" bit
      is Individual/Group flag (set to 0). The A bits are set to a 12-bit
      randomly generated number chosen by the Teredo client to introduce
      additional protection for the Teredo node against IPv6-based scanning
      attacks.
    - Bits 80 to 95 contains the obfuscated UDP port number. This is the
      port number that is mapped by the NAT to the Teredo client with all
      bits inverted.
    - Bits 96 to 127 contains the obfuscated IPv4 address. This is the
      public IPv4 address of the NAT with all bits inverted.
    */
    const prefix = this.getBitsBase16(0, 32);

    const udpPort = this.getBits(80, 96).xor(new BigInteger('ffff', 16)).toString();

    const server4 = Address4.fromHex(this.getBitsBase16(32, 64));
    const client4 = Address4.fromHex(
      this.getBits(96, 128).xor(new BigInteger('ffffffff', 16)).toString(16)
    );

    const flags = this.getBits(64, 80);
    const flagsBase2 = this.getBitsBase2(64, 80);

    const coneNat = flags.testBit(15);
    const reserved = flags.testBit(14);
    const groupIndividual = flags.testBit(8);
    const universalLocal = flags.testBit(9);
    const nonce = new BigInteger(flagsBase2.slice(2, 6) + flagsBase2.slice(8, 16), 2).toString(10);

    return {
      prefix: sprintf('%s:%s', prefix.slice(0, 4), prefix.slice(4, 8)),
      server4: server4.address,
      client4: client4.address,
      flags: flagsBase2,
      coneNat,
      microsoft: {
        reserved,
        universalLocal,
        groupIndividual,
        nonce,
      },
      udpPort,
    };
  }

  /**
   * Return an object containing the 6to4 properties of the address
   * @memberof Address6
   * @instance
   * @returns {Object}
   */
  inspect6to4(): SixToFourProperties {
    /*
    - Bits 0 to 15 are set to the 6to4 prefix (2002::/16).
    - Bits 16 to 48 embed the IPv4 address of the 6to4 gateway that is used.
    */

    const prefix = this.getBitsBase16(0, 16);

    const gateway = Address4.fromHex(this.getBitsBase16(16, 48));

    return {
      prefix: sprintf('%s', prefix.slice(0, 4)),
      gateway: gateway.address,
    };
  }

  /**
   * Return a v6 6to4 address from a v6 v4inv6 address
   * @memberof Address6
   * @instance
   * @returns {Address6}
   */
  to6to4(): Address6 | null {
    if (!this.is4()) {
      return null;
    }

    const addr6to4 = [
      '2002',
      this.getBitsBase16(96, 112),
      this.getBitsBase16(112, 128),
      '',
      '/16',
    ].join(':');

    return new Address6(addr6to4);
  }

  /**
   * Return a byte array
   * @memberof Address6
   * @instance
   * @returns {Array}
   */
  toByteArray(): number[] {
    const byteArray = this.bigInteger().toByteArray();

    // work around issue where `toByteArray` returns a leading 0 element
    if (byteArray.length === 17 && byteArray[0] === 0) {
      return byteArray.slice(1);
    }

    return byteArray;
  }

  /**
   * Return an unsigned byte array
   * @memberof Address6
   * @instance
   * @returns {Array}
   */
  toUnsignedByteArray(): number[] {
    return this.toByteArray().map(unsignByte);
  }

  /**
   * Convert a byte array to an Address6 object
   * @memberof Address6
   * @static
   * @returns {Address6}
   */
  static fromByteArray(bytes: Array<any>): Address6 {
    return this.fromUnsignedByteArray(bytes.map(unsignByte));
  }

  /**
   * Convert an unsigned byte array to an Address6 object
   * @memberof Address6
   * @static
   * @returns {Address6}
   */
  static fromUnsignedByteArray(bytes: Array<any>): Address6 {
    const BYTE_MAX = new BigInteger('256', 10);
    let result = new BigInteger('0', 10);
    let multiplier = new BigInteger('1', 10);

    for (let i = bytes.length - 1; i >= 0; i--) {
      result = result.add(multiplier.multiply(new BigInteger(bytes[i].toString(10), 10)));

      multiplier = multiplier.multiply(BYTE_MAX);
    }

    return Address6.fromBigInteger(result);
  }

  // #region Attributes
  /**
   * Returns true if the given address is in the subnet of the current address
   * @memberof Address6
   * @instance
   * @returns {boolean}
   */
  isInSubnet = common.isInSubnet;

  /**
   * Returns true if the address is correct, false otherwise
   * @memberof Address6
   * @instance
   * @returns {boolean}
   */
  isCorrect = common.isCorrect(constants6.BITS);

  /**
   * Returns true if the address is in the canonical form, false otherwise
   * @memberof Address6
   * @instance
   * @returns {boolean}
   */
  isCanonical(): boolean {
    return this.addressMinusSuffix === this.canonicalForm();
  }

  /**
   * Returns true if the address is a link local address, false otherwise
   * @memberof Address6
   * @instance
   * @returns {boolean}
   */
  isLinkLocal(): boolean {
    // Zeroes are required, i.e. we can't check isInSubnet with 'fe80::/10'
    if (
      this.getBitsBase2(0, 64) ===
      '1111111010000000000000000000000000000000000000000000000000000000'
    ) {
      return true;
    }

    return false;
  }

  /**
   * Returns true if the address is a multicast address, false otherwise
   * @memberof Address6
   * @instance
   * @returns {boolean}
   */
  isMulticast(): boolean {
    return this.getType() === 'Multicast';
  }

  /**
   * Returns true if the address is a v4-in-v6 address, false otherwise
   * @memberof Address6
   * @instance
   * @returns {boolean}
   */
  is4(): boolean {
    return this.v4;
  }

  /**
   * Returns true if the address is a Teredo address, false otherwise
   * @memberof Address6
   * @instance
   * @returns {boolean}
   */
  isTeredo(): boolean {
    return this.isInSubnet(new Address6('2001::/32'));
  }

  /**
   * Returns true if the address is a 6to4 address, false otherwise
   * @memberof Address6
   * @instance
   * @returns {boolean}
   */
  is6to4(): boolean {
    return this.isInSubnet(new Address6('2002::/16'));
  }

  /**
   * Returns true if the address is a loopback address, false otherwise
   * @memberof Address6
   * @instance
   * @returns {boolean}
   */
  isLoopback(): boolean {
    return this.getType() === 'Loopback';
  }
  // #endregion

  // #region HTML
  /**
   * @returns {String} the address in link form with a default port of 80
   */
  href(optionalPort?: number | string): string {
    if (optionalPort === undefined) {
      optionalPort = '';
    } else {
      optionalPort = sprintf(':%s', optionalPort);
    }

    return sprintf('http://[%s]%s/', this.correctForm(), optionalPort);
  }

  /**
   * @returns {String} a link suitable for conveying the address via a URL hash
   */
  link(options?: { className?: string; prefix?: string; v4?: boolean }): string {
    if (!options) {
      options = {};
    }

    if (options.className === undefined) {
      options.className = '';
    }

    if (options.prefix === undefined) {
      options.prefix = '/#address=';
    }

    if (options.v4 === undefined) {
      options.v4 = false;
    }

    let formFunction = this.correctForm;

    if (options.v4) {
      formFunction = this.to4in6;
    }

    if (options.className) {
      return sprintf(
        '<a href="%1$s%2$s" class="%3$s">%2$s</a>',
        options.prefix,
        formFunction.call(this),
        options.className
      );
    }

    return sprintf('<a href="%1$s%2$s">%2$s</a>', options.prefix, formFunction.call(this));
  }

  /**
   * Groups an address
   * @returns {String}
   */
  group(): string {
    if (this.elidedGroups === 0) {
      // The simple case
      return helpers.simpleGroup(this.address).join(':');
    }

    assert(typeof this.elidedGroups === 'number');
    assert(typeof this.elisionBegin === 'number');

    // The elided case
    const output = [];

    const [left, right] = this.address.split('::');

    if (left.length) {
      output.push(...helpers.simpleGroup(left));
    } else {
      output.push('');
    }

    const classes = ['hover-group'];

    for (let i = this.elisionBegin; i < this.elisionBegin + this.elidedGroups; i++) {
      classes.push(sprintf('group-%d', i));
    }

    output.push(sprintf('<span class="%s"></span>', classes.join(' ')));

    if (right.length) {
      output.push(...helpers.simpleGroup(right, this.elisionEnd));
    } else {
      output.push('');
    }

    if (this.is4()) {
      assert(this.address4 instanceof Address4);

      output.pop();
      output.push(this.address4.groupForV6());
    }

    return output.join(':');
  }
  // #endregion

  // #region Regular expressions
  /**
   * Generate a regular expression string that can be used to find or validate
   * all variations of this address
   * @memberof Address6
   * @instance
   * @param {boolean} substringSearch
   * @returns {string}
   */
  regularExpressionString(this: Address6, substringSearch: boolean = false): string {
    let output: string[] = [];

    // TODO: revisit why this is necessary
    const address6 = new Address6(this.correctForm());

    if (address6.elidedGroups === 0) {
      // The simple case
      output.push(simpleRegularExpression(address6.parsedAddress));
    } else if (address6.elidedGroups === constants6.GROUPS) {
      // A completely elided address
      output.push(possibleElisions(constants6.GROUPS));
    } else {
      // A partially elided address
      const halves = address6.address.split('::');

      if (halves[0].length) {
        output.push(simpleRegularExpression(halves[0].split(':')));
      }

      assert(typeof address6.elidedGroups === 'number');

      output.push(
        possibleElisions(address6.elidedGroups, halves[0].length !== 0, halves[1].length !== 0)
      );

      if (halves[1].length) {
        output.push(simpleRegularExpression(halves[1].split(':')));
      }

      output = [output.join(':')];
    }

    if (!substringSearch) {
      output = [
        '(?=^|',
        ADDRESS_BOUNDARY,
        '|[^\\w\\:])(',
        ...output,
        ')(?=[^\\w\\:]|',
        ADDRESS_BOUNDARY,
        '|$)',
      ];
    }

    return output.join('');
  }

  /**
   * Generate a regular expression that can be used to find or validate all
   * variations of this address.
   * @memberof Address6
   * @instance
   * @param {boolean} substringSearch
   * @returns {RegExp}
   */
  regularExpression(this: Address6, substringSearch: boolean = false): RegExp {
    return new RegExp(this.regularExpressionString(substringSearch), 'i');
  }
  // #endregion
}
