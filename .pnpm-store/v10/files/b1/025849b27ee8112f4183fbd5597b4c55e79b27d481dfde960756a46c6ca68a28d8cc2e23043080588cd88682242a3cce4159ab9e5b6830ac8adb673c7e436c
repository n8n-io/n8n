'use strict';
require('es6-shim');

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var reInterval = require('../index.js');

describe('reInterval', function() {

  it('should work as an usual setInterval', function () {
    return new Promise(function (resolve, reject) {
      var startTime = new Date().getTime();

      reInterval(function () {
        if (Math.abs(new Date().getTime() - startTime - 1000) <= 10)
          resolve();
        else
          reject(new Error('Took too much (or not enough) time'));
      }, 1000);
    });
  });

  it('should be able to clear an Interval', function () {
    return new Promise(function (resolve, reject) {
      var startTime = new Date().getTime();

      var interval = reInterval(function () {
          reject(new Error('Interval not cleared'));
      }, 200);

      setTimeout(interval.clear, 100);

      setTimeout(resolve, 300);
    });
  });

  it('should be able to reschedule an Interval', function () {
    return new Promise(function (resolve, reject) {
      var startTime = new Date().getTime();

      var interval = reInterval(function () {
        if (Math.abs(new Date().getTime() - startTime - 800) <= 10)
          resolve();
        else
          reject(new Error('Took too much (or not enough) time'));
      }, 500);

      setTimeout(interval.reschedule, 300, [500])
    });
  });

});
