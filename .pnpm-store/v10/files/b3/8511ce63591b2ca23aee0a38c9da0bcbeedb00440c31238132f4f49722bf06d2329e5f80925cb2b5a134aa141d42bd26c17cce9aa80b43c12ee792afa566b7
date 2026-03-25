/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */


import { ZoneId } from './ZoneId';
import { ZoneRulesProvider } from './zone/ZoneRulesProvider';

/**
 * A geographical region where the same time-zone rules apply.
 *
 * Time-zone information is categorized as a set of rules defining when and
 * how the offset from UTC/Greenwich changes. These rules are accessed using
 * identifiers based on geographical regions, such as countries or states.
 * The most common region classification is the Time Zone Database (TZDB),
 * which defines regions such as 'Europe/Paris' and 'Asia/Tokyo'.
 *
 * The region identifier, modeled by this class, is distinct from the
 * underlying rules, modeled by {@link ZoneRules}.
 * The rules are defined by governments and change frequently.
 * By contrast, the region identifier is well-defined and long-lived.
 * This separation also allows rules to be shared between regions if appropriate.
 *
 * ### Specification for implementors
 *
 * This class is immutable and thread-safe.
 */
export class ZoneRegion extends ZoneId {
    /**
     * @param {string} zoneId
     * @return {ZoneId}
     */
    static ofId(zoneId){
        const rules = ZoneRulesProvider.getRules(zoneId);
        return new ZoneRegion(zoneId, rules);
    }

    //-------------------------------------------------------------------------
    /**
     * Constructor.
     *
     * @param {string} id  the time-zone ID, not null
     * @param {ZoneRules} rules  the rules, null for lazy lookup
     * @private
     */
    constructor(id, rules) {
        super();
        this._id = id;
        this._rules = rules;
    }

    //-----------------------------------------------------------------------
    /**
     *
     * @returns {string}
     */
    id() {
        return this._id;
    }

    /**
     *
     * @returns {ZoneRules}
     */
    rules() {
        return this._rules;
    }

}
