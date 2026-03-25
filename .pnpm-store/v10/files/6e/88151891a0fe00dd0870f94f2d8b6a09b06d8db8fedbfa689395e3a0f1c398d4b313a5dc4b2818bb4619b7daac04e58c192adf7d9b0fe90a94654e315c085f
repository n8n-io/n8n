/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { SystemDefaultZoneRules } from './SystemDefaultZoneRules';
import { ZoneId } from '../ZoneId';

export class SystemDefaultZoneId extends ZoneId {

    constructor(){
        super();
        this._rules = new SystemDefaultZoneRules();
    }

    rules(){
        return this._rules;
    }

    equals(other){
        if(this === other){
            return true;
        }
        return false;
    }

    id(){
        return 'SYSTEM';
    }

}
