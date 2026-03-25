'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = _filter;

var _isArrayLike = require('./isArrayLike.js');

var _isArrayLike2 = _interopRequireDefault(_isArrayLike);

var _wrapAsync = require('./wrapAsync.js');

var _wrapAsync2 = _interopRequireDefault(_wrapAsync);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function filterArray(eachfn, arr, iteratee, callback) {
    var truthValues = new Array(arr.length);
    eachfn(arr, (x, index, iterCb) => {
        iteratee(x, (err, v) => {
            truthValues[index] = !!v;
            iterCb(err);
        });
    }, err => {
        if (err) return callback(err);
        var results = [];
        for (var i = 0; i < arr.length; i++) {
            if (truthValues[i]) results.push(arr[i]);
        }
        callback(null, results);
    });
}

function filterGeneric(eachfn, coll, iteratee, callback) {
    var results = [];
    eachfn(coll, (x, index, iterCb) => {
        iteratee(x, (err, v) => {
            if (err) return iterCb(err);
            if (v) {
                results.push({ index, value: x });
            }
            iterCb(err);
        });
    }, err => {
        if (err) return callback(err);
        callback(null, results.sort((a, b) => a.index - b.index).map(v => v.value));
    });
}

function _filter(eachfn, coll, iteratee, callback) {
    var filter = (0, _isArrayLike2.default)(coll) ? filterArray : filterGeneric;
    return filter(eachfn, coll, (0, _wrapAsync2.default)(iteratee), callback);
}
module.exports = exports['default'];