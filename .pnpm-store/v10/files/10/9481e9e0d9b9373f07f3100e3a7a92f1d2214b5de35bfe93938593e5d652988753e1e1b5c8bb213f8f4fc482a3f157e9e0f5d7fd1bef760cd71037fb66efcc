## FileList

A FileList is a lazy-evaluated list of files. When given a list
of glob patterns for possible files to be included in the file
list, instead of searching the file structures to find the files,
a FileList holds the pattern for latter use.

This allows you to define a FileList to match any number of
files, but only search out the actual files when then FileList
itself is actually used. The key is that the first time an
element of the FileList/Array is requested, the pending patterns
are resolved into a real list of file names.

### Usage

Add files to the list with the `include` method. You can add glob
patterns, individual files, or RegExp objects. When the Array
methods are invoked on the FileList, these items are resolved to
an actual list of files.

```javascript
var fl = new FileList();
fl.include('test/*.js');
fl.exclude('test/helpers.js');
```

Use the `exclude` method to override inclusions. You can use this
when your inclusions are too broad.

### Array methods

FileList has lazy-evaluated versions of most of the array
methods, including the following:

* join
* pop
* push
* concat
* reverse
* shift
* unshift
* slice
* splice
* sort
* filter
* forEach
* some
* every
* map
* indexOf
* lastIndexOf
* reduce
* reduceRight

When you call one of these methods, the items in the FileList
will be resolved to the full list of files, and the method will
be invoked on that result.

### Special `length` method

`length`: FileList includes a length *method* (instead of a
property) which returns the number of actual files in the list
once it's been resolved.

### FileList-specific methods

`include`: Add a filename/glob/regex to the list

`exclude`: Override inclusions by excluding a filename/glob/regex

`resolve`: Resolve the items in the FileList to the full list of
files. This method is invoked automatically when one of the array
methods is called.

`toArray`: Immediately resolves the list of items, and returns an
actual array of filepaths.

`clearInclusions`: Clears any pending items -- must be used
before resolving the list.

`clearExclusions`: Clears the list of exclusions rules.



