var getMilliseconds = function() {
  if (typeof process !== 'undefined' && process.hrtime) {
    var hrtime = process.hrtime();
    var seconds = hrtime[0];
    var nanoseconds = hrtime[1];

    return seconds * 1e3 +  Math.floor(nanoseconds / 1e6);
  }

  return new Date().getTime();
}

module.exports = getMilliseconds;
