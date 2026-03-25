/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

/**
 * @private
 */
export class EnumMap {
    constructor(){
        this._map = {};
    }

    putAll(otherMap){
        for(const key in otherMap._map){
            this._map[key] = otherMap._map[key];
        }
        return this;
    }

    containsKey(key){
        // eslint-disable-next-line no-prototype-builtins
        return (this._map.hasOwnProperty(key.name())) && (this.get(key) !== undefined);
    }

    get(key) {
        return this._map[key.name()];
    }

    put(key, val) {
        return this.set(key, val);
    }

    set(key, val) {
        this._map[key.name()] = val;
        return this;
    }

    retainAll(keyList){
        const map = {};
        for(let i=0; i<keyList.length; i++){
            const key = keyList[i].name();
            map[key] = this._map[key];
        }
        this._map = map;
        return this;
    }

    /**
     * due to the bad performance of delete we just set the key entry to undefined.
     *
     * this might lead to issues with "null" entries. Calling clear in the end might solve the issue
     * @param key
     * @returns {*}
     */
    remove(key){
        const keyName = key.name();
        const val = this._map[keyName];
        this._map[keyName] = undefined;
        return val;
    }

    keySet(){
        return this._map;
    }

    clear(){
        this._map = {};
    }
}
