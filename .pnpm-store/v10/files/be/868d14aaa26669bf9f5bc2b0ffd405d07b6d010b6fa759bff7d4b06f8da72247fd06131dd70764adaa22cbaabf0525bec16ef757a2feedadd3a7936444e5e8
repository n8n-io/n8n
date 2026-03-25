(function initLazyAss() {

  function isArrayLike(a) {
    return a && typeof a.length === 'number';
  }

  function toStringArray(arr) {
    return 'array with ' + arr.length + ' items.\n[' +
      arr.map(toString).join(',') + ']\n';
  }

  function isPrimitive(arg) {
    return typeof arg === 'string' ||
      typeof arg === 'number' ||
      typeof arg === 'boolean';
  }

  function isError(e) {
    return e instanceof Error;
  }

  /*
    custom JSON.stringify replacer to make sure we do not
    hide properties that have value "undefined"
    var o = {
      foo: 42,
      bar: undefined
    }
    // standard JSON.stringify returns '{"foo": 42}'
    // this replacer returns '{"foo": 42, "bar": null}'
  */
  function replacer(key, value) {
    if (value === undefined) {
      return null;
    }
    return value;
  }

  function toString(arg, k) {
    if (isPrimitive(arg)) {
      return JSON.stringify(arg);
    }
    if (arg instanceof Error) {
      return arg.name + ' ' + arg.message;
    }

    if (Array.isArray(arg)) {
      return toStringArray(arg);
    }
    if (isArrayLike(arg)) {
      return toStringArray(Array.prototype.slice.call(arg, 0));
    }
    var argString;
    try {
      argString = JSON.stringify(arg, replacer, 2);
    } catch (err) {
      argString = '{ cannot stringify arg ' + k + ', it has type "' + typeof arg + '"';
      if (typeof arg === 'object') {
        argString += ' with keys ' + Object.keys(arg).join(', ') + ' }';
      } else {
        argString += ' }';
      }
    }
    return argString;
  }

  function endsWithNewLine(s) {
    return /\n$/.test(s);
  }

  function formMessage(args) {
    var msg = args.reduce(function (total, arg, k) {
      if (k && !endsWithNewLine(total)) {
        total += ' ';
      }
      if (typeof arg === 'string') {
        return total + arg;
      }
      if (typeof arg === 'function') {
        var fnResult;
        try {
          fnResult = arg();
        } catch (err) {
          // ignore the error
          fnResult = '[function ' + arg.name + ' threw error!]';
        }
        return total + fnResult;
      }
      var argString = toString(arg, k);
      return total + argString;
    }, '');
    return msg;
  }

  function lazyAssLogic(condition) {
    if (isError(condition)) {
      return condition;
    }

    var fn = typeof condition === 'function' ? condition : null;

    if (fn) {
      condition = fn();
    }
    if (!condition) {
      var args = [].slice.call(arguments, 1);
      if (fn) {
        args.unshift(fn.toString());
      }
      return new Error(formMessage(args));
    }
  }

  var lazyAss = function lazyAss() {
    var err = lazyAssLogic.apply(null, arguments);
    if (err) {
      throw err;
    }
  };

  var lazyAssync = function lazyAssync() {
    var err = lazyAssLogic.apply(null, arguments);
    if (err) {
      setTimeout(function () {
        throw err;
      }, 0);
    }
  };

  lazyAss.async = lazyAssync;

  function isNode() {
    return typeof global === 'object';
  }

  function isBrowser() {
    return typeof window === 'object';
  }

  function isCommonJS() {
    return typeof module === 'object';
  }

  function globalRegister() {
    if (isNode()) {
      /* global global */
      register(global, lazyAss, 'lazyAss', 'la');
      register(global, lazyAssync, 'lazyAssync', 'lac');
    }
  }

  function register(root, value, name, alias) {
    root[name] = root[alias] = value;
  }

  lazyAss.globalRegister = globalRegister;

  if (isBrowser()) {
    /* global window */
    register(window, lazyAss, 'lazyAss', 'la');
    register(window, lazyAssync, 'lazyAssync', 'lac');
  }

  if (isCommonJS()) {
    /* global module */
    module.exports = lazyAss;
  }

}());
