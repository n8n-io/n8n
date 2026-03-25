# pdf-parse

**Pure javascript cross-platform module to extract texts from PDFs.**

[![version](https://img.shields.io/npm/v/pdf-parse.svg)](https://www.npmjs.org/package/pdf-parse)
[![downloads](https://img.shields.io/npm/dt/pdf-parse.svg)](https://www.npmjs.org/package/pdf-parse)
[![node](https://img.shields.io/node/v/pdf-parse.svg)](https://nodejs.org/)
[![status](https://gitlab.com/autokent/pdf-parse/badges/master/pipeline.svg)](https://gitlab.com/autokent/pdf-parse/pipelines)

## Similar Packages
* [pdf2json](https://www.npmjs.com/package/pdf2json) buggy, no support anymore, memory leak, throws non-catchable fatal errors
* [j-pdfjson](https://www.npmjs.com/package/j-pdfjson) fork of pdf2json
* [pdf-parser](https://github.com/dunso/pdf-parse) buggy, no tests
* [pdfreader](https://www.npmjs.com/package/pdfreader) using pdf2json
* [pdf-extract](https://www.npmjs.com/package/pdf-extract) not cross-platform using xpdf

## Installation
`npm install pdf-parse`
 
## Basic Usage - Local Files

```js
const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('path to PDF file...');

pdf(dataBuffer).then(function(data) {

	// number of pages
	console.log(data.numpages);
	// number of rendered pages
	console.log(data.numrender);
	// PDF info
	console.log(data.info);
	// PDF metadata
	console.log(data.metadata); 
	// PDF.js version
	// check https://mozilla.github.io/pdf.js/getting_started/
	console.log(data.version);
	// PDF text
	console.log(data.text); 
        
});
```

## Basic Usage - HTTP
You can use [crawler-request](https://www.npmjs.com/package/crawler-request) which uses the `pdf-parse`

## Exception Handling

```js
const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('path to PDF file...');

pdf(dataBuffer).then(function(data) {
	// use data
})
.catch(function(error){
	// handle exceptions
})
```

## Extend
* v1.0.9 and above break pagerender callback [changelog](https://gitlab.com/autokent/pdf-parse/blob/master/CHANGELOG)
* If you need another format like json, you can change page render behaviour with a callback
* Check out https://mozilla.github.io/pdf.js/

```js
// default render callback
function render_page(pageData) {
    //check documents https://mozilla.github.io/pdf.js/
    let render_options = {
        //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
        normalizeWhitespace: false,
        //do not attempt to combine same line TextItem's. The default value is `false`.
        disableCombineTextItems: false
    }

    return pageData.getTextContent(render_options)
	.then(function(textContent) {
		let lastY, text = '';
		for (let item of textContent.items) {
			if (lastY == item.transform[5] || !lastY){
				text += item.str;
			}  
			else{
				text += '\n' + item.str;
			}    
			lastY = item.transform[5];
		}
		return text;
	});
}

let options = {
    pagerender: render_page
}

let dataBuffer = fs.readFileSync('path to PDF file...');

pdf(dataBuffer,options).then(function(data) {
	//use new format
});
```

## Options

```js
const DEFAULT_OPTIONS = {
	// internal page parser callback
	// you can set this option, if you need another format except raw text
	pagerender: render_page,
	// max page number to parse
    max: 0,
    //check https://mozilla.github.io/pdf.js/getting_started/
    version: 'v1.10.100'
}
```
### *pagerender* (callback)
If you need another format except raw text.  

### *max* (number)
Max number of page to parse. If the value is less than or equal to 0, parser renders all pages.  

### *version* (string, pdf.js version)
check [pdf.js](https://mozilla.github.io/pdf.js/getting_started/)

* `'default'`
* `'v1.9.426'`
* `'v1.10.100'`
* `'v1.10.88'`
* `'v2.0.550'`

>*default* uses version *v1.10.100*   
>[mozilla.github.io/pdf.js](https://mozilla.github.io/pdf.js/getting_started/#download)

## Test
* `mocha` or `npm test`
* Check [test folder](https://gitlab.com/autokent/pdf-parse/tree/master/test) and [quickstart.js](https://gitlab.com/autokent/pdf-parse/blob/master/quickstart.js) for extra usages.

## Support
I use this package actively myself, so it has my top priority. You can chat on WhatsApp about any infos, ideas and suggestions.

[![WhatsApp](https://img.shields.io/badge/style-chat-green.svg?style=flat&label=whatsapp)](https://api.whatsapp.com/send?phone=905063042480&text=Hi%2C%0ALet%27s%20talk%20about%20pdf-parse)

### Submitting an Issue
If you find a bug or a mistake, you can help by submitting an issue to [GitLab Repository](https://gitlab.com/autokent/pdf-parse/issues)

### Creating a Merge Request
GitLab calls it merge request instead of pull request.  

* [A Guide for First-Timers](https://about.gitlab.com/2016/06/16/fearless-contribution-a-guide-for-first-timers/)
* [How to create a merge request](https://docs.gitlab.com/ee/gitlab-basics/add-merge-request.html)
* Check [Contributing Guide](https://gitlab.com/autokent/pdf-parse/blob/master/CONTRIBUTING.md) 

## License
[MIT licensed](https://gitlab.com/autokent/pdf-parse/blob/master/LICENSE) and all it's dependencies are MIT or BSD licensed.
