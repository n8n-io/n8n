(function () {

  function errMsg(errCode, msg) {
    return (msg || "") + " (SystemJS Error#" + errCode + " " + "https://github.com/systemjs/systemjs/blob/main/docs/errors.md#" + errCode + ")";
  }

  /*
   * Support for AMD loading
   */
  (function (global) {
    function unsupportedRequire () {
      throw Error(errMsg(5, 'AMD require not supported.'));
    }

    var requireExportsModule = ['require', 'exports', 'module'];

    function createAMDRegister (amdDefineDeps, amdDefineExec) {
      var exports = {};
      var module = { exports: exports };
      var depModules = [];
      var setters = [];
      var splice = 0;
      for (var i = 0; i < amdDefineDeps.length; i++) {
        var id = amdDefineDeps[i];
        var index = setters.length;
        if (id === 'require') {
          depModules[i] = unsupportedRequire;
          splice++;
        }
        else if (id === 'module') {
          depModules[i] = module;
          splice++;
        }
        else if (id === 'exports') {
          depModules[i] = exports;
          splice++;
        }
        else {
          createSetter(i);
        }
        if (splice)
          amdDefineDeps[index] = id;
      }
      if (splice)
        amdDefineDeps.length -= splice;
      var amdExec = amdDefineExec;
      return [amdDefineDeps, function (_export, _context) {
        _export({ default: exports, __useDefault: true });
        return {
          setters: setters,
          execute: function () {
            module.uri = _context.meta.url;
            var amdResult = amdExec.apply(exports, depModules);
            if (amdResult !== undefined)
              module.exports = amdResult;
            _export(module.exports);
            _export('default', module.exports);
          }
        };
      }];

      // needed to avoid iteration scope issues
      function createSetter(idx) {
        setters.push(function (ns) {
          depModules[idx] = ns.__useDefault ? ns.default : ns;
        });
      }
    }

    global.define = function (arg1, arg2, arg3) {
      var isNamedRegister = typeof arg1 === 'string';
      var name = isNamedRegister ? arg1 : null;
      var depArg = isNamedRegister ? arg2 : arg1;
      var execArg = isNamedRegister ? arg3 : arg2;

      // The System.register(deps, exec) arguments
      var deps, exec;

      // define([], function () {})
      if (Array.isArray(depArg)) {
        deps = depArg;
        exec = execArg;
      }
      // define({})
      else if (typeof depArg === 'object') {
        deps = [];
        exec = function () { return depArg };
      }
      // define(function () {})
      else if (typeof depArg === 'function') {
        deps = requireExportsModule;
        exec = depArg;
      } else {
        throw Error(errMsg(9, 'Invalid call to AMD define()'));
      }

      var amdRegister = createAMDRegister(deps, exec);

      if (isNamedRegister) {
        if (System.registerRegistry) {
          System.registerRegistry[name] = amdRegister;
          System.register(name, amdRegister[0], amdRegister[1]);
        } else
          console.warn(errMsg('W6', 'Include named-register.js for full named define support'));
          // TODO: create new warning number and documentation for using named define without named-register extra
          System.register(amdRegister[0], amdRegister[1]);
      } else
        System.register(amdRegister[0], amdRegister[1]);
    };
    global.define.amd = {};
  })(typeof self !== 'undefined' ? self : global);

})();
