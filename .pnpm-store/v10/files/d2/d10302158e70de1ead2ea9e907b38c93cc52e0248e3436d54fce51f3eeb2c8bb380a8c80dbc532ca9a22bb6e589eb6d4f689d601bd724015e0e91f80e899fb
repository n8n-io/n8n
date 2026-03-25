'use strict';

const _ = require('lodash');

const builtinStrategies = {
  fixed(delay) {
    return function() {
      return delay;
    };
  },

  exponential(delay) {
    return function(attemptsMade) {
      return Math.round((Math.pow(2, attemptsMade) - 1) * delay);
    };
  }
};

function lookupStrategy(backoff, customStrategies) {
  if (backoff.type in customStrategies) {
    return customStrategies[backoff.type];
  } else if (backoff.type in builtinStrategies) {
    return builtinStrategies[backoff.type](backoff.delay);
  } else {
    throw new Error(
      'Unknown backoff strategy ' +
        backoff.type +
        '. If a custom backoff strategy is used, specify it when the queue is created.'
    );
  }
}

module.exports = {
  normalize(backoff) {
    if (_.isFinite(backoff)) {
      return {
        type: 'fixed',
        delay: backoff
      };
    } else if (backoff) {
      return backoff;
    }
  },

  calculate(backoff, attemptsMade, customStrategies, err, strategyOptions) {
    if (backoff) {
      const strategy = lookupStrategy(
        backoff,
        customStrategies,
        strategyOptions
      );

      return strategy(attemptsMade, err, strategyOptions);
    }
  }
};
