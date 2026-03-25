(function () {

  /*
   * Named exports support for legacy module formats in SystemJS 2.0
   * 
   * Note: This extra is deprecated as the behaviour is now the default in core,
   *       so will be removed in the next major.
   */
  (function (global) {
    var systemJSPrototype = global.System.constructor.prototype;

    // hook System.register to know the last declaration binding
    var lastRegisterDeclare;
    var systemRegister = systemJSPrototype.register;
    systemJSPrototype.register = function (name, deps, declare) {
      lastRegisterDeclare = typeof name === 'string' ? declare : deps;
      systemRegister.apply(this, arguments);
    };

    var getRegister = systemJSPrototype.getRegister;
    systemJSPrototype.getRegister = function () {
      var register = getRegister.call(this);
      // if it is an actual System.register call, then its ESM
      // -> dont add named exports
      if (!register || register[1] === lastRegisterDeclare || register[1].length === 0)
        return register;

      // otherwise it was provided by a custom instantiator
      // -> extend the registration with named exports support
      var registerDeclare = register[1];
      register[1] = function (_export, _context) {
        // hook the _export function to note the default export
        var defaultExport, hasDefaultExport = false;
        var declaration = registerDeclare.call(this, function (name, value) {
          if (typeof name === 'object' && name && name.__useDefault)
            defaultExport = name.default, hasDefaultExport = true;
          else if (name === 'default')
            defaultExport = value;
          else if (name === '__useDefault')
            hasDefaultExport = true;
          _export(name, value);
        }, _context);
        // hook the execute function
        var execute = declaration.execute;
        if (execute)
          declaration.execute = function () {
            execute.call(this);
            // do a bulk export of the default export object
            // to export all its names as named exports

            if (hasDefaultExport)
              for (var exportName in defaultExport) {
                if (
                  Object.prototype.hasOwnProperty.call(defaultExport,  exportName) // Check if epoxrt name is not inherited, safe for Object.create(null)
                  && exportName !== 'default' // default is not a named export
                ) {
                  _export(exportName, defaultExport[exportName]);
                }
              }
          };
        return declaration;
      };
      return register;
    };
  })(typeof self !== 'undefined' ? self : global);

})();
