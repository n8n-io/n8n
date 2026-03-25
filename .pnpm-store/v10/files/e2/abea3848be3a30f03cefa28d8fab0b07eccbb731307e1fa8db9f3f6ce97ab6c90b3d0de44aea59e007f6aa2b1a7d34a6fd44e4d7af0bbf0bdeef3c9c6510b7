# 3.0.0

Removes default exports for AbortController. You must now import the `AbortController` object explicitly. This is a breaking change for some users relying on default exports. Upgrading to 3.0 is a one line change:

```js
// ES Modules Users
// v2
import AbortController from "node-abort-controller";

// v3
import { AbortController } from "node-abort-controller";

// Common JS Users
// v2
const AbortController = require("node-abort-controller");

// v3
const { AbortController } = require("node-abort-controller");
```

Other changes:

- Fix typos in docs
- Update all dev dependencies to resolve deprecation warnings

# 2.0.0

- Export AbortSignal class. This is a non-breaking change for JavaScript users and almost surely a non-breaking change for TypeScript users but we are doing a major version bump to be safe.

# 1.2.0

- Remove dependency on lib.dom for types that was conflicting with NodeJS types

# 1.1.0

- Add proper EventTarget support to signal and `signal.onabort`

# 1.0.4

- Initial Stable Release
