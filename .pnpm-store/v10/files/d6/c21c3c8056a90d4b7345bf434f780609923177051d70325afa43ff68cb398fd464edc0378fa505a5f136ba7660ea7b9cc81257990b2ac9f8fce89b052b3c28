# oas-validator

Usage:

```javascript
const validator = require('oas-validator');
const options = {};
validator.validate(openapi, options)
.then(function(options){
  // options.valid contains the result of the validation, true in this branch
})
.catch(function(err){
  console.warn(err.message);
  if (options.context) console.warn('Location',options.context.pop());
});
```

If a third `callback` argument to `validate` is provided, the callback will be called instead of a Promise being returned.

`oas-validator` is an assertion-based validator, which stops on the first error, as structural errors may otherwise cause further (spurious) errors to be reported. If the `lint` option is set, multiple `warnings` may be reported.

See here for complete [documentation](/docs/options.md) of the `options` object.
