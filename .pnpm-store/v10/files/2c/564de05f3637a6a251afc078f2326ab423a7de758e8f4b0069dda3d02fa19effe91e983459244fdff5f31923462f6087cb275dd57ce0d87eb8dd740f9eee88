# ADM-ZIP for NodeJS with added support for electron original-fs

ADM-ZIP is a pure JavaScript implementation for zip data compression for [NodeJS](https://nodejs.org/).

# Installation

With [npm](https://www.npmjs.com/) do:

    $ npm install adm-zip

## What is it good for?

The library allows you to:

-   decompress zip files directly to disk or in memory buffers
-   compress files and store them to disk in .zip format or in compressed buffers
-   update content of/add new/delete files from an existing .zip

# Dependencies

There are no other nodeJS libraries that ADM-ZIP is dependent of

# Examples

## Basic usage

```javascript
var AdmZip = require("adm-zip");

// reading archives
var zip = new AdmZip("./my_file.zip");
var zipEntries = zip.getEntries(); // an array of ZipEntry records

zipEntries.forEach(function (zipEntry) {
    console.log(zipEntry.toString()); // outputs zip entries information
    if (zipEntry.entryName == "my_file.txt") {
        console.log(zipEntry.getData().toString("utf8"));
    }
});
// outputs the content of some_folder/my_file.txt
console.log(zip.readAsText("some_folder/my_file.txt"));
// extracts the specified file to the specified location
zip.extractEntryTo(/*entry name*/ "some_folder/my_file.txt", /*target path*/ "/home/me/tempfolder", /*maintainEntryPath*/ false, /*overwrite*/ true);
// extracts everything
zip.extractAllTo(/*target path*/ "/home/me/zipcontent/", /*overwrite*/ true);

// creating archives
var zip = new AdmZip();

// add file directly
var content = "inner content of the file";
zip.addFile("test.txt", Buffer.from(content, "utf8"), "entry comment goes here");
// add local file
zip.addLocalFile("/home/me/some_picture.png");
// get everything as a buffer
var willSendthis = zip.toBuffer();
// or write everything to disk
zip.writeZip(/*target file name*/ "/home/me/files.zip");

// ... more examples in the wiki
```

For more detailed information please check out the [wiki](https://github.com/cthackers/adm-zip/wiki).

[![Build Status](https://travis-ci.org/cthackers/adm-zip.svg?branch=master)](https://travis-ci.org/cthackers/adm-zip)
