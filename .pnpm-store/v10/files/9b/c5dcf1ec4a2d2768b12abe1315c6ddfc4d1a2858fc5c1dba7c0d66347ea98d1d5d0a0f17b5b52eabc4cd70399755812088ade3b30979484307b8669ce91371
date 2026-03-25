const {InnerState} = require('../inner-state');
const {addInspection} = require('../utils');
const utils = require('../utils');

/**
 * @private
 * @class ServerFormatting
 */
class ServerFormatting extends InnerState {

    constructor(options) {
        const _inner = {
            options,
            changed: true,
            currentError: undefined,
            target: {}
        };
        super(_inner);
        setValues.call(this, options.values);
    }

    get error() {
        return this._inner.currentError;
    }

    get text() {
        return this._inner.options.text;
    }

    set text(value) {
        const _i = this._inner;
        if (value !== _i.options.text) {
            _i.options.text = value;
            _i.changed = true;
        }
    }

    get binary() {
        return this._inner.options.binary;
    }

    set binary(value) {
        const _i = this._inner;
        if (value !== _i.options.binary) {
            _i.options.binary = value;
            _i.changed = true;
        }
    }

    get rowMode() {
        return this._inner.options.rowMode;
    }

    set rowMode(value) {
        const _i = this._inner;
        if (value !== _i.options.rowMode) {
            _i.options.rowMode = value;
            _i.changed = true;
        }
    }

    get values() {
        return this._inner.target.values;
    }

    set values(values) {
        setValues.call(this, values);
    }

}

/**
 * @member ServerFormatting#parse
 */

function setValues(v) {
    const target = this._inner.target;
    if (Array.isArray(v)) {
        if (v.length) {
            target.values = v;
        } else {
            delete target.values;
        }
    } else {
        if (utils.isNull(v)) {
            delete target.values;
        } else {
            target.values = [v];
        }
    }
}

addInspection(ServerFormatting, function () {
    return this.toString();
});

module.exports = {ServerFormatting};
