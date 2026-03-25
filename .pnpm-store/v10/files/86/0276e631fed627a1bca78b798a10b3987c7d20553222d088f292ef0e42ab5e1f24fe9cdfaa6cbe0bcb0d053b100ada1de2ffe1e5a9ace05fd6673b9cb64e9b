# ISO-639-1
[![NPM Version][npm-image]][npm-url]
[![Build Status][travis-image]][travis-url]
[![Download Count][download-url]][npm-url]

[travis-image]: https://travis-ci.org/meikidd/iso-639-1.svg?branch=master
[travis-url]: https://travis-ci.org/meikidd/iso-639-1
[npm-image]: https://img.shields.io/npm/v/iso-639-1.svg?style=flat-square
[npm-url]: https://npmjs.org/package/iso-639-1
[download-url]: https://img.shields.io/npm/dt/iso-639-1.svg?style=flat-square


Simple interface for [ISO-639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) language codes

## Installation

```
npm install iso-639-1
```

## Usage

### Node.js

```javascript
const ISO6391 = require('iso-639-1');
console.log(ISO6391.getName('en')); // 'English'
```

### ES Module

```javascript
import ISO6391 from 'iso-639-1';
console.log(ISO6391.getName('en')); // 'English'
```

### Browsers

HTML

```html
<script type="text/javascript" src="./node_modules/iso-639-1/build/index.js"></script>
```

Visit global variable ISO6391 in js

```javascript
console.log(ISO6391.getName('en')); // 'English'
```

## Methods

### getName(code)
  - @param code {string}
  - @return {string}

Lookup language english name by code

### getAllNames()
  - @return {array}

Get array of all language english names

### getNativeName(code)
  - @param code {string}
  - @return {string}

Lookup language native name by code

### getAllNativeNames()
  - @return {array}

Get array of all language native names


### getCode(name)
  - @param name {string}
  - @return {string}

Lookup code by english name or native name

### getAllCodes()
  - @return {array}

Get array of all codes

### validate(code)
  - @param code {string}
  - @return {boolean}

Check whether the given code is in the list of [ISO-639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)

### getLanguages(codes)
  - @param codes {array}
  - @return {array}

Get the array of the language objects by the given codes

## Example

```
const ISO6391 = require('iso-639-1')

console.log(ISO6391.getName('zh')) // 'Chinese'
console.log(ISO6391.getNativeName('zh')) // '中文'

console.log(ISO6391.getAllNames()) // ['Afar','Abkhaz', ... ,'Zulu']
console.log(ISO6391.getAllNativeNames()) //['Afaraf','аҧсуа бызшәа', ... ,'isiZulu' ]

console.log(ISO6391.getCode('Chinese')) // 'zh'
console.log(ISO6391.getCode('中文')) // 'zh'

console.log(ISO6391.getAllCodes()) //['aa','ab',...,'zu']

console.log(ISO6391.validate('en')) // true
console.log(ISO6391.validate('xx')) // false

console.log(ISO6391.getLanguages(['en', 'zh']))
// [{code:'en',name:'English',nativeName:'English'},{code:'zh',name:'Chinese',nativeName:'中文'}]

```
