define(['./restArguments', './isFunction', './_executeBound'], function (restArguments, isFunction, _executeBound) {

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally).
  var bind = restArguments(function(func, context, args) {
    if (!isFunction(func)) throw new TypeError('Bind must be called on a function');
    var bound = restArguments(function(callArgs) {
      return _executeBound(func, bound, context, this, args.concat(callArgs));
    });
    return bound;
  });

  return bind;

});
