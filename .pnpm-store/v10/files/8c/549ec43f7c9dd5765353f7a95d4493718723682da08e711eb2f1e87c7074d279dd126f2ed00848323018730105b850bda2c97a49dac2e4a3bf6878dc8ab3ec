/*
 * Copyright (c) 2015-present, Vitaly Tomilov
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

const specialQueryType = {
    result: 0,
    multiResult: 1,
    stream: 2
};

class SpecialQuery {
    constructor(type) {
        this.isResult = type === specialQueryType.result; // type used implicitly
        this.isStream = type === specialQueryType.stream;
        this.isMultiResult = type === specialQueryType.multiResult;
    }
}

const cache = {
    resultQuery: new SpecialQuery(specialQueryType.result),
    multiResultQuery: new SpecialQuery(specialQueryType.multiResult),
    streamQuery: new SpecialQuery(specialQueryType.stream)
};

module.exports = Object.assign({SpecialQuery}, cache);
