# Swagger UI Express

| Statements                  | Branches                | Functions                 | Lines                |
| --------------------------- | ----------------------- | ------------------------- | -------------------- |
| ![Statements](https://img.shields.io/badge/Coverage-89.87%25-yellow.svg) | ![Branches](https://img.shields.io/badge/Coverage-78.57%25-red.svg) | ![Functions](https://img.shields.io/badge/Coverage-91.67%25-brightgreen.svg) | ![Lines](https://img.shields.io/badge/Coverage-89.74%25-yellow.svg)    |

This module allows you to serve auto-generated [swagger-ui](https://swagger.io/tools/swagger-ui/) generated API docs from express, based on a `swagger.json` file. The result is living documentation for your API hosted from your API server via a route.

Swagger version is pulled from npm module swagger-ui-dist. Please use a lock file or specify the version of swagger-ui-dist you want to ensure it is consistent across environments.

You may be also interested in:

* [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc): Allows you to markup routes
with jsdoc comments. It then produces a full swagger yml config dynamically, which you can pass to this module to produce documentation. See below under the usage section for more info.
* [swagger tools](https://github.com/swagger-api): Various tools, including swagger editor, swagger code gen etc.

## Usage

Install using npm:

```bash
$ npm install swagger-ui-express
```

Express setup `app.js`
```javascript
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
```

or if you are using Express router

```javascript
const router = require('express').Router();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

router.use('/api-docs', swaggerUi.serve);
router.get('/api-docs', swaggerUi.setup(swaggerDocument));
```

Open http://`<app_host>`:`<app_port>`/api-docs in your browser to view the documentation.

If you want to set up routing based on the swagger document checkout [swagger-express-router](https://www.npmjs.com/package/swagger-express-router)

### [swagger-jsdoc](https://www.npmjs.com/package/swagger-jsdoc)

If you are using swagger-jsdoc simply pass the swaggerSpec into the setup function:

```javascript
// Initialize swagger-jsdoc -> returns validated swagger spec in json format
const swaggerSpec = swaggerJSDoc(options);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

### Swagger Explorer

By default the Swagger Explorer bar is hidden, to display it pass true as the 'explorer' property of the options to the setup function:

```javascript
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

var options = {
  explorer: true
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
```

### Custom swagger options

To pass custom options e.g. validatorUrl, to the SwaggerUi client pass an object as the 'swaggerOptions' property of the options to the setup function:

```javascript
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

var options = {
  swaggerOptions: {
    validatorUrl: null
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
```

For all the available options, refer to [Swagger UI Configuration](https://github.com/swagger-api/swagger-ui/blob/master/docs/usage/configuration.md)

### Custom CSS styles

To customize the style of the swagger page, you can pass custom CSS as the 'customCss' property of the options to the setup function.

E.g. to hide the swagger header:

```javascript
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

var options = {
  customCss: '.swagger-ui .topbar { display: none }'
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
```

### Custom CSS styles from Url

You can also pass the url to a custom css file, the value must be the public url of the file and can be relative or absolute to the swagger path.

```javascript
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

var options = {
  customCssUrl: '/custom.css'
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
```

You can also pass an array of css urls to load multiple css files.

```javascript
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

var options = {
  customCssUrl: [
    '/custom.css',
    'https://example.com/other-custom.css'
  ]
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
```

### Custom JS

If you would like to have full control over your HTML you can provide your own javascript file, value accepts absolute or relative path. Value must be the public url of the js file.

```javascript
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

var options = {
  customJs: '/custom.js'
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
```

You can also pass an array of js urls to load multiple js files.

```javascript
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

var options = {
  customJs: [
    '/custom.js',
    'https://example.com/other-custom.js'
  ]
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
```

It is also possible to add inline javascript, either as string or array of string.

```javascript
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

var options = {
  customJsStr: 'console.log("Hello World")'
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
```

```javascript
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

var options = {
  customJsStr: [
    'console.log("Hello World")',
    `
    var x = 1
    console.log(x)
    `
  ]
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
```

### Load swagger from url

To load your swagger from a url instead of injecting the document, pass `null` as the first parameter, and pass the relative or absolute URL as the 'url' property to 'swaggerOptions' in the setup function.

```javascript
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');

var options = {
  swaggerOptions: {
    url: 'http://petstore.swagger.io/v2/swagger.json'
  }
}

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, options));
```

To load multiple swagger documents from urls as a dropdown in the explorer bar, pass an array of object with `name` and `url` to 'urls' property to 'swaggerOptions' in the setup function.

```javascript
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');

var options = {
  explorer: true,
  swaggerOptions: {
    urls: [
      {
        url: 'http://petstore.swagger.io/v2/swagger.json',
        name: 'Spec1'
      },
      {
        url: 'http://petstore.swagger.io/v2/swagger.json',
        name: 'Spec2'
      }
    ]
  }
}

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, options));
```

Make sure 'explorer' option is set to 'true' in your setup options for the dropdown to be visible.


### Load swagger from yaml file

To load your swagger specification yaml file you need to use a module able to convert yaml to json; for instance `yaml`.

    npm install yaml

```javascript
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const fs = require("fs")
const YAML = require('yaml')

const file  = fs.readFileSync('./swagger.yaml', 'utf8')
const swaggerDocument = YAML.parse(file)

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
```


### Modify swagger file on the fly before load

To dynamically set the host, or any other content, in the swagger file based on the incoming request object you may pass the json via the req object; to achieve this just do not pass the the swagger json to the setup function and it will look for `swaggerDoc` in the `req` object.

```javascript
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

var options = {}

app.use('/api-docs', function(req, res, next){
    swaggerDocument.host = req.get('host');
    req.swaggerDoc = swaggerDocument;
    next();
}, swaggerUi.serveFiles(swaggerDocument, options), swaggerUi.setup());
```

### Two swagger documents

To run 2 swagger ui instances with different swagger documents, use the serveFiles function instead of the serve function. The serveFiles function has the same signature as the setup function.

```javascript
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocumentOne = require('./swagger-one.json');
const swaggerDocumentTwo = require('./swagger-two.json');

var options = {}

app.use('/api-docs-one', swaggerUi.serveFiles(swaggerDocumentOne, options), swaggerUi.setup(swaggerDocumentOne));

app.use('/api-docs-two', swaggerUi.serveFiles(swaggerDocumentTwo, options), swaggerUi.setup(swaggerDocumentTwo));

app.use('/api-docs-dynamic', function(req, res, next){
  req.swaggerDoc = swaggerDocument;
  next();
}, swaggerUi.serveFiles(), swaggerUi.setup());
```

### Link to Swagger document

To render a link to the swagger document for downloading within the swagger ui - then serve the swagger doc as an endpoint and use the url option to point to it:

```javascript
const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

var options = {
    swaggerOptions: {
        url: "/api-docs/swagger.json",
    },
}
app.get("/api-docs/swagger.json", (req, res) => res.json(swaggerDocument));
app.use('/api-docs', swaggerUi.serveFiles(null, options), swaggerUi.setup(null, options));
```


## Requirements

* Node v0.10.32 or above
* Express 4 or above

## Testing

* Install phantom
* `npm install`
* `npm test`
