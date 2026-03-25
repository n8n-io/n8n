/*
 * @copyright (c) 2016, Philipp Thürwächter, Pattrick Hüper
 * @copyright (c) 2007-present, Stephen Colebourne & Michael Nascimento Santos
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { DateTimeException } from '../errors';

export class ZoneRulesProvider {
    /**
     * Gets the rules for the zone ID.
     *
     * This returns the latest available rules for the zone ID.
     *
     * This method relies on time-zone data provider files that are configured.
     *
     * @param {string} zoneId
     * @return {ZoneRules}
     */
    static getRules(zoneId){
        throw new DateTimeException(`unsupported ZoneId:${zoneId}`);
    }


    /**
     * Gets the set of available zone IDs.
     *
     * These zone IDs are loaded and available for use by {@link ZoneId}.
     *
     * @return {string[]} a modifiable copy of the set of zone IDs, not null
     */
    static getAvailableZoneIds(){
        return [];
    }
}

