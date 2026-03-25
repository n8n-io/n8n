/**
Check whether a request can be retried based on the `error.code`.

@param error - The `.code` property, if it exists, will be used to determine whether retry is allowed.

@example
```
import isRetryAllowed = require('is-retry-allowed');

isRetryAllowed({code: 'ETIMEDOUT'});
//=> true

isRetryAllowed({code: 'ENOTFOUND'});
//=> false

isRetryAllowed({});
//=> true
```
*/
declare function isRetryAllowed(error?: Error | Record<string, unknown>): boolean;

export = isRetryAllowed;
