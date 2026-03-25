/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import { MathUtil } from './MathUtil';

/**
 * @private
 */
export class StringUtil {

    /**
     *
     * @param {string} text
     * @param {string} pattern
     * @return {boolean}
     */
    static startsWith(text, pattern){
        return text.indexOf(pattern) === 0;
    }

    /**
     *
     * @param {string} text
     * @returns {number}
     */
    static hashCode(text) {
        const len = text.length;
        if (len === 0) {
            return 0;
        }

        let hash = 0;
        for (let i = 0; i < len; i++) {
            const chr = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return MathUtil.smi(hash);
    }
}

