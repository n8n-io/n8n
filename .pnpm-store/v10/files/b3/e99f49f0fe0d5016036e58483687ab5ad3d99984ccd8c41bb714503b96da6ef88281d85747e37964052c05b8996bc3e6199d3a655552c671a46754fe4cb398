'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = queue;

var _onlyOnce = require('./onlyOnce.js');

var _onlyOnce2 = _interopRequireDefault(_onlyOnce);

var _setImmediate = require('./setImmediate.js');

var _setImmediate2 = _interopRequireDefault(_setImmediate);

var _DoublyLinkedList = require('./DoublyLinkedList.js');

var _DoublyLinkedList2 = _interopRequireDefault(_DoublyLinkedList);

var _wrapAsync = require('./wrapAsync.js');

var _wrapAsync2 = _interopRequireDefault(_wrapAsync);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function queue(worker, concurrency, payload) {
    if (concurrency == null) {
        concurrency = 1;
    } else if (concurrency === 0) {
        throw new RangeError('Concurrency must not be zero');
    }

    var _worker = (0, _wrapAsync2.default)(worker);
    var numRunning = 0;
    var workersList = [];
    const events = {
        error: [],
        drain: [],
        saturated: [],
        unsaturated: [],
        empty: []
    };

    function on(event, handler) {
        events[event].push(handler);
    }

    function once(event, handler) {
        const handleAndRemove = (...args) => {
            off(event, handleAndRemove);
            handler(...args);
        };
        events[event].push(handleAndRemove);
    }

    function off(event, handler) {
        if (!event) return Object.keys(events).forEach(ev => events[ev] = []);
        if (!handler) return events[event] = [];
        events[event] = events[event].filter(ev => ev !== handler);
    }

    function trigger(event, ...args) {
        events[event].forEach(handler => handler(...args));
    }

    var processingScheduled = false;
    function _insert(data, insertAtFront, rejectOnError, callback) {
        if (callback != null && typeof callback !== 'function') {
            throw new Error('task callback must be a function');
        }
        q.started = true;

        var res, rej;
        function promiseCallback(err, ...args) {
            // we don't care about the error, let the global error handler
            // deal with it
            if (err) return rejectOnError ? rej(err) : res();
            if (args.length <= 1) return res(args[0]);
            res(args);
        }

        var item = q._createTaskItem(data, rejectOnError ? promiseCallback : callback || promiseCallback);

        if (insertAtFront) {
            q._tasks.unshift(item);
        } else {
            q._tasks.push(item);
        }

        if (!processingScheduled) {
            processingScheduled = true;
            (0, _setImmediate2.default)(() => {
                processingScheduled = false;
                q.process();
            });
        }

        if (rejectOnError || !callback) {
            return new Promise((resolve, reject) => {
                res = resolve;
                rej = reject;
            });
        }
    }

    function _createCB(tasks) {
        return function (err, ...args) {
            numRunning -= 1;

            for (var i = 0, l = tasks.length; i < l; i++) {
                var task = tasks[i];

                var index = workersList.indexOf(task);
                if (index === 0) {
                    workersList.shift();
                } else if (index > 0) {
                    workersList.splice(index, 1);
                }

                task.callback(err, ...args);

                if (err != null) {
                    trigger('error', err, task.data);
                }
            }

            if (numRunning <= q.concurrency - q.buffer) {
                trigger('unsaturated');
            }

            if (q.idle()) {
                trigger('drain');
            }
            q.process();
        };
    }

    function _maybeDrain(data) {
        if (data.length === 0 && q.idle()) {
            // call drain immediately if there are no tasks
            (0, _setImmediate2.default)(() => trigger('drain'));
            return true;
        }
        return false;
    }

    const eventMethod = name => handler => {
        if (!handler) {
            return new Promise((resolve, reject) => {
                once(name, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });
        }
        off(name);
        on(name, handler);
    };

    var isProcessing = false;
    var q = {
        _tasks: new _DoublyLinkedList2.default(),
        _createTaskItem(data, callback) {
            return {
                data,
                callback
            };
        },
        *[Symbol.iterator]() {
            yield* q._tasks[Symbol.iterator]();
        },
        concurrency,
        payload,
        buffer: concurrency / 4,
        started: false,
        paused: false,
        push(data, callback) {
            if (Array.isArray(data)) {
                if (_maybeDrain(data)) return;
                return data.map(datum => _insert(datum, false, false, callback));
            }
            return _insert(data, false, false, callback);
        },
        pushAsync(data, callback) {
            if (Array.isArray(data)) {
                if (_maybeDrain(data)) return;
                return data.map(datum => _insert(datum, false, true, callback));
            }
            return _insert(data, false, true, callback);
        },
        kill() {
            off();
            q._tasks.empty();
        },
        unshift(data, callback) {
            if (Array.isArray(data)) {
                if (_maybeDrain(data)) return;
                return data.map(datum => _insert(datum, true, false, callback));
            }
            return _insert(data, true, false, callback);
        },
        unshiftAsync(data, callback) {
            if (Array.isArray(data)) {
                if (_maybeDrain(data)) return;
                return data.map(datum => _insert(datum, true, true, callback));
            }
            return _insert(data, true, true, callback);
        },
        remove(testFn) {
            q._tasks.remove(testFn);
        },
        process() {
            // Avoid trying to start too many processing operations. This can occur
            // when callbacks resolve synchronously (#1267).
            if (isProcessing) {
                return;
            }
            isProcessing = true;
            while (!q.paused && numRunning < q.concurrency && q._tasks.length) {
                var tasks = [],
                    data = [];
                var l = q._tasks.length;
                if (q.payload) l = Math.min(l, q.payload);
                for (var i = 0; i < l; i++) {
                    var node = q._tasks.shift();
                    tasks.push(node);
                    workersList.push(node);
                    data.push(node.data);
                }

                numRunning += 1;

                if (q._tasks.length === 0) {
                    trigger('empty');
                }

                if (numRunning === q.concurrency) {
                    trigger('saturated');
                }

                var cb = (0, _onlyOnce2.default)(_createCB(tasks));
                _worker(data, cb);
            }
            isProcessing = false;
        },
        length() {
            return q._tasks.length;
        },
        running() {
            return numRunning;
        },
        workersList() {
            return workersList;
        },
        idle() {
            return q._tasks.length + numRunning === 0;
        },
        pause() {
            q.paused = true;
        },
        resume() {
            if (q.paused === false) {
                return;
            }
            q.paused = false;
            (0, _setImmediate2.default)(q.process);
        }
    };
    // define these as fixed properties, so people get useful errors when updating
    Object.defineProperties(q, {
        saturated: {
            writable: false,
            value: eventMethod('saturated')
        },
        unsaturated: {
            writable: false,
            value: eventMethod('unsaturated')
        },
        empty: {
            writable: false,
            value: eventMethod('empty')
        },
        drain: {
            writable: false,
            value: eventMethod('drain')
        },
        error: {
            writable: false,
            value: eventMethod('error')
        }
    });
    return q;
}
module.exports = exports['default'];