(function (factory) {
    typeof define === 'function' && define.amd ? define(factory) :
    factory();
})((function () { 'use strict';

    var scheduledIntervalIdentifiers = new Map();
    var scheduledTimeoutIdentifiers = new Map();
    var clearScheduledInterval = function clearScheduledInterval(timerId) {
      var identifier = scheduledIntervalIdentifiers.get(timerId);
      if (identifier !== undefined) {
        clearTimeout(identifier);
        scheduledIntervalIdentifiers["delete"](timerId);
      } else {
        throw new Error("There is no interval scheduled with the given id \"".concat(timerId, "\"."));
      }
    };
    var clearScheduledTimeout = function clearScheduledTimeout(timerId) {
      var identifier = scheduledTimeoutIdentifiers.get(timerId);
      if (identifier !== undefined) {
        clearTimeout(identifier);
        scheduledTimeoutIdentifiers["delete"](timerId);
      } else {
        throw new Error("There is no timeout scheduled with the given id \"".concat(timerId, "\"."));
      }
    };
    var computeDelayAndExpectedCallbackTime = function computeDelayAndExpectedCallbackTime(delay, nowInMainThread) {
      var now;
      var remainingDelay;
      var nowInWorker = performance.now();
      var elapsed = Math.max(0, nowInWorker - nowInMainThread);
      now = nowInWorker;
      remainingDelay = delay - elapsed;
      var expected = now + remainingDelay;
      return {
        expected: expected,
        remainingDelay: remainingDelay
      };
    };
    var setTimeoutCallback = function setTimeoutCallback(identifiers, timerId, expected, timerType) {
      var now = performance.now();
      if (now > expected) {
        postMessage({
          id: null,
          method: 'call',
          params: {
            timerId: timerId,
            timerType: timerType
          }
        });
      } else {
        identifiers.set(timerId, setTimeout(setTimeoutCallback, expected - now, identifiers, timerId, expected, timerType));
      }
    };
    var scheduleInterval = function scheduleInterval(delay, timerId, nowInMainThread) {
      var _computeDelayAndExpec = computeDelayAndExpectedCallbackTime(delay, nowInMainThread),
        expected = _computeDelayAndExpec.expected,
        remainingDelay = _computeDelayAndExpec.remainingDelay;
      scheduledIntervalIdentifiers.set(timerId, setTimeout(setTimeoutCallback, remainingDelay, scheduledIntervalIdentifiers, timerId, expected, 'interval'));
    };
    var scheduleTimeout = function scheduleTimeout(delay, timerId, nowInMainThread) {
      var _computeDelayAndExpec2 = computeDelayAndExpectedCallbackTime(delay, nowInMainThread),
        expected = _computeDelayAndExpec2.expected,
        remainingDelay = _computeDelayAndExpec2.remainingDelay;
      scheduledTimeoutIdentifiers.set(timerId, setTimeout(setTimeoutCallback, remainingDelay, scheduledTimeoutIdentifiers, timerId, expected, 'timeout'));
    };

    addEventListener('message', function (_ref) {
      var data = _ref.data;
      try {
        if (data.method === 'clear') {
          var id = data.id,
            _data$params = data.params,
            timerId = _data$params.timerId,
            timerType = _data$params.timerType;
          if (timerType === 'interval') {
            clearScheduledInterval(timerId);
            postMessage({
              error: null,
              id: id
            });
          } else if (timerType === 'timeout') {
            clearScheduledTimeout(timerId);
            postMessage({
              error: null,
              id: id
            });
          } else {
            throw new Error("The given type \"".concat(timerType, "\" is not supported"));
          }
        } else if (data.method === 'set') {
          var _data$params2 = data.params,
            delay = _data$params2.delay,
            now = _data$params2.now,
            _timerId = _data$params2.timerId,
            _timerType = _data$params2.timerType;
          if (_timerType === 'interval') {
            scheduleInterval(delay, _timerId, now);
          } else if (_timerType === 'timeout') {
            scheduleTimeout(delay, _timerId, now);
          } else {
            throw new Error("The given type \"".concat(_timerType, "\" is not supported"));
          }
        } else {
          throw new Error("The given method \"".concat(data.method, "\" is not supported"));
        }
      } catch (err) {
        postMessage({
          error: {
            message: err.message
          },
          id: data.id,
          result: null
        });
      }
    });

}));
