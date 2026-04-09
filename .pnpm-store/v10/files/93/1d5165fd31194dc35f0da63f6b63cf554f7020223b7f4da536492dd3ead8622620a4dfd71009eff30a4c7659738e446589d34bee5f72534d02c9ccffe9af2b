'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (eachfn) {
    return function applyEach(fns, ...callArgs) {
        const go = (0, _awaitify2.default)(function (callback) {
            var that = this;
            return eachfn(fns, (fn, cb) => {
                (0, _wrapAsync2.default)(fn).apply(that, callArgs.concat(cb));
            }, callback);
        });
        return go;
    };
};

var _wrapAsync = require('./wrapAsync.js');

var _wrapAsync2 = _interopRequireDefault(_wrapAsync);

var _awaitify = require('./awaitify.js');

var _awaitify2 = _interopRequireDefault(_awaitify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = exports.default;