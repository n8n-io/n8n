file-uri-to-path
================
### Convert a `file:` URI to a file path
[![Build Status](https://travis-ci.org/TooTallNate/file-uri-to-path.svg?branch=master)](https://travis-ci.org/TooTallNate/file-uri-to-path)

Accepts a `file:` URI and returns a regular file path suitable for use with the
`fs` module functions.


Installation
------------

Install with `npm`:

``` bash
$ npm install file-uri-to-path
```


Example
-------

``` js
var uri2path = require('file-uri-to-path');

uri2path('file://localhost/c|/WINDOWS/clock.avi');
// "c:\\WINDOWS\\clock.avi"

uri2path('file:///c|/WINDOWS/clock.avi');
// "c:\\WINDOWS\\clock.avi"

uri2path('file://localhost/c:/WINDOWS/clock.avi');
// "c:\\WINDOWS\\clock.avi"

uri2path('file://hostname/path/to/the%20file.txt');
// "\\\\hostname\\path\\to\\the file.txt"

uri2path('file:///c:/path/to/the%20file.txt');
// "c:\\path\\to\\the file.txt"
```


API
---

### fileUriToPath(String uri) → String



License
-------

(The MIT License)

Copyright (c) 2014 Nathan Rajlich &lt;nathan@tootallnate.net&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
