var $625ad1e1f4c43bc1$exports = require("./CalendarDate.main.js");
var $af14c9812fdceb33$exports = require("./GregorianCalendar.main.js");


function $parcel$export(e, n, v, s) {
  Object.defineProperty(e, n, {get: v, set: s, enumerable: true, configurable: true});
}

$parcel$export(module.exports, "BuddhistCalendar", () => $561c4ef058278b74$export$42d20a78301dee44);
/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */ // Portions of the code in this file are based on code from ICU.
// Original licensing can be found in the NOTICE file in the root directory of this source tree.


const $561c4ef058278b74$var$BUDDHIST_ERA_START = -543;
class $561c4ef058278b74$export$42d20a78301dee44 extends (0, $af14c9812fdceb33$exports.GregorianCalendar) {
    fromJulianDay(jd) {
        let gregorianDate = super.fromJulianDay(jd);
        let year = (0, $af14c9812fdceb33$exports.getExtendedYear)(gregorianDate.era, gregorianDate.year);
        return new (0, $625ad1e1f4c43bc1$exports.CalendarDate)(this, year - $561c4ef058278b74$var$BUDDHIST_ERA_START, gregorianDate.month, gregorianDate.day);
    }
    toJulianDay(date) {
        return super.toJulianDay($561c4ef058278b74$var$toGregorian(date));
    }
    getEras() {
        return [
            'BE'
        ];
    }
    getDaysInMonth(date) {
        return super.getDaysInMonth($561c4ef058278b74$var$toGregorian(date));
    }
    balanceDate() {}
    constructor(...args){
        super(...args), this.identifier = 'buddhist';
    }
}
function $561c4ef058278b74$var$toGregorian(date) {
    let [era, year] = (0, $af14c9812fdceb33$exports.fromExtendedYear)(date.year + $561c4ef058278b74$var$BUDDHIST_ERA_START);
    return new (0, $625ad1e1f4c43bc1$exports.CalendarDate)(era, year, date.month, date.day);
}


//# sourceMappingURL=BuddhistCalendar.main.js.map
