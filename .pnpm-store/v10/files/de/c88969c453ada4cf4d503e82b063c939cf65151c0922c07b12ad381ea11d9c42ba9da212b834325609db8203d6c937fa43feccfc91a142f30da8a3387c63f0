"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DN = void 0;
const RDN_1 = require("./RDN");
/**
 * DN class provides chain building of multiple RDNs, which can be later build into
 * escaped string representation.
 */
class DN {
    constructor(rdns) {
        this.rdns = [];
        if (rdns) {
            if (Array.isArray(rdns)) {
                this.rdns = rdns;
            }
            else {
                this.addRDNs(rdns);
            }
        }
    }
    /**
     * Add an RDN component to the DN, consisting of key & value pair.
     * @param {string} key
     * @param {string} value
     * @returns {object} DN
     */
    addPairRDN(key, value) {
        this.rdns.push(new RDN_1.RDN({ [key]: value }));
        return this;
    }
    /**
     * Add a single RDN component to the DN.
     *
     * Note, that this RDN can be compound (single RDN can have multiple key & value pairs).
     * @param {object} rdn
     * @returns {object} DN
     */
    addRDN(rdn) {
        if (rdn instanceof RDN_1.RDN) {
            this.rdns.push(rdn);
        }
        else {
            this.rdns.push(new RDN_1.RDN(rdn));
        }
        return this;
    }
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
    addRDNs(rdns) {
        if (rdns instanceof DN) {
            this.rdns.push(...rdns.rdns);
        }
        else if (Array.isArray(rdns)) {
            for (const rdn of rdns) {
                this.addRDN(rdn);
            }
        }
        else {
            for (const [name, value] of Object.entries(rdns)) {
                if (Array.isArray(value)) {
                    for (const rdnValue of value) {
                        this.rdns.push(new RDN_1.RDN({
                            [name]: rdnValue,
                        }));
                    }
                }
                else {
                    this.rdns.push(new RDN_1.RDN({
                        [name]: value,
                    }));
                }
            }
        }
        return this;
    }
    getRDNs() {
        return this.rdns;
    }
    get(index) {
        return this.rdns[index];
    }
    set(rdn, index) {
        if (rdn instanceof RDN_1.RDN) {
            this.rdns[index] = rdn;
        }
        else {
            this.rdns[index] = new RDN_1.RDN(rdn);
        }
        return this;
    }
    isEmpty() {
        return !this.rdns.length;
    }
    /**
     * Checks, if this instance of DN is equal to the other DN.
     * @param {object} other
     */
    equals(other) {
        if (this.rdns.length !== other.rdns.length) {
            return false;
        }
        for (let i = 0; i < this.rdns.length; i += 1) {
            const rdn = this.rdns[i];
            const otherRdn = other.rdns[i];
            if (rdn == null && otherRdn == null) {
                continue;
            }
            if (rdn == null || otherRdn == null || !rdn.equals(otherRdn)) {
                return false;
            }
        }
        return true;
    }
    /**
     * @deprecated
     */
    parent() {
        if (this.rdns.length !== 0) {
            const save = this.rdns.shift();
            const dn = new DN(this.rdns);
            this.rdns.unshift(save);
            return dn;
        }
        return null;
    }
    /**
     * @deprecated
     * @param {object} dn
     */
    parentOf(dn) {
        if (this.rdns.length >= dn.rdns.length) {
            return false;
        }
        const diff = dn.rdns.length - this.rdns.length;
        for (let i = this.rdns.length - 1; i >= 0; i -= 1) {
            const myRDN = this.rdns[i];
            const theirRDN = dn.rdns[i + diff];
            if (myRDN == null && theirRDN == null) {
                continue;
            }
            if (myRDN == null || theirRDN == null || !myRDN.equals(theirRDN)) {
                return false;
            }
        }
        return true;
    }
    clone() {
        return new DN(this.rdns);
    }
    reverse() {
        this.rdns.reverse();
        return this;
    }
    pop() {
        return this.rdns.pop();
    }
    shift() {
        return this.rdns.shift();
    }
    /**
     * Parse the DN, escape values & return a string representation.
     */
    toString() {
        let str = '';
        for (const rdn of this.rdns) {
            if (str.length) {
                str += ',';
            }
            str += `${rdn.toString()}`;
        }
        return str;
    }
}
exports.DN = DN;
//# sourceMappingURL=DN.js.map