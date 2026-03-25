# 🦋 express-openapi-validator

[![build workflow](https://github.com/cdimascio/express-openapi-validator/actions/workflows/default.yml/badge.svg)](#) [![](https://img.shields.io/npm/v/express-openapi-validator.svg)](https://www.npmjs.com/package/express-openapi-validator) [![](https://img.shields.io/npm/dm/express-openapi-validator?color=blue)](https://www.npmjs.com/package/express-openapi-validator) [![All Contributors](https://img.shields.io/github/contributors/cdimascio/express-openapi-validator
)](#contributors) [![Coverage Status](https://coveralls.io/repos/github/cdimascio/express-openapi-validator/badge.svg?branch=master)](https://coveralls.io/github/cdimascio/express-openapi-validator?branch=master) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/1570a06f609345ddb237114bbd6ceed7)](https://www.codacy.com/manual/cdimascio/express-openapi-validator?utm_source=github.com&utm_medium=referral&utm_content=cdimascio/express-openapi-validator&utm_campaign=Badge_Grade) [![](https://img.shields.io/gitter/room/cdimascio-oss/community?color=%23eb205a)](https://gitter.im/cdimascio-oss/community) [![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/cdimascio/express-openapi-validator)  [![](https://img.shields.io/badge/documentation-yes-informational)](https://cdimascio.github.io/express-openapi-validator-documentation/) [![](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

**An OpenApi validator for ExpressJS** that automatically validates **API** _**requests**_ and _**responses**_ using an **OpenAPI 3** specification.

<p align="center">
<img src="https://raw.githubusercontent.com/cdimascio/express-openapi-validator/master/assets/express-openapi-validator-logo-v2.png" width="600">
</p>

[🦋express-openapi-validator](https://github.com/cdimascio/express-openapi-validator) is an unopinionated library that integrates with new and existing API applications. express-openapi-validator lets you write code the way you want; it does not impose any coding convention or project layout. Simply, install the validator onto your express app, point it to your **OpenAPI 3.0.x** or **3.1.x** specification, then define and implement routes the way you prefer. See an [example](https://cdimascio.github.io/express-openapi-validator-documentation/guide-standard/).

**Features:**

- ✔️ request validation
- ✔️ response validation (json only)
- 👮 security validation / custom security functions
- 👽 3rd party / custom formats / custom data serialization-deserialization
- 🧵 optionally auto-map OpenAPI endpoints to Express handler functions
- ✂️ **\$ref** support; split specs over multiple files
- 🎈 file upload
- ✏️ OpenAPI 3.0.x and 3.1.x spec support
- ✨ Express 4 and 5 support



**Docs:**
- 📖 [documentation](https://cdimascio.github.io/express-openapi-validator-documentation/)

[![GitHub stars](https://img.shields.io/github/stars/cdimascio/express-openapi-validator.svg?style=social&label=Star&maxAge=2592000)](https://GitHub.com/cdimascio/express-openapi-validator/stargazers/) [![Twitter URL](https://img.shields.io/twitter/url/https/github.com/cdimascio/express-openapi-validator.svg?style=social)](https://twitter.com/intent/tweet?text=Check%20out%20express-openapi-validator%20by%20%40CarmineDiMascio%20https%3A%2F%2Fgithub.com%2Fcdimascio%2Fexpress-openapi-validator%20%F0%9F%91%8D)

[Express 5](https://expressjs.com/en/5x/api.html) support available in `>=v5.5.0`!

[OAS 3.1](https://github.com/cdimascio/express-openapi-validator/pull/882) support available in `>=v5.4.0`!

[NestJS](https://github.com/cdimascio/express-openapi-validator/tree/master/examples/9-nestjs)
[Koa](https://github.com/cdimascio/express-openapi-validator/tree/lerna-fastify/packages/koa-openapi-validator) and [Fastify](https://github.com/cdimascio/express-openapi-validator/tree/lerna-fastify/packages/fastify-openapi-validator) now available! 🚀


## Install

```shell
npm install express-openapi-validator
```

## Usage

1. Require/import the openapi validator

```javascript
const OpenApiValidator = require('express-openapi-validator');
```

or

```javascript
import * as OpenApiValidator from 'express-openapi-validator';
```

2. Install the middleware

```javascript
app.use(
  OpenApiValidator.middleware({
    apiSpec: './openapi.yaml',
    validateRequests: true, // (default)
    validateResponses: true, // false by default
  }),
);
```

3. Register an error handler

```javascript
app.use((err, req, res, next) => {
  // format error
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
  });
});
```

_**Important:** Ensure express is configured with all relevant body parsers. Body parser middleware functions must be specified prior to any validated routes. See an [example](#example-express-api-server)_.

## [Documentation](https://cdimascio.github.io/express-openapi-validator-documentation/)

See the [doc](https://cdimascio.github.io/express-openapi-validator-documentation/) for complete documenation

_deprecated_ [legacy doc](https://github.com/cdimascio/express-openapi-validator/wiki) 

## License

[MIT](LICENSE)

<a href="https://www.buymeacoffee.com/m97tA5c" target="_blank"><img src="https://bmc-cdn.nyc3.digitaloceanspaces.com/BMC-button-images/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: auto !important;width: auto !important;" ></a>
