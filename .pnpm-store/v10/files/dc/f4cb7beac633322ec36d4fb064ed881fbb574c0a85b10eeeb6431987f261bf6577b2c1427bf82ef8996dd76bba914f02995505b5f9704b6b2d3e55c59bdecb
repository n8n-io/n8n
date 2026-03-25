const {addReadProp} = require('./utils');

/**
 * @private
 * @class InnerState
 * @description
 * Implements support for private/inner state object inside the class,
 * which can be accessed by a derived class via hidden read-only property _inner.
 */
class InnerState {

    constructor(initialState) {
        addReadProp(this, '_inner', {}, true);
        if (initialState && typeof initialState === 'object') {
            this.extendState(initialState);
        }
    }

    /**
     * Extends or overrides inner state with the specified properties.
     *
     * Only own properties are used, i.e. inherited ones are skipped.
     */
    extendState(state) {
        for (const a in state) {
            // istanbul ignore else
            if (Object.prototype.hasOwnProperty.call(state, a)) {
                this._inner[a] = state[a];
            }
        }
    }
}

/**
 * @member InnerState#_inner
 * Private/Inner object state.
 */

module.exports = {InnerState};
