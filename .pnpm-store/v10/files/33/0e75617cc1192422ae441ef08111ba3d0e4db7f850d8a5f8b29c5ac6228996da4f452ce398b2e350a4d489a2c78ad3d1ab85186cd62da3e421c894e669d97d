# Encoding

**encoding** is a simple wrapper around [iconv-lite](https://github.com/ashtuchkin/iconv-lite/) to convert strings from one encoding to another.

[![Build Status](https://secure.travis-ci.org/andris9/encoding.svg)](http://travis-ci.org/andris9/Nodemailer)
[![npm version](https://badge.fury.io/js/encoding.svg)](http://badge.fury.io/js/encoding)

Initially _encoding_ was a wrapper around _node-iconv_ (main) and _iconv-lite_ (fallback) and was used as the encoding layer for Nodemailer/mailparser. Somehow it also ended up as a dependency for a bunch of other project, none of these actually using _node-iconv_. The loading mechanics caused issues for front-end projects and Nodemailer/malparser had moved on, so _node-iconv_ was removed.

## Install

Install through npm

    npm install encoding

## Usage

Require the module

    var encoding = require("encoding");

Convert with encoding.convert()

    var resultBuffer = encoding.convert(text, toCharset, fromCharset);

Where

-   **text** is either a Buffer or a String to be converted
-   **toCharset** is the characterset to convert the string
-   **fromCharset** (_optional_, defaults to UTF-8) is the source charset

Output of the conversion is always a Buffer object.

Example

    var result = encoding.convert("ÕÄÖÜ", "Latin_1");
    console.log(result); //<Buffer d5 c4 d6 dc>

## License

**MIT**
