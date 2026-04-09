'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

exports.default = function (worker, concurrency) {
    var _worker = (0, _wrapAsync2.default)(worker);
    return (0, _queue2.default)((items, cb) => {
        _worker(items[0], cb);
    }, concurrency, 1);
};

var _queue = require('./internal/queue.js');

var _queue2 = _interopRequireDefault(_queue);

var _wrapAsync = require('./internal/wrapAsync.js');

var _wrapAsync2 = _interopRequireDefault(_wrapAsync);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = exports.default;