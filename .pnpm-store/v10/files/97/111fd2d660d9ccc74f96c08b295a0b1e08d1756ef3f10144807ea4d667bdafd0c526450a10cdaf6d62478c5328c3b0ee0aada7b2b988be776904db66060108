/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

/**
 * @private
 */
export class StringBuilder {
    constructor(){
        this._str = '';
    }

    append(str){
        this._str += str;
        return this;
    }

    appendChar(str){
        this._str += str[0];
        return this;
    }

    insert(offset, str){
        this._str = this._str.slice(0, offset) + str + this._str.slice(offset);
        return this;
    }

    replace(start, end, str){
        this._str = this._str.slice(0, start) + str + this._str.slice(end);
        return this;
    }

    length(){
        return this._str.length;
    }

    setLength(length){
        this._str = this._str.slice(0, length);
        return this;
    }


    toString() {
        return this._str;
    }
}
