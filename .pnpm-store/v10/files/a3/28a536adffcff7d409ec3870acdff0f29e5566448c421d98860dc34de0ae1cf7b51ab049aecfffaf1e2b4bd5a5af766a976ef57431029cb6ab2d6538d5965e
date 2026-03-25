export interface RDNAttributes {
    [name: string]: string;
}
/**
 * RDN is a part of DN, and it consists of key & value pair. This class also supports
 * compound RDNs, meaning that one RDN can hold multiple key & value pairs.
 */
export declare class RDN {
    private attrs;
    constructor(attrs?: RDNAttributes);
    /**
     * Set an RDN pair.
     * @param {string} name
     * @param {string} value
     * @returns {object} RDN class
     */
    set(name: string, value: string): RDN;
    /**
     * Get an RDN value at the specified name.
     * @param {string} name
     * @returns {string | undefined} value
     */
    get(name: string): string | undefined;
    /**
     * Checks, if this instance of RDN is equal to the other RDN.
     * @param {object} other
     */
    equals(other: RDN): boolean;
    /**
     * Parse the RDN, escape values & return a string representation.
     * @returns {string} Escaped string representation of RDN.
     */
    toString(): string;
    /**
     * Escape values & return a string representation.
     *
     * RFC defines, that these characters should be escaped:
     *
     * Comma                          ,
     * Backslash character            \
     * Pound sign (hash sign)         #
     * Plus sign                      +
     * Less than symbol               <
     * Greater than symbol            >
     * Semicolon                      ;
     * Double quote (quotation mark)  "
     * Equal sign                     =
     * Leading or trailing spaces
     *
     * @param {string} value - RDN value to be escaped
     * @returns {string} Escaped string representation of RDN
     */
    private _escape;
}
