'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = reject;

var _filter = require('./filter.js');

var _filter2 = _interopRequireDefault(_filter);

var _wrapAsync = require('./wrapAsync.js');

var _wrapAsync2 = _interopRequireDefault(_wrapAsync);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function reject(eachfn, arr, _iteratee, callback) {
    const iteratee = (0, _wrapAsync2.default)(_iteratee);
    return (0, _filter2.default)(eachfn, arr, (value, cb) => {
        iteratee(value, (err, v) => {
            cb(err, !v);
        });
    }, callback);
}
module.exports = exports.default;