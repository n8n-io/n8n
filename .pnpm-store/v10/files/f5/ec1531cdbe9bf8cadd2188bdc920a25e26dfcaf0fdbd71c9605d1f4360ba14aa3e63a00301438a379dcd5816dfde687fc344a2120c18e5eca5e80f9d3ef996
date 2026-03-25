define(['exports'], function (exports) {
  'use strict';

  exports.__esModule = true;
  exports.wrapHelper = wrapHelper;

  function wrapHelper(helper, transformOptionsFn) {
    if (typeof helper !== 'function') {
      // This should not happen, but apparently it does in https://github.com/wycats/handlebars.js/issues/1639
      // We try to make the wrapper least-invasive by not wrapping it, if the helper is not a function.
      return helper;
    }
    var wrapper = function wrapper() /* dynamic arguments */{
      var options = arguments[arguments.length - 1];
      arguments[arguments.length - 1] = transformOptionsFn(options);
      return helper.apply(this, arguments);
    };
    return wrapper;
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL2xpYi9oYW5kbGViYXJzL2ludGVybmFsL3dyYXBIZWxwZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQU8sV0FBUyxVQUFVLENBQUMsTUFBTSxFQUFFLGtCQUFrQixFQUFFO0FBQ3JELFFBQUksT0FBTyxNQUFNLEtBQUssVUFBVSxFQUFFOzs7QUFHaEMsYUFBTyxNQUFNLENBQUM7S0FDZjtBQUNELFFBQUksT0FBTyxHQUFHLFNBQVYsT0FBTywwQkFBcUM7QUFDOUMsVUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDaEQsZUFBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDOUQsYUFBTyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztLQUN0QyxDQUFDO0FBQ0YsV0FBTyxPQUFPLENBQUM7R0FDaEIiLCJmaWxlIjoid3JhcEhlbHBlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiB3cmFwSGVscGVyKGhlbHBlciwgdHJhbnNmb3JtT3B0aW9uc0ZuKSB7XG4gIGlmICh0eXBlb2YgaGVscGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gVGhpcyBzaG91bGQgbm90IGhhcHBlbiwgYnV0IGFwcGFyZW50bHkgaXQgZG9lcyBpbiBodHRwczovL2dpdGh1Yi5jb20vd3ljYXRzL2hhbmRsZWJhcnMuanMvaXNzdWVzLzE2MzlcbiAgICAvLyBXZSB0cnkgdG8gbWFrZSB0aGUgd3JhcHBlciBsZWFzdC1pbnZhc2l2ZSBieSBub3Qgd3JhcHBpbmcgaXQsIGlmIHRoZSBoZWxwZXIgaXMgbm90IGEgZnVuY3Rpb24uXG4gICAgcmV0dXJuIGhlbHBlcjtcbiAgfVxuICBsZXQgd3JhcHBlciA9IGZ1bmN0aW9uKC8qIGR5bmFtaWMgYXJndW1lbnRzICovKSB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV07XG4gICAgYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXSA9IHRyYW5zZm9ybU9wdGlvbnNGbihvcHRpb25zKTtcbiAgICByZXR1cm4gaGVscGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH07XG4gIHJldHVybiB3cmFwcGVyO1xufVxuIl19
