# xmllint-wasm

libxml2's xmllint tool compiled to WebAssembly using Emscripten, to be used
in Node.js applications in environments where you can't or don't want to
depend on the native library.

This is a fork of Alan Zakai's amazing work at
[kripken/xml.js](https://github.com/kripken/xml.js)
(be sure to also check out his [blog post](http://mozakai.blogspot.com/2012/03/howto-port-cc-library-to-javascript.html) about
that exact project).
This fork continues the original build with some neat updates
as well as somewhat opinionated breaking changes.

Currently, the library only works in Node.js, but browser support could be
added if there's a demand for it. I'll probably stick to wasm builds only in
this repository, though, so if you need an asm.js build for browsers that
don't yet support wasm, you should probably go with the original project
instead.

## Overview of changes made to the original project

* libxml2 version is upgraded to v2.9.12
* The output is wasm instead of asm.js
* Target environment is Node 10.5 or newer instead of the browser
* Library size is quite a bit smaller, the wasm file and wrapper js files
  weigh about 860K combined
* There are some changes to the API, which is described in more detail
  below. Overall this project behaves more like a library that you'd call from
  a JS application, instead of like a command-line tool that xmllint normally is.

## Installation
```sh
npm i xmllint-wasm
```
The library uses Node.js [Worker threads](https://nodejs.org/api/worker_threads.html)
to isolate the Emscripten wrapper from your main process (so that
when it calls process.exit your whole server won't go down), which is
why Node >= 10.5 is required.

## API

Type definitions at [index.d.ts](index.d.ts).

### Basic usage
```javascript
const {validateXML} = require('xmllint-wasm');

async function example() {
  const [myXMLFile, mySchemaFile] = await Promise.all([
    fs.promises.readFile('./my-xml-file.xml', 'utf8'),
    fs.promises.readFile('./my-schema-file.xml', 'utf8'),
  ])

  const validationResult = await validateXML({
    xml: [{
      fileName: 'my-xml-file.xml',
      contents: myXMLFile,
    }],
    // All the schema files that are required to validate the documents.
    // The main XSD should be first in the array, followed by its possible dependencies.
    schema: [mySchemaFile],
  });
  
  if (validationResult.valid) {
    console.log('There were no errors!')
  } else {
    console.warn(validationResult.errors);
  }
}

```
Giving explicit fileNames is optional (you can just pass the file contents
as string instead), but might help with mapping the correct error to a correct
file if you are validating multiple files at once. 

If you want the output to contain the (formatted) input XML, add
`normalization: 'format'` or `normalization: 'c14n'` to the options.

The return value is a Promise. Even though the xmllint command-line tool
returns with a non-zero exit code if the xml fails to validate, we
don't reject the Promise if there are validation errors as long as
the validation completes successfully. Unexpected errors, like
a syntax error in schema file, do reject the Promise.

The Promise resolved with a object like the following

```javascript

{
  valid: false,
  errors: [
    {
      // Raw output from running xmllint for
      // this particular error/line of the output
      rawMessage: "my-xml-file.xml:21: element quantity: Schemas validity error : Element 'quantity': [facet 'maxExclusive'] The value '1000' must be less than '100'.",
      // Error message without the location info
      message: "element quantity: Schemas validity error : Element 'quantity': [facet 'maxExclusive'] The value '1000' must be less than '100'.",
      // Error location info, if we managed to parse that from the output (null otherwise)
      loc: { fileName: 'my-xml-file.xml', lineNumber: 21 }
    }
  ],
  // Raw output string from running xmllint
  rawOutput: "my-xml-file.xml:21: element quantity: Schemas validity error ...",
  normalized: ""
}
```

### Usage in browsers

Check [./browser-demo/html-data](./browser-demo/html-data) index.html and
logic.js for a full example. Import the browser version, index-browser.js as an
EcmaScript module and use like you would use the Node.js version.

Works out of the box in latest Chrome, Edge and Safari.  
Firefox, however, does not yet support Worker modules yet (tracked in issue
[1247687](https://bugzilla.mozilla.org/show_bug.cgi?id=1247687)), which would be
required by the implementation in this library.
To get Firefox to work, you'll need to use a bundler like [Parcel](https://parceljs.org/) or
Webpack to bundle the sources from modules to regular old scripts.

```javascript
import * as xmllint from './node_modules/xmllint/index-browser.mjs';
```

## Building xmllint from source

Clone the project (including the submodulem with git `--recursive`) and build.  
[Install emscripten](https://emscripten.org/docs/getting_started/downloads.html#installation-instructions-using-the-emsdk-recommended)
and source their shell env.  
Finally, run the commands for Emscripten build

```sh
  ./script/clean
  ./script/libxml2
  ./script/compile
  ./script/test
```
There might also be some other build dependencies not listed here, I'm afraid.
