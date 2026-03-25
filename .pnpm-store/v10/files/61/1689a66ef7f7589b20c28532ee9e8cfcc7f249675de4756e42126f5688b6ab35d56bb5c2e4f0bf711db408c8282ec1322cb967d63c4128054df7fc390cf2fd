const { performance } = require('perf_hooks');
const Logger = require('../logger');
const Util = require('../util');

function ExecutionTimer() {
  let startTime = null;
  let endTime = null;

  // Private function to log and check if the timer was started
  function wasStarted() {
    return Util.exists(startTime);

  }

  this.start = function () {
    startTime = performance.now();
    endTime = null; // Reset endTime if the timer is reused
    return this;
  };


  this.stop = function () {
    if (!wasStarted()) {
      // Returning this to allow chaining even after invalid call.
      // startTime can be used to check, if any start point was ever recorded.
      Logger.getInstance().debug('Tried to stop timer, that was not started');
      return this;
    }
    endTime = performance.now();
    return this;
  };

  // Get the duration in milliseconds
  this.getDuration = function () {
    if (!wasStarted()) {
      return;
    }
    if (endTime === null) {
      endTime = performance.now();
    }
    return endTime - startTime;
  };
}

module.exports = ExecutionTimer;
