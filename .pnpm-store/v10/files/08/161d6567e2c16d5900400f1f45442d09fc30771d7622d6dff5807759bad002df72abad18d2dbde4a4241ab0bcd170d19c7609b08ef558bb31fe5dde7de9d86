define(['exports', 'module'], function (exports, module) {
  /* global globalThis */
  'use strict';

  module.exports = function (Handlebars) {
    /* istanbul ignore next */
    // https://mathiasbynens.be/notes/globalthis
    (function () {
      if (typeof globalThis === 'object') return;
      Object.prototype.__defineGetter__('__magic__', function () {
        return this;
      });
      __magic__.globalThis = __magic__; // eslint-disable-line no-undef
      delete Object.prototype.__magic__;
    })();

    var $Handlebars = globalThis.Handlebars;

    /* istanbul ignore next */
    Handlebars.noConflict = function () {
      if (globalThis.Handlebars === Handlebars) {
        globalThis.Handlebars = $Handlebars;
      }
      return Handlebars;
    };
  };
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL2xpYi9oYW5kbGViYXJzL25vLWNvbmZsaWN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7bUJBQ2UsVUFBUyxVQUFVLEVBQUU7OztBQUdsQyxLQUFDLFlBQVc7QUFDVixVQUFJLE9BQU8sVUFBVSxLQUFLLFFBQVEsRUFBRSxPQUFPO0FBQzNDLFlBQU0sQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxFQUFFLFlBQVc7QUFDeEQsZUFBTyxJQUFJLENBQUM7T0FDYixDQUFDLENBQUM7QUFDSCxlQUFTLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztBQUNqQyxhQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDO0tBQ25DLENBQUEsRUFBRyxDQUFDOztBQUVMLFFBQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUM7OztBQUcxQyxjQUFVLENBQUMsVUFBVSxHQUFHLFlBQVc7QUFDakMsVUFBSSxVQUFVLENBQUMsVUFBVSxLQUFLLFVBQVUsRUFBRTtBQUN4QyxrQkFBVSxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUM7T0FDckM7QUFDRCxhQUFPLFVBQVUsQ0FBQztLQUNuQixDQUFDO0dBQ0giLCJmaWxlIjoibm8tY29uZmxpY3QuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBnbG9iYWwgZ2xvYmFsVGhpcyAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24oSGFuZGxlYmFycykge1xuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICAvLyBodHRwczovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvZ2xvYmFsdGhpc1xuICAoZnVuY3Rpb24oKSB7XG4gICAgaWYgKHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JykgcmV0dXJuO1xuICAgIE9iamVjdC5wcm90b3R5cGUuX19kZWZpbmVHZXR0ZXJfXygnX19tYWdpY19fJywgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcbiAgICBfX21hZ2ljX18uZ2xvYmFsVGhpcyA9IF9fbWFnaWNfXzsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11bmRlZlxuICAgIGRlbGV0ZSBPYmplY3QucHJvdG90eXBlLl9fbWFnaWNfXztcbiAgfSkoKTtcblxuICBjb25zdCAkSGFuZGxlYmFycyA9IGdsb2JhbFRoaXMuSGFuZGxlYmFycztcblxuICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xuICBIYW5kbGViYXJzLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoZ2xvYmFsVGhpcy5IYW5kbGViYXJzID09PSBIYW5kbGViYXJzKSB7XG4gICAgICBnbG9iYWxUaGlzLkhhbmRsZWJhcnMgPSAkSGFuZGxlYmFycztcbiAgICB9XG4gICAgcmV0dXJuIEhhbmRsZWJhcnM7XG4gIH07XG59XG4iXX0=
