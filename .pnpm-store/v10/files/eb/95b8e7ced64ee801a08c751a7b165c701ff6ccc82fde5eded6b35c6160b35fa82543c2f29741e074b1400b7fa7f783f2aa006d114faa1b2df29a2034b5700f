(function () {

  /*
   * SystemJS global script loading support
   * Extra for the s.js build only
   * (Included by default in system.js build)
   */
  (function (global) {
    var systemJSPrototype = global.System.constructor.prototype;

    // safari unpredictably lists some new globals first or second in object order
    var firstGlobalProp, secondGlobalProp, lastGlobalProp;
    function getGlobalProp (useFirstGlobalProp) {
      var cnt = 0;
      var foundLastProp, result;
      for (var p in global) {
        // do not check frames cause it could be removed during import
        if (shouldSkipProperty(p))
          continue;
        if (cnt === 0 && p !== firstGlobalProp || cnt === 1 && p !== secondGlobalProp)
          return p;
        if (foundLastProp) {
          lastGlobalProp = p;
          result = useFirstGlobalProp && result || p;
        }
        else {
          foundLastProp = p === lastGlobalProp;
        }
        cnt++;
      }
      return result;
    }

    function noteGlobalProps () {
      // alternatively Object.keys(global).pop()
      // but this may be faster (pending benchmarks)
      firstGlobalProp = secondGlobalProp = undefined;
      for (var p in global) {
        // do not check frames cause it could be removed during import
        if (shouldSkipProperty(p))
          continue;
        if (!firstGlobalProp)
          firstGlobalProp = p;
        else if (!secondGlobalProp)
          secondGlobalProp = p;
        lastGlobalProp = p;
      }
      return lastGlobalProp;
    }

    var impt = systemJSPrototype.import;
    systemJSPrototype.import = function (id, parentUrl, meta) {
      noteGlobalProps();
      return impt.call(this, id, parentUrl, meta);
    };

    var emptyInstantiation = [[], function () { return {} }];

    var getRegister = systemJSPrototype.getRegister;
    systemJSPrototype.getRegister = function () {
      var lastRegister = getRegister.call(this);
      if (lastRegister)
        return lastRegister;

      // no registration -> attempt a global detection as difference from snapshot
      // when multiple globals, we take the global value to be the last defined new global object property
      // for performance, this will not support multi-version / global collisions as previous SystemJS versions did
      // note in Edge, deleting and re-adding a global does not change its ordering
      var globalProp = getGlobalProp(this.firstGlobalProp);
      if (!globalProp)
        return emptyInstantiation;

      var globalExport;
      try {
        globalExport = global[globalProp];
      }
      catch (e) {
        return emptyInstantiation;
      }

      return [[], function (_export) {
        return {
          execute: function () {
            _export(globalExport);
            _export({ default: globalExport, __useDefault: true });
          }
        };
      }];
    };

    var isIE11 = typeof navigator !== 'undefined' && navigator.userAgent.indexOf('Trident') !== -1;

    function shouldSkipProperty(p) {
      return !global.hasOwnProperty(p)
        || !isNaN(p) && p < global.length
        || isIE11 && global[p] && typeof window !== 'undefined' && global[p].parent === window;
    }
  })(typeof self !== 'undefined' ? self : global);

})();
