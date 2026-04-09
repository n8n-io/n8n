# Swagger UI Dist
[![NPM version](https://badge.fury.io/js/swagger-ui-dist.svg)](http://badge.fury.io/js/swagger-ui-dist)

## Anonymized analytics

SwaggerUI Dist uses [Scarf](https://scarf.sh/) to collect [anonymized installation analytics](https://github.com/scarf-sh/scarf-js?tab=readme-ov-file#as-a-user-of-a-package-using-scarf-js-what-information-does-scarf-js-send-about-me). These analytics help support the maintainers of this library and ONLY run during installation. To [opt out](https://github.com/scarf-sh/scarf-js?tab=readme-ov-file#as-a-user-of-a-package-using-scarf-js-how-can-i-opt-out-of-analytics), you can set the `scarfSettings.enabled` field to `false` in your project's `package.json`:

```
// package.json
{
  // ...
  "scarfSettings": {
    "enabled": false
  }
  // ...
}
```

Alternatively, you can set the environment variable `SCARF_ANALYTICS` to `false` as part of the environment that installs your npm packages, e.g., `SCARF_ANALYTICS=false npm install`.


# API

This module, `swagger-ui-dist`, exposes Swagger-UI's entire dist folder as a dependency-free npm module.
Use `swagger-ui` instead, if you'd like to have npm install dependencies for you.

`SwaggerUIBundle` and `SwaggerUIStandalonePreset` can be imported:
```javascript
  import { SwaggerUIBundle, SwaggerUIStandalonePreset } from "swagger-ui-dist"
```

To get an absolute path to this directory for static file serving, use the exported `getAbsoluteFSPath` method:

```javascript
const swaggerUiAssetPath = require("swagger-ui-dist").getAbsoluteFSPath()

// then instantiate server that serves files from the swaggerUiAssetPath
```

For anything else, check the [Swagger-UI](https://github.com/swagger-api/swagger-ui) repository.
