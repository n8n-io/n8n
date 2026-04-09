'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _once = require('./once.js');

var _once2 = _interopRequireDefault(_once);

var _iterator = require('./iterator.js');

var _iterator2 = _interopRequireDefault(_iterator);

var _onlyOnce = require('./onlyOnce.js');

var _onlyOnce2 = _interopRequireDefault(_onlyOnce);

var _wrapAsync = require('./wrapAsync.js');

var _asyncEachOfLimit = require('./asyncEachOfLimit.js');

var _asyncEachOfLimit2 = _interopRequireDefault(_asyncEachOfLimit);

var _breakLoop = require('./breakLoop.js');

var _breakLoop2 = _interopRequireDefault(_breakLoop);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = limit => {
    return (obj, iteratee, callback) => {
        callback = (0, _once2.default)(callback);
        if (limit <= 0) {
            throw new RangeError('concurrency limit cannot be less than 1');
        }
        if (!obj) {
            return callback(null);
        }
        if ((0, _wrapAsync.isAsyncGenerator)(obj)) {
            return (0, _asyncEachOfLimit2.default)(obj, limit, iteratee, callback);
        }
        if ((0, _wrapAsync.isAsyncIterable)(obj)) {
            return (0, _asyncEachOfLimit2.default)(obj[Symbol.asyncIterator](), limit, iteratee, callback);
        }
        var nextElem = (0, _iterator2.default)(obj);
        var done = false;
        var canceled = false;
        var running = 0;
        var looping = false;

        function iterateeCallback(err, value) {
            if (canceled) return;
            running -= 1;
            if (err) {
                done = true;
                callback(err);
            } else if (err === false) {
                done = true;
                canceled = true;
            } else if (value === _breakLoop2.default || done && running <= 0) {
                done = true;
                return callback(null);
            } else if (!looping) {
                replenish();
            }
        }

        function replenish() {
            looping = true;
            while (running < limit && !done) {
                var elem = nextElem();
                if (elem === null) {
                    done = true;
                    if (running <= 0) {
                        callback(null);
                    }
                    return;
                }
                running += 1;
                iteratee(elem.value, elem.key, (0, _onlyOnce2.default)(iterateeCallback));
            }
            looping = false;
        }

        replenish();
    };
};

module.exports = exports.default;