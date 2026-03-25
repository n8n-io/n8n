# replacestream

A [node.js transform stream](https://nodejs.org/api/stream.html#stream_class_stream_transform) for basic streaming text search/replacement friendy with chunk boundary.

[![build status](https://secure.travis-ci.org/eugeneware/replacestream.svg)](http://travis-ci.org/eugeneware/replacestream)
[![Coverage Status](https://coveralls.io/repos/eugeneware/replacestream/badge.svg?branch=master)](https://coveralls.io/r/eugeneware/replacestream?branch=master)

## Installation

Install via [npm](https://www.npmjs.com/):

``` shell
$ npm install replacestream
```

## Examples

### Search and replace over a test file

Say we want to do a search and replace over the following file:

```
// happybirthday.txt
Happy birthday to you!
Happy birthday to you!
Happy birthday to dear Liza!
Happy birthday to you!
```

``` js
var replaceStream = require('replacestream')
  , fs = require('fs')
  , path = require('path');

// Replace all the instances of 'birthday' with 'earthday'
fs.createReadStream(path.join(__dirname, 'happybirthday.txt'))
  .pipe(replaceStream('birthday', 'earthday'))
  .pipe(process.stdout);
```

Running this will print out:

``` bash
$ node simple.js
Happy earthday to you!
Happy earthday to you!
Happy earthday to dear Liza!
Happy earthday to you!
```

You can also limit the number of replaces to first ```n```:

``` js
// Replace the first 2 of the instances of 'birthday' with 'earthday'
fs.createReadStream(path.join(__dirname, 'happybirthday.txt'))
  .pipe(replaceStream('birthday', 'earthday', { limit: 2 } ))
  .pipe(process.stdout);
```

Which would output:

``` bash
$ node simple.js
Happy earthday to you!
Happy earthday to you!
Happy birthday to dear Liza!
Happy birthday to you!
```

And you can also pass in a replacement function which will get called for each
replacement:

``` js
// Replace the word 'Happy' with a different word each time
var words = ['Awesome', 'Good', 'Super', 'Joyous'];
function replaceFn(match) {
  return words.shift();
}
fs.createReadStream(path.join(__dirname, 'happybirthday.txt'))
  .pipe(replaceStream('Happy', replaceFn))
  .pipe(process.stdout);
```

Which would output:

``` bash
$ node simple.js
Awesome birthday to you!
Good birthday to you!
Super birthday to dear Liza!
Joyous birthday to you!
```

### Search and replace with Regular Expressions

Here's the same example, but with RegEx:

```
// happybirthday.txt
Happy birthday to you!
Happy birthday to you!
Happy birthday to dear Liza!
Happy birthday to you!
```

``` js
var replaceStream = require('replacestream')
  , fs = require('fs')
  , path = require('path');

// Replace any word that has an 'o' with 'oh'
fs.createReadStream(path.join(__dirname, 'happybirthday.txt'))
  .pipe(replaceStream(/\w*o\w*/g, 'oh'))
  .pipe(process.stdout);
```

Running this will print out:

``` bash
$ node simple.js
Happy birthday oh oh!
Happy birthday oh oh!
Happy birthday oh dear Liza!
Happy birthday oh oh!
```

You can also insert captures using the $1 ($index) notation. This is similar the built in method [replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter).

```
// happybirthday.txt
Happy birthday to you!
Happy birthday to you!
Happy birthday to dear Liza!
Happy birthday to you!
```

``` js
var replaceStream = require('replacestream')
  , fs = require('fs')
  , path = require('path');

// Replace any word that has an 'o' with 'oh'
fs.createReadStream(path.join(__dirname, 'happybirthday.txt'))
  .pipe(replaceStream(/(dear) (Liza!)/, 'my very good and $1 friend $2'))
  .pipe(process.stdout);
```

Running this will print:

``` bash
$ node simple.js
Happy birthday to you!
Happy birthday to you!
Happy birthday to my very good and dear friend Liza!
Happy birthday to you!
```

You can also pass in a replacement function. The function will be passed parameters just like [String.prototype.replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace) (e.g. replaceFunction(match, p1, p2, offset, string)). In this case the matched string is limited to the buffer the match is found on, not the entire stream.

``` js
function replaceFn() {
  return arguments[2] + ' to ' + arguments[1]
}
fs.createReadStream(path.join(__dirname, 'happybirthday.txt'))
  .pipe(replaceStream(/(birt\w*)\sto\s(you)/g, replaceFn))
  .pipe(process.stdout);
```

Which would output:

``` bash
$ node simple.js
Happy you to birthday!
Happy you to birthday!
Happy birthday to dear Liza!
Happy you to birthday!
```

### Web server search and replace over a test file

Here's the same example, but kicked off from a HTTP server:

``` js
// server.js
var http = require('http')
  , fs = require('fs')
  , path = require('path')
  , replaceStream = require('replacestream');

var app = function (req, res) {
  if (req.url.match(/^\/happybirthday\.txt$/)) {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    fs.createReadStream(path.join(__dirname, 'happybirthday.txt'))
      .pipe(replaceStream('birthday', 'earthday'))
      .pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('File not found');
  }
};
var server = http.createServer(app).listen(3000);
```

When you request the file:
```
$ curl -i "http://localhost:3000/happybirthday.txt"
HTTP/1.1 200 OK
Content-Type: text/plain
Date: Mon, 08 Jul 2013 06:45:21 GMT
Connection: keep-alive
Transfer-Encoding: chunked

Happy earthday to you!
Happy earthday to you!
Happy earthday to dear Liza!
Happy earthday to you!
```

NB: If your readable Stream that you're piping through the `replacestream` is
paused, then you may have to call the `.resume()` method on it.

## Configuration

### Changing the encoding

You can also change the text encoding of the search and replace by setting an
encoding property on the options object:

``` js
// Replace the first 2 of the instances of 'birthday' with 'earthday'
fs.createReadStream(path.join(__dirname, 'happybirthday.txt'))
  .pipe(replaceStream('birthday', 'earthday', { limit: 2, encoding: 'ascii' } ))
  .pipe(process.stdout);
```

By default the encoding will be set to 'utf8'.

## List of options

Option        | Default   | Description
------        | -------   | -----------
limit         | Infinity  | Sets a limit on the number of times the replacement will be made. This is forced to one when a regex without the global flag is provided.
encoding      | utf8      | The text encoding used during search and replace.
maxMatchLen   | 100       | When doing cross-chunk replacing, this sets the maximum length match that will be supported.
ignoreCase    | true      | When doing string match (not relevant for regex matching) whether to do a case insensitive search.
regExpOptions | undefined | (Deprecated) When provided, these flags will be used when creating the search regexes internally. This functionality is deprecated as the flags set on the regex provided are no longer mutated if this is not provided.

## FAQ

### What does "chunk boundary friendly" mean?

It means that a replace should happen even if the string to be replaced is between streaming chunks of data. For example, say I do something like this

```js
fs.createReadStream(path.join(__dirname, 'happybirthday.txt'))
  .pipe(replaceStream('birthday', 'earthday'))
  .pipe(process.stdout);
```

Here i am trying to replace all instances of `'birthday'` with `'earthday'`. Let's say the first chunk of data that is available is `'happy birth'` and the second chunk of data available is `'day'`. In this case the replace will happen successfully, the same as it would have if the chunk contained the entire string that was to be replaced (e.g. `chunk1 = 'happy' chunk2 = 'birthday'`)

### Does that apply across more than 2 chunks? How does it work with regexes?

It does apply across multiple chunks. By default, however, the maximum match length (`maxMatchLen`) is set to 100 characters. You can increase this by adding `maxMatchLen: x` to your options:

```js
replacestream('hi', 'bye', {maxMatchLen: 1000})
```

A string the size of `maxMatchLen` will be saved in memory so it shouldn't be set too high. `maxMatchLen` is what allows us to have a match between chunks. We are saving `maxMatchLen` characters in a string (the last `maxMatchLen` characters from the previous chunks) that we prepend to the current chunk, then attempt to find a match.

As for regex it works exactly the same except you would pass a regular expression into replacestream:

```js
replacestream(/a+/, 'b')
```

## Contributing

replacestream is an **OPEN Open Source Project**. This means that:

> Individuals making significant and valuable contributions are given commit-access to the project to contribute as they see fit. This project is more like an open wiki than a standard guarded open source project.

See the [CONTRIBUTING.md](https://github.com/eugeneware/replacestream/blob/master/CONTRIBUTING.md) file for more details.

### Contributors

replacestream is only possible due to the excellent work of the following contributors:

<table><tbody>
<tr><th align="left">Eugene Ware</th><td><a href="https://github.com/eugeneware">GitHub/eugeneware</a></td></tr>
<tr><th align="left">Ryan Mehta</th><td><a href="https://github.com/mehtaphysical">GitHub/mehtaphysical</a></td></tr>
<tr><th align="left">Tim Chaplin</th><td><a href="https://github.com/tjchaplin">GitHub/tjchaplin</a></td></tr>
<tr><th align="left">Bryce Gibson</th><td><a href="https://github.com/bryce-gibson">GitHub/bryce-gibson</a></td></tr>
<tr><th align="left">Romain</th><td><a href="https://github.com/Filirom1">GitHub/Filirom1</a></td></tr>
<tr><th align="left">Shinnosuke Watanabe</th><td><a href="https://github.com/shinnn">GitHub/shinnn</a></td></tr>
<tr><th align="left">Steve Mao</th><td><a href="https://github.com/stevemao">GitHub/stevemao</a></td></tr>
<tr><th align="left">Martin Petluš</th><td><a href="https://github.com/martinpetlus">GitHub/martinpetlus</a></td></tr>
</tbody></table>
