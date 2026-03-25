"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sorting = void 0;
class Sorting {
    constructor() {
        this.sorts = [];
    }
    /** Sort by the objects' property. */
    byProperty(property, ascending = true) {
        this.sorts.push({ property, ascending });
        return this;
    }
    /** Sort by the objects' ID. */
    byId(ascending = true) {
        this.sorts.push({ property: '_id', ascending });
        return this;
    }
    /** Sort by the objects' creation time. */
    byCreationTime(ascending = true) {
        this.sorts.push({ property: '_creationTimeUnix', ascending });
        return this;
    }
    /** Sort by the objects' last update time. */
    byUpdateTime(ascending = true) {
        this.sorts.push({ property: '_lastUpdateTimeUnix', ascending });
        return this;
    }
}
exports.Sorting = Sorting;
