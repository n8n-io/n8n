import type { RDNAttributes } from './RDN';
import { RDN } from './RDN';
/**
 * RDNMap is an interface, that maps every key & value to a specified RDN.
 *
 * Value can be either a string or a list of strings, where every value in the list will
 * get applied to the same key of an RDN.
 */
export interface RDNMap {
    [name: string]: string[] | string;
}
/**
 * DN class provides chain building of multiple RDNs, which can be later build into
 * escaped string representation.
 */
export declare class DN {
    private rdns;
    constructor(rdns?: RDN[] | RDNMap);
    /**
     * Add an RDN component to the DN, consisting of key & value pair.
     * @param {string} key
     * @param {string} value
     * @returns {object} DN
     */
    addPairRDN(key: string, value: string): DN;
    /**
     * Add a single RDN component to the DN.
     *
     * Note, that this RDN can be compound (single RDN can have multiple key & value pairs).
     * @param {object} rdn
     * @returns {object} DN
     */
    addRDN(rdn: RDN | RDNAttributes): DN;
    /**
     * Add multiple RDN components to the DN.
     *
     * This method allows different interfaces to add RDNs into the DN.
     * It can:
     * - join other DN into this DN
     * - join list of RDNs or RDNAttributes into this DN
     * - create RDNs from object map, where every key & value will create a new RDN
     * @param {object|object[]} rdns
     * @returns {object} DN
     */
    addRDNs(rdns: DN | RDN[] | RDNAttributes[] | RDNMap): DN;
    getRDNs(): RDN[];
    get(index: number): RDN | undefined;
    set(rdn: RDN | RDNAttributes, index: number): DN;
    isEmpty(): boolean;
    /**
     * Checks, if this instance of DN is equal to the other DN.
     * @param {object} other
     */
    equals(other: DN): boolean;
    /**
     * @deprecated
     */
    parent(): DN | null;
    /**
     * @deprecated
     * @param {object} dn
     */
    parentOf(dn: DN): boolean;
    clone(): DN;
    reverse(): DN;
    pop(): RDN | undefined;
    shift(): RDN | undefined;
    /**
     * Parse the DN, escape values & return a string representation.
     */
    toString(): string;
}
