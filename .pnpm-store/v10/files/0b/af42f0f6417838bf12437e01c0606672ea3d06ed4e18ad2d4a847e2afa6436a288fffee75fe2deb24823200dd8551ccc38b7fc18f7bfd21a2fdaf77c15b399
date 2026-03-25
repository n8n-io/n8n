define(['./restArguments', './reduce'], function (restArguments, reduce) {

  function nextValue(previous, func) {
    return func(previous);
  }

  var pipe = restArguments(function(value, funcs) {
    return reduce(funcs, nextValue, value);
  });

  return pipe;

});
