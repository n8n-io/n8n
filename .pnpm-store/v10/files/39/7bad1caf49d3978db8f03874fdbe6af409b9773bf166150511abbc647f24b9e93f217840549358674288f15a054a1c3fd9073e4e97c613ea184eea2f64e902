'use strict';

module.exports = function dataProperties(klass, properties) {
    properties.forEach(p => {
        Object.defineProperty(klass.prototype, p, {
            enumerable: true,
            get() {
                return this.data[p];
            }
        });
    });
};
