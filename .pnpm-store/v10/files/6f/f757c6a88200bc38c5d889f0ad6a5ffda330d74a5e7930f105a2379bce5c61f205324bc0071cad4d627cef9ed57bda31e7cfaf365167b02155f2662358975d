# node-readfiles
A lightweight node.js module to recursively read files in a directory using ES6 Promises.

## Installation

    npm install node-readfiles

## Usage

You can safely add `readfiles` anywhere in your project.

```javascript
var readfiles = require('node-readfiles');
```

### _Promise(files):_ readfiles(dir, [options], [callback])
Asynchronusly read the files in a directory returning a **Promise**.

#### dir
A relative or absolute path of the directory to read files.

#### options

An optional object parameter with the following properties:

* **reverse**: a bollean value that reverses the order of the list of files before traversing them (defaults to false)
* **filenameFormat**: one of `readfiles.FULL_PATH`, `readfiles.RELATIVE`, or `readfiles.FILENAME`, wether the callback's returns the full-path, relative-path or only the filenames of the traversed files. (default is `readfiles.RELATIVE`)
* **rejectOnError**: a bollean value wether to stop and trigger the "doneCallback" when an error occurs (defaults to true)
* **filter**: a string, or an array of strings of path expression that match the files being read (defaults to '**')
  * `?` matches one character
  * `*` matches zero or more characters
  * `**` matches zero or more 'directories' in a path
* **readContents**: a boolean value wether to read the file contents when traversing the files <sup>[\[1\]](#read-files)</sup> (defaults to true)
* **encoding**: a string with the encoding used when reading a file (defaults to 'utf8')
* **depth**: an integer value which limits the number sub-directories levels to traverse for the given path where `-1` is infinte, and `0` is none (defaults to -1)
* **hidden**: a boolean value wether to exclude hidden files prefixed with a `.` (defaults to true)


### callback(err, filename, content, stat)

The optional callback function is triggered everytime a file is found. If there's an error while reading the file the `err` parameter will contain the error that occured, When `readContents` is true, the `contents` parameter will be populated with the contents of the file encoded using the `encoding` option. For convenience the `stat` result object is passed to the callback for you to use.

<span id="read-files">[1]</span> The `contents` parameter will be `null` when the `readContents` option is `false`.


##### Asynchronous Callback
When working with asynchronous operations, you can simply return a `function (next) { ... }` which will enabled you to completed your asynchronous operation until you call `next()`. 

```javascript
readfiles('/path/to/dir/', function (err, content, filename, stat) {
  if (err) throw err;
  return function (next) {
    setTimeout(function () {
      console.log('File ' + filename);
      next();
    }, 3000);
  };
});
```


### _Promise(files)_

When calling `readfiles`, an ES6 Promise is returned with an array of all the files that were found. You can then call `then` or `catch` to see if `readfiles` encountered an error.

```javascript
var readfiles = require('node-readfiles');

readfiles('/path/to/dir/', function (err, filename, contents) {
  if (err) throw err;
  console.log('File ' + filename + ':');
  console.log(content);
}).then(function (files) {
  console.log('Read ' + files.length + ' file(s)');
}).catch(function (err) {
  console.log('Error reading files:', err.message);
});
```

## Examples

The default behavior, is to recursively list all files in a directory. By default `readfiles` will exclude all dot files.

```javascript
readfiles('/path/to/dir/', function (err, filename, contents) {
  if (err) throw err;
  console.log('File ' + filename + ':');
  console.log(content);
}).then(function (files) {
  console.log('Read ' + files.length + ' file(s)');
  console.log(files.join('\n'));
});
```

Read all files in a directory, excluding sub-directories.

```javascript
readfiles('/path/to/dir/', {
  depth: 0
}, function (err, content, filename) {
  if (err) throw err;
  console.log('File ' + filename + ':');
  console.log(content);
}).then(function (files) {
  console.log('Read ' + files.length + ' file(s)');
  console.log(files.join('\n'));
});
```

The above can also be accomplished using the `filter` option.

```javascript
readfiles('/path/to/dir/', {
  filter: '*' // instead of the default '**'
}, function (err, content, filename) {
  if (err) throw err;
  console.log('File ' + filename + ':');
  console.log(content);
}).then(function (files) {
  console.log('Read ' + files.length + ' file(s)');
  console.log(files.join('\n'));
});
```

Recursively read all files with "txt" extension in a directory and display the contents.

```javascript
readfiles('/path/to/dir/', {
  filter: '*.txt'
}, function (err, content, filename) {
  if (err) throw err;
  console.log('File ' + filename + ':');
  console.log(content);
}).then(function (files) {
  console.log('Read ' + files.length + ' file(s)');
});

```

Recursively read all files with that match "t?t" in a directory and display the contents.

```javascript
readfiles('/path/to/dir/', {
  filter: '*.t?t'
}, function (err, content, filename) {
  if (err) throw err;
  console.log('File ' + filename + ':');
  console.log(content);
}).then(function (files) {
  console.log('Read ' + files.length + ' file(s)');
});

```

Recursively list all json files in a directory including all sub-directories, without reading the files.

```javascript
readfiles('/path/to/dir/', {
  filter: '*.json',
  readContents: false
}, function (err, content, filename) {
  if (err) throw err;
  console.log('File ' + filename);
});

```

## License
MIT licensed (See LICENSE.txt)
