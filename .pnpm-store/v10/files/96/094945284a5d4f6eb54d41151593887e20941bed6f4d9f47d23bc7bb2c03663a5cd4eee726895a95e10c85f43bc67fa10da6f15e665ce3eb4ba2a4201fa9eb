'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _asyncMap;

var _wrapAsync = require('./wrapAsync.js');

var _wrapAsync2 = _interopRequireDefault(_wrapAsync);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncMap(eachfn, arr, iteratee, callback) {
    arr = arr || [];
    var results = [];
    var counter = 0;
    var _iteratee = (0, _wrapAsync2.default)(iteratee);

    return eachfn(arr, (value, _, iterCb) => {
        var index = counter++;
        _iteratee(value, (err, v) => {
            results[index] = v;
            iterCb(err);
        });
    }, err => {
        callback(err, results);
    });
}
module.exports = exports.default;