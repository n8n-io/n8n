(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('fast-unique-numbers')) :
    typeof define === 'function' && define.amd ? define(['exports', 'fast-unique-numbers'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.workerTimersBroker = {}, global.fastUniqueNumbers));
})(this, (function (exports, fastUniqueNumbers) { 'use strict';

    var isCallNotification = function isCallNotification(message) {
      return message.method !== undefined && message.method === 'call';
    };

    var isClearResponse = function isClearResponse(message) {
      return message.error === null && typeof message.id === 'number';
    };

    var load = function load(url) {
      // Prefilling the Maps with a function indexed by zero is necessary to be compliant with the specification.
      var scheduledIntervalFunctions = new Map([[0, function () {}]]); // tslint:disable-line no-empty
      var scheduledTimeoutFunctions = new Map([[0, function () {}]]); // tslint:disable-line no-empty
      var unrespondedRequests = new Map();
      var worker = new Worker(url);
      worker.addEventListener('message', function (_ref) {
        var data = _ref.data;
        if (isCallNotification(data)) {
          var _data$params = data.params,
            timerId = _data$params.timerId,
            timerType = _data$params.timerType;
          if (timerType === 'interval') {
            var idOrFunc = scheduledIntervalFunctions.get(timerId);
            if (typeof idOrFunc === 'number') {
              var timerIdAndTimerType = unrespondedRequests.get(idOrFunc);
              if (timerIdAndTimerType === undefined || timerIdAndTimerType.timerId !== timerId || timerIdAndTimerType.timerType !== timerType) {
                throw new Error('The timer is in an undefined state.');
              }
            } else if (typeof idOrFunc !== 'undefined') {
              idOrFunc();
            } else {
              throw new Error('The timer is in an undefined state.');
            }
          } else if (timerType === 'timeout') {
            var _idOrFunc = scheduledTimeoutFunctions.get(timerId);
            if (typeof _idOrFunc === 'number') {
              var _timerIdAndTimerType = unrespondedRequests.get(_idOrFunc);
              if (_timerIdAndTimerType === undefined || _timerIdAndTimerType.timerId !== timerId || _timerIdAndTimerType.timerType !== timerType) {
                throw new Error('The timer is in an undefined state.');
              }
            } else if (typeof _idOrFunc !== 'undefined') {
              _idOrFunc();
              // A timeout can be savely deleted because it is only called once.
              scheduledTimeoutFunctions["delete"](timerId);
            } else {
              throw new Error('The timer is in an undefined state.');
            }
          }
        } else if (isClearResponse(data)) {
          var id = data.id;
          var _timerIdAndTimerType2 = unrespondedRequests.get(id);
          if (_timerIdAndTimerType2 === undefined) {
            throw new Error('The timer is in an undefined state.');
          }
          var _timerId = _timerIdAndTimerType2.timerId,
            _timerType = _timerIdAndTimerType2.timerType;
          unrespondedRequests["delete"](id);
          if (_timerType === 'interval') {
            scheduledIntervalFunctions["delete"](_timerId);
          } else {
            scheduledTimeoutFunctions["delete"](_timerId);
          }
        } else {
          var message = data.error.message;
          throw new Error(message);
        }
      });
      var clearInterval = function clearInterval(timerId) {
        var id = fastUniqueNumbers.generateUniqueNumber(unrespondedRequests);
        unrespondedRequests.set(id, {
          timerId: timerId,
          timerType: 'interval'
        });
        scheduledIntervalFunctions.set(timerId, id);
        worker.postMessage({
          id: id,
          method: 'clear',
          params: {
            timerId: timerId,
            timerType: 'interval'
          }
        });
      };
      var clearTimeout = function clearTimeout(timerId) {
        var id = fastUniqueNumbers.generateUniqueNumber(unrespondedRequests);
        unrespondedRequests.set(id, {
          timerId: timerId,
          timerType: 'timeout'
        });
        scheduledTimeoutFunctions.set(timerId, id);
        worker.postMessage({
          id: id,
          method: 'clear',
          params: {
            timerId: timerId,
            timerType: 'timeout'
          }
        });
      };
      var setInterval = function setInterval(func) {
        var delay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
        var timerId = fastUniqueNumbers.generateUniqueNumber(scheduledIntervalFunctions);
        scheduledIntervalFunctions.set(timerId, function () {
          func();
          // Doublecheck if the interval should still be rescheduled because it could have been cleared inside of func().
          if (typeof scheduledIntervalFunctions.get(timerId) === 'function') {
            worker.postMessage({
              id: null,
              method: 'set',
              params: {
                delay: delay,
                now: performance.now(),
                timerId: timerId,
                timerType: 'interval'
              }
            });
          }
        });
        worker.postMessage({
          id: null,
          method: 'set',
          params: {
            delay: delay,
            now: performance.now(),
            timerId: timerId,
            timerType: 'interval'
          }
        });
        return timerId;
      };
      var setTimeout = function setTimeout(func) {
        var delay = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
        var timerId = fastUniqueNumbers.generateUniqueNumber(scheduledTimeoutFunctions);
        scheduledTimeoutFunctions.set(timerId, func);
        worker.postMessage({
          id: null,
          method: 'set',
          params: {
            delay: delay,
            now: performance.now(),
            timerId: timerId,
            timerType: 'timeout'
          }
        });
        return timerId;
      };
      return {
        clearInterval: clearInterval,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        setTimeout: setTimeout
      };
    };

    exports.load = load;

}));
