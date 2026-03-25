# epub2

**epub2** is a node.js module to parse EPUB electronic book files.

**NB!** Only ebooks in UTF-8 are currently supported!.

***this module fork from*** `epub`

## Installation

    npm install epub2 zipfile

Or, if you want a pure-JS version (useful if used in a Node-Webkit app for example):

    npm install epub2

## Usage

* [example](test/example/example.ts)
* [example Promise](test/example/example2.ts)

```ts
const EPub = require("epub2/node");
import * as EPub from 'epub2/node';

const EPub = require("epub2").EPub;
import EPub from 'epub2';
import { EPub } from 'epub2';
```

```ts
var epub = new EPub(epubfile, imagewebroot, chapterwebroot);
```

Where

  * **epubfile** is the file path to an EPUB file
  * **imagewebroot** is the prefix for image URL's. If it's */images/* then the actual URL (inside chapter HTML `<img>` blocks) is going to be */images/IMG_ID/IMG_FILENAME*, `IMG_ID` can be used to fetch the image form the ebook with `getImage`. Default: `/images/`
  * **chapterwebroot** is the prefix for chapter URL's. If it's */chapter/* then the actual URL (inside chapter HTML `<a>` links) is going to be */chapters/CHAPTER_ID/CHAPTER_FILENAME*, `CHAPTER_ID` can be used to fetch the image form the ebook with `getChapter`. Default: `/links/`

Before the contents of the ebook can be read, it must be opened (`EPub` is an `EventEmitter`).

### async

```ts
let epub = await EPub.createAsync(epubfile, imagewebroot, chapterwebroot);
```

```ts
EPub.createAsync(epubfile, imagewebroot, chapterwebroot)
	.then(function (epub)
	{
		...
	})
	.catch(function (err)
	{
		console.log("ERROR\n-----");
		throw err;
	})
;
```

### old way

```ts
    epub.on("end", function(){
    	// epub is now usable
    	console.log(epub.metadata.title);

    	epub.getChapter("chapter_id", function(err, text){});
    });
    epub.parse();
```

## metadata

Property of the *epub* object that holds several metadata fields about the book.

```ts
    epub = new EPub(...);
    ...
    epub.metadata;
```

```ts
    // raw metadata
    epub.metadata[EPub.SYMBOL_RAW_DATA];
```

Available fields:

  * **creator** Author of the book (if multiple authors, then the first on the list) (*Lewis Carroll*)
  * **creatorFileAs** Author name on file (*Carroll, Lewis*)
  * **title** Title of the book (*Alice's Adventures in Wonderland*)
  * **language** Language code (*en* or *en-us* etc.)
  * **subject** Topic of the book (*Fantasy*)
  * **date** creation of the file (*2006-08-12*)
  * **description**

## flow

*flow* is a property of the *epub* object and holds the actual list of chapters (TOC is just an indication and can link to a # url inside a chapter file)

```ts
    epub = new EPub(...);
    ...
    epub.flow.forEach(function(chapter){
    	console.log(chapter.id);
    });
```

Chapter `id` is needed to load the chapters `getChapter`

## toc
*toc* is a property of the *epub* object and indicates a list of titles/urls for the TOC. Actual chapter and it's ID needs to be detected with the `href` property


## getChapter(chapter_id, callback)

Load chapter text from the ebook.

```ts
    var epub = new EPub(...);
    ...
    epub.getChapter("chapter1", function(error, text){});
```

## getChapterRaw(chapter_id, callback)

Load raw chapter text from the ebook.

## getImage(image_id, callback)

Load image (as a Buffer value) from the ebook.

```ts
    var epub = new EPub(...);
    ...
    epub.getImage("image1", function(error, img, mimeType){});
```

## getFile(file_id, callback)

Load any file (as a Buffer value) from the ebook.

```ts
    var epub = new EPub(...);
    ...
    epub.getFile("css1", function(error, data, mimeType){});
```

## EPub.libPromise

change Promise class

```ts
EPub.libPromise = Promise;
```
