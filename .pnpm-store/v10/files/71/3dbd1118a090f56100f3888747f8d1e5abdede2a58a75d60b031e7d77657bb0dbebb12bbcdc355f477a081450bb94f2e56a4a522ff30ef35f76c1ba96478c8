'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _isArrayLike = require('./isArrayLike.js');

var _isArrayLike2 = _interopRequireDefault(_isArrayLike);

var _wrapAsync = require('./wrapAsync.js');

var _wrapAsync2 = _interopRequireDefault(_wrapAsync);

var _awaitify = require('./awaitify.js');

var _awaitify2 = _interopRequireDefault(_awaitify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = (0, _awaitify2.default)((eachfn, tasks, callback) => {
    var results = (0, _isArrayLike2.default)(tasks) ? [] : {};

    eachfn(tasks, (task, key, taskCb) => {
        (0, _wrapAsync2.default)(task)((err, ...result) => {
            if (result.length < 2) {
                [result] = result;
            }
            results[key] = result;
            taskCb(err);
        });
    }, err => callback(err, results));
}, 3);
module.exports = exports['default'];