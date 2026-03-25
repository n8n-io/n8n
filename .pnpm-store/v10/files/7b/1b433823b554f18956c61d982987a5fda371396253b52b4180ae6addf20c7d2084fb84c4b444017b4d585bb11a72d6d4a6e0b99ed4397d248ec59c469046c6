[<img align="center" src="https://cacheable.org/symbol.svg" alt="Cacheable" />](https://github.com/jaredwray/cacheable)

# file-entry-cache
> A lightweight cache for file metadata, ideal for processes that work on a specific set of files and only need to reprocess files that have changed since the last run

[![codecov](https://codecov.io/gh/jaredwray/cacheable/graph/badge.svg?token=lWZ9OBQ7GM)](https://codecov.io/gh/jaredwray/cacheable)
[![tests](https://github.com/jaredwray/cacheable/actions/workflows/tests.yml/badge.svg)](https://github.com/jaredwray/cacheable/actions/workflows/tests.yml)
[![npm](https://img.shields.io/npm/dm/file-entry-cache.svg)](https://www.npmjs.com/package/file-entry-cache)
[![npm](https://img.shields.io/npm/v/file-entry-cache)](https://www.npmjs.com/package/file-entry-cache)
[![license](https://img.shields.io/github/license/jaredwray/cacheable)](https://github.com/jaredwray/cacheable/blob/main/LICENSE)

# Features

- Lightweight cache for file metadata
- Ideal for processes that work on a specific set of files
- Persists cache to Disk via `reconcile()` or `persistInterval` on `cache` options.
- Uses `checksum` to determine if a file has changed
- Supports `relative` and `absolute` paths
- Ability to rename keys in the cache. Useful when renaming directories.
- ESM and CommonJS support with Typescript

# Table of Contents

- [Installation](#installation)
- [Getting Started](#getting-started)
- [Changes from v9 to v10](#changes-from-v9-to-v10)
- [Global Default Functions](#global-default-functions)
- [FileEntryCache Options (FileEntryCacheOptions)](#fileentrycache-options-fileentrycacheoptions)
- [API](#api)
- [Get File Descriptor](#get-file-descriptor)
- [Using Checksums to Determine if a File has Changed (useCheckSum)](#using-checksums-to-determine-if-a-file-has-changed-usechecksum)
- [Setting Additional Meta Data](#setting-additional-meta-data)
- [How to Contribute](#how-to-contribute)
- [License and Copyright](#license-and-copyright)

# Installation
```bash
npm install file-entry-cache
```

# Getting Started

```javascript
import fileEntryCache from 'file-entry-cache';
const cache = fileEntryCache.create('cache1');
let fileDescriptor = cache.getFileDescriptor('file.txt');
console.log(fileDescriptor.changed); // true as it is the first time
fileDescriptor = cache.getFileDescriptor('file.txt');
console.log(fileDescriptor.changed); // false as it has not changed
// do something to change the file
fs.writeFileSync('file.txt', 'new data foo bar');
// check if the file has changed
fileDescriptor = cache.getFileDescriptor('file.txt');
console.log(fileDescriptor.changed); // true
```

Save it to Disk and Reconsile files that are no longer found
```javascript
import fileEntryCache from 'file-entry-cache';
const cache = fileEntryCache.create('cache1');
let fileDescriptor = cache.getFileDescriptor('file.txt');
console.log(fileDescriptor.changed); // true as it is the first time
fileEntryCache.reconcile(); // save the cache to disk and remove files that are no longer found
```

Load the cache from a file:

```javascript
import fileEntryCache from 'file-entry-cache';
const cache = fileEntryCache.createFromFile('/path/to/cache/file');
let fileDescriptor = cache.getFileDescriptor('file.txt');
console.log(fileDescriptor.changed); // false as it has not changed from the saved cache.
```

# Changes from v9 to v10

There have been many features added and changes made to the `file-entry-cache` class. Here are the main changes:
- Added `cache` object to the options to allow for more control over the cache
- Added `hashAlgorithm` to the options to allow for different checksum algorithms. Note that if you load from file it most likely will break if the value was something before. 
- Updated more on using Relative or Absolute paths. We now support both on `getFileDescriptor()`. You can read more on this in the `Get File Descriptor` section.
- Migrated to Typescript with ESM and CommonJS support. This allows for better type checking and support for both ESM and CommonJS.
- Once options are passed in they get assigned as properties such as `hashAlgorithm` and `currentWorkingDirectory`. This allows for better control and access to the options. For the Cache options they are assigned to `cache` such as `cache.ttl` and `cache.lruSize`.
- Added `cache.persistInterval` to allow for saving the cache to disk at a specific interval. This will save the cache to disk at the interval specified instead of calling `reconsile()` to save. (`off` by default)
- Added `getFileDescriptorsByPath(filePath: string): FileEntryDescriptor[]` to get all the file descriptors that start with the path specified. This is useful when you want to get all the files in a directory or a specific path.
- Added `renameAbsolutePathKeys(oldPath: string, newPath: string): void` will rename the keys in the cache from the old path to the new path. This is useful when you rename a directory and want to update the cache without reanalyzing the files.
- Using `flat-cache` v6 which is a major update. This allows for better performance and more control over the cache.
- On `FileEntryDescriptor.meta` if using typescript you need to use the `meta.data` to set additional information. This is to allow for better type checking and to avoid conflicts with the `meta` object which was `any`.

# Global Default Functions
- `create(cacheId: string, cacheDirectory?: string, useCheckSum?: boolean, currentWorkingDirectory?: string)` - Creates a new instance of the `FileEntryCache` class
- `createFromFile(cachePath: string, useCheckSum?: boolean, currentWorkingDirectory?: string)` - Creates a new instance of the `FileEntryCache` class and loads the cache from a file.

# FileEntryCache Options (FileEntryCacheOptions)
- `currentWorkingDirectory?` - The current working directory. Used when resolving relative paths.
- `useModifiedTime?` - If `true` it will use the modified time to determine if the file has changed. Default is `true`
- `useCheckSum?` - If `true` it will use a checksum to determine if the file has changed. Default is `false`
- `hashAlgorithm?` - The algorithm to use for the checksum. Default is `md5` but can be any algorithm supported by `crypto.createHash`
- `cache.ttl?` - The time to live for the cache in milliseconds. Default is `0` which means no expiration
- `cache.lruSize?` - The number of items to keep in the cache. Default is `0` which means no limit
- `cache.useClone?` - If `true` it will clone the data before returning it. Default is `false`
- `cache.expirationInterval?` - The interval to check for expired items in the cache. Default is `0` which means no expiration
- `cache.persistInterval?` - The interval to save the data to disk. Default is `0` which means no persistence
- `cache.cacheDir?` - The directory to save the cache files. Default is `./cache`
- `cache.cacheId?` - The id of the cache. Default is `cache1`
- `cache.parse?` - The function to parse the data. Default is `flatted.parse`
- `cache.stringify?` - The function to stringify the data. Default is `flatted.stringify`

# API

- `constructor(options?: FileEntryCacheOptions)` - Creates a new instance of the `FileEntryCache` class
- `useCheckSum: boolean` - If `true` it will use a checksum to determine if the file has changed. Default is `false`
- `hashAlgorithm: string` - The algorithm to use for the checksum. Default is `md5` but can be any algorithm supported by `crypto.createHash`
- `currentWorkingDirectory: string` - The current working directory. Used when resolving relative paths.
- `getHash(buffer: Buffer): string` - Gets the hash of a buffer used for checksums
- `createFileKey(filePath: string): string` - Creates a key for the file path. This is used to store the data in the cache based on relative or absolute paths.
- `deleteCacheFile(filePath: string): void` - Deletes the cache file
- `destroy(): void` - Destroys the cache. This will also delete the cache file. If using cache persistence it will stop the interval.
- `removeEntry(filePath: string): void` - Removes an entry from the cache. This can be `relative` or `absolute` paths.
- `reconcile(): void` - Saves the cache to disk and removes any files that are no longer found.
- `hasFileChanged(filePath: string): boolean` - Checks if the file has changed. This will return `true` if the file has changed.
- `getFileDescriptor(filePath: string, options?: { useModifiedTime?: boolean, useCheckSum?: boolean, currentWorkingDirectory?: string }): FileEntryDescriptor` - Gets the file descriptor for the file. Please refer to the entire section on `Get File Descriptor` for more information.
- `normalizeEntries(entries: FileEntryDescriptor[]): FileEntryDescriptor[]` - Normalizes the entries to have the correct paths. This is used when loading the cache from disk.
- `analyzeFiles(files: string[])` will return `AnalyzedFiles` object with `changedFiles`, `notFoundFiles`, and `notChangedFiles` as FileDescriptor arrays.
- `getUpdatedFiles(files: string[])` will return an array of `FileEntryDescriptor` objects that have changed.
- `getFileDescriptorsByPath(filePath: string): FileEntryDescriptor[]` will return an array of `FileEntryDescriptor` objects that starts with the path specified.
- `renameAbsolutePathKeys(oldPath: string, newPath: string): void` - Renames the keys in the cache from the old path to the new path. This is useful when you rename a directory and want to update the cache without reanalyzing the files.

# Get File Descriptor

The `getFileDescriptor(filePath: string, options?: { useCheckSum?: boolean, currentWorkingDirectory?: string }): FileEntryDescriptor` function is used to get the file descriptor for the file. This function will return a `FileEntryDescriptor` object that has the following properties:

- `key: string` - The key for the file. This is the relative or absolute path of the file.
- `changed: boolean` - If the file has changed since the last time it was analyzed.
- `notFound: boolean` - If the file was not found.
- `meta: FileEntryMeta` - The meta data for the file. This has the following prperties: `size`, `mtime`, `ctime`, `hash`, `data`. Note that `data` is an object that can be used to store additional information.
- `err` - If there was an error analyzing the file.

We have added the ability to use `relative` or `absolute` paths. If you pass in a `relative` path it will use the `currentWorkingDirectory` to resolve the path. If you pass in an `absolute` path it will use the path as is. This is useful when you want to use `relative` paths but also want to use `absolute` paths. 

If you do not pass in `currentWorkingDirectory` in the class options or in the `getFileDescriptor` function it will use the `process.cwd()` as the default `currentWorkingDirectory`.

```javascript
const fileEntryCache = new FileEntryCache();
const fileDescriptor = fileEntryCache.getFileDescriptor('file.txt', { currentWorkingDirectory: '/path/to/directory' });
```

Since this is a relative path it will use the `currentWorkingDirectory` to resolve the path. If you want to use an absolute path you can do the following:

```javascript
const fileEntryCache = new FileEntryCache();
const filePath = path.resolve('/path/to/directory', 'file.txt');
const fileDescriptor = fileEntryCache.getFileDescriptor(filePath);
```

This will save the key as the absolute path.

If there is an error when trying to get the file descriptor it will return an ``notFound` and `err` property with the error.

```javascript
const fileEntryCache = new FileEntryCache();
const fileDescriptor = fileEntryCache.getFileDescriptor('no-file');
if (fileDescriptor.err) {
    console.error(fileDescriptor.err);
}

if (fileDescriptor.notFound) {
    console.error('File not found');
}
```

# Using Checksums to Determine if a File has Changed (useCheckSum)

By default the `useCheckSum` is `false`. This means that the `FileEntryCache` will use the `mtime` and `ctime` to determine if the file has changed. If you set `useCheckSum` to `true` it will use a checksum to determine if the file has changed. This is useful when you want to make sure that the file has not changed at all. 

```javascript
const fileEntryCache = new FileEntryCache();
const fileDescriptor = fileEntryCache.getFileDescriptor('file.txt', { useCheckSum: true });
```

You can pass `useCheckSum` in the FileEntryCache options, as a property `.useCheckSum` to make it default for all files, or in the `getFileDescriptor` function. Here is an example where you set it globally but then override it for a specific file:

```javascript
const fileEntryCache = new FileEntryCache({ useCheckSum: true });
const fileDescriptor = fileEntryCache.getFileDescriptor('file.txt', { useCheckSum: false });
``` 

# Setting Additional Meta Data

In the past we have seen people do random values on the `meta` object. This can cause issues with the `meta` object. To avoid this we have `data` which can be anything. 

```javascript 
const fileEntryCache = new FileEntryCache();
const fileDescriptor = fileEntryCache.getFileDescriptor('file.txt');
fileDescriptor.meta.data = { myData: 'myData' }; //anything you want
```
# How to Contribute

You can contribute by forking the repo and submitting a pull request. Please make sure to add tests and update the documentation. To learn more about how to contribute go to our main README [https://github.com/jaredwray/cacheable](https://github.com/jaredwray/cacheable). This will talk about how to `Open a Pull Request`, `Ask a Question`, or `Post an Issue`.

# License and Copyright
[MIT © Jared Wray](./LICENSE)