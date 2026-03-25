# samlify &middot;

[![Build Status](https://img.shields.io/circleci/build/github/tngan/samlify?style=for-the-badge&logo=circleci)](https://app.circleci.com/pipelines/github/tngan/samlify)
[![npm version](https://img.shields.io/npm/v/samlify.svg?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/samlify)
[![NPM](https://img.shields.io/npm/dm/samlify.svg?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/samlify)
[![Coverage Status](https://img.shields.io/coveralls/tngan/samlify/master.svg?style=for-the-badge&logo=coveralls)](https://coveralls.io/github/tngan/samlify?branch=master)

Highly configuarable Node.js SAML 2.0 library for Single Sign On

## Welcome PRs

Welcome all PRs for maintaining this project, or provide a link to the repositories especially for use cases alongside with different frameworks.

### Installation

Multiple schema validators are currently supported by our system, with couple validator modules available and the option to create custom ones. It is essential to utilize the setSchemaValidator function at the outset to avoid errors.

```js
import * as samlify from 'samlify';
import * as validator from '@authenio/samlify-xsd-schema-validator';
// import * as validator from '@authenio/samlify-validate-with-xmllint';
// import * as validator from '@authenio/samlify-node-xmllint';

samlify.setSchemaValidator(validator);
```

Now you can create your own schema validator and even suppress it but you have to take the risk for accepting malicious response.

```typescript
samlify.setSchemaValidator({
  validate: (response: string) => {
    /* implment your own or always returns a resolved promise to skip */
    return Promise.resolve('skipped');
  }
});
```

For those using Windows, `windows-build-tools` should be installed globally before installing samlify if you are using `libxml` validator.

```console
yarn global add windows-build-tools
```

### Development

This project is now developed using TypeScript, also support Yarn which is a new package manager.

```console
yarn global add typescript
yarn
```

### Get Started

```javascript
const saml = require('samlify');
```

See full documentation [here](https://samlify.js.org/)

### Example

[react-samlify](https://github.com/passify/react-samlify) SP example powered by React, TypeScript and Webpack

### Talks

[An introduction to Single Sign On](http://www.slideshare.net/TonyNgan/an-introduction-of-single-sign-on)

### License

[MIT](LICENSE)

### Copyright

Copyright (C) 2016-present Tony Ngan, released under the MIT License.
