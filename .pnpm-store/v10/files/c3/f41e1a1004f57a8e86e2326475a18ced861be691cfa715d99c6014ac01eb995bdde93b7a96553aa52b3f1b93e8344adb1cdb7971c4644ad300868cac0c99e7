# mailsplit

Split an email message stream into structured parts and join these parts back into an email message stream. If you do not modify the parsed data then the rebuilt message should be an exact copy of the original.

This is useful if you want to modify some specific parts of an email, for example to add tracking images or unsubscribe links to the HTML part of the message without changing any other parts of the email.

Supports both &lt;CR&gt;&lt;LF&gt; and &lt;LF&gt; (or mixed) line endings. Embedded rfc822 messages are also parsed, in this case you would get two sequential 'node' objects with no 'data' or 'body' in between (first 'node' is for the container node and second for the root node of the embedded message).

In general this module is a primitive for building e-mail parsers/handlers like [mailparser](https://www.npmjs.com/package/mailparser). Alternatively you could use it to parse other MIME-like structures, for example _mbox_ files or multipart/form-data uploads.

See [rewrite-html.js](examples/rewrite-html.js) for an usage example where HTML content is modified on the fly (example script adds a link to every _text/html_ node)

## Usage

### Install

Install from [npm](https://www.npmjs.com/package/mailsplit)

    npm install mailsplit --save

### Split message stream

`Splitter` is a transformable stream where input is a byte stream and output is an object stream.

```javascript
let Splitter = require('mailsplit').Splitter;
let splitter = new Splitter(options);
```

Where

-   **options** is an optional options object
    -   **options.ignoreEmbedded** (boolean, defaults to false) if true then treat message/rfc822 node as normal leaf node and do not try to parse it
    -   **options.maxHeadSize** (number, defaults to Infinity) limits message header size in bytes

#### Events

**'data'** event emits the next parsed object from the message stream.

#### Data objects

-   **type**
    -   `'node'` means that we reached the next mime node and the previous one is completely processed
    -   `'data'` provides us multipart body parts, including boundaries. This data is not directly related to any specific multipart node, basically it includes everything between the end of one normal node and the header of next node
    -   `'body'` provides us next chunk for the last seen `'node'` element
-   **value** is a buffer value for `'body'` and `'data'` parts
-   **getDecoder()** is a function that returns a stream object you can use to decode node contents. Write data from 'body' to decoder and read decoded Buffer value out from it
-   **getEncoder()** is a function that returns a stream object you can use to encode node contents. Write buffer data to encoder and read encoded object value out that you can pass to a Joiner

Element with type `'node'` has a bunch of header related methods and properties, see [below](#manipulating-headers).

**Example**

```javascript
let Splitter = require('mailsplit').Splitter;
let splitter = new Splitter();
// handle parsed data
splitter.on('data', data => {
    switch (data.type) {
        case 'node':
            // node header block
            process.stdout.write(data.getHeaders());
            break;
        case 'data':
            // multipart message structure
            // this is not related to any specific 'node' block as it includes
            // everything between the end of some node body and between the next header
            process.stdout.write(data.value);
            break;
        case 'body':
            // Leaf element body. Includes the body for the last 'node' block. You might
            // have several 'body' calls for a single 'node' block
            process.stdout.write(data.value);
            break;
    }
});
// send data to the parser
someMessagStream.pipe(splitter);
```

### Manipulating headers

If the data object has `type='node'` then you can modify headers for that node (headers can be modified until the data object is passed over to a `Joiner`)

-   **node.getHeaders()** returns a Buffer value with generated headers. If you have not modified the headers object in any way then you should get the exact copy of the original. In case you have done something (for example removed a key, or added a new header key), then all linebreaks are forced to &lt;CR&gt;&lt;LF&gt; even if the original headers used just &lt;LF&gt;
-   **node.setContentType(contentType)** sets or updates mime type for the node
-   **node.setCharset(charset)** sets or updates character set in the Content-Type header
-   **node.setFilename(filename)** sets or updates filename in the Content-Disposition header (unicode allowed)

You can manipulate specific header keys as well using the `headers` object

-   **node.headers.get(key)** returns an array of strings with all header rows for the selected key (these are full header lines, so key name is part of the row string, eg `["Subject: This is subject line"]`)
-   **node.headers.getFirst(key)** returns string value of the specified header key (eg `"This is subject line"`)
-   **node.headers.hasHeader(key)** returns boolean value if the specified header key exists
-   **node.headers.add(key, value [,index])** adds a new header value to the specified index or to the top of the header block if index is not specified
-   **node.headers.update(key, value, [,relativeKeyIndex])** replaces a header value to the specified relative key index (note that relative key index means relative to the same header key, eg if multiple exist and you specify `1` as the value, then it will update the second) or if no relative key index is specified, then it will remove all header value matches found for the key and append one at the last matching key index found with the specified value. If a relative key index is specified and it does not exist then it will be replaced (eg if there are two headers of `X-Foo-Bar` and you pass `2`, meaning it will update the third, no updates will be made since the third did not exist)
-   **node.headers.remove(key)** remove header value
-   **node.headers.mbox** If this is a MBOX formatted message then this value holds the prefix line (eg. "From MAILER-DAEMON Fri Jul 8 12:08:34 2011")
-   **node.headers.mbox** If this is a POST form-data then this value holds the HTTP prefix line (eg. "POST /upload.php HTTP/1.1")

Additionally you can check the details of the node with the following properties automatically parsed from the headers:

-   **node.root** if true then it means this is the message root, so this node should contain Subject, From, To etc. headers
-   **node.contentType** returns the mime type of the node (eg. 'text/html')
-   **node.disposition** either `'attachment'`, `'inline'` or `false` if not set
-   **node.charset** returns the charset of the node as defined in 'Content-Type' header (eg. 'UTF-8') or false if not defined
-   **node.encoding** returns the Transfer-Encoding value (eg. 'base64' or 'quoted-printable') or false if not defined
-   **node.multipart** if has value, then this is a multipart node (does not have 'body' parts)
-   **node.filename** is set if the headers contain a filename value. This is decoded to unicode, so it is a normal string or false if not found

### Join parsed message stream

`Joiner` is a transformable stream where input is the object stream form `Splitter` and output is a byte stream.

```javascript
let Splitter = require('mailsplit').Splitter;
let Joiner = require('mailsplit').Joiner;
let splitter = new Splitter();
let joiner = new Joiner();
// pipe a message source to splitter, then joiner and finally to stdout
someMessagStream
    .pipe(splitter)
    .pipe(joiner)
    .pipe(process.stdout);
```

### Rewrite specific nodes

`Rewriter` is a simple helper class to modify nodes that match a filter function. You can pipe a Splitter stream directly into a Rewriter and pipe Rewriter output to a Joiner.

Rewriter takes the following argument:

-   **filterFunc** gets the current node as argument and starts processing it if `filterFunc` returns true

Once Rewriter finds a matching node, it emits the following event:

-   _'node'_ with an object argument `data`
    -   `data.node` includes the current node with headers
    -   `data.decoder` is the decoder stream that you can read data from
    -   `data.encoder` is the encoder stream that you can write data to. Whatever you write into that stream will be encoded properly and inserted as the content of the current node

```javascript
let Splitter = require('mailsplit').Splitter;
let Joiner = require('mailsplit').Joiner;
let Rewriter = require('mailsplit').Rewriter;
let splitter = new Splitter();
let joiner = new Joiner();
let rewriter = new Rewriter(node => node.contentType === 'text/html');
rewriter.on('node', data => {
    // manage headers with node.headers
    node.headers.add('X-Processed-Time', new Date.toISOString());
    // do nothing, just reencode existing data
    data.decoder.pipe(data.encoder);
});
// pipe a message source to splitter, then rewriter, then joiner and finally to stdout
someMessagStream
    .pipe(splitter)
    .pipe(rewriter)
    .pipe(joiner)
    .pipe(process.stdout);
```

### Stream specific nodes

`Streamer` is a simple helper class to stream nodes that match a filter function. You can pipe a Splitter stream directly into a Streamer and pipe Streamer output to a Joiner.

Streamer takes the following argument:

-   **filterFunc** gets the current node as argument and starts processing it if `filterFunc` returns true

Once Streamer finds a matching node, it emits the following event:

-   _'node'_ with an object argument `data`
    -   `data.node` includes the current node with headers (informational only, you can't modify it)
    -   `data.decoder` is the decoder stream that you can read data from
    -   `data.done` is a function you must call once you have processed the stream

```javascript
let Splitter = require('mailsplit').Splitter;
let Joiner = require('mailsplit').Joiner;
let Streamer = require('mailsplit').Streamer;
let fs = require('fs');
let splitter = new Splitter();
let joiner = new Joiner();
let streamer = new Streamer(node => node.contentType === 'image/jpeg');
streamer.on('node', data => {
    // write to file
    data.decoder.pipe(fs.createWriteStream(data.node.filename || 'image.jpg'));
    data.done();
});
// pipe a message source to splitter, then streamer, then joiner and finally to stdout
someMessagStream
    .pipe(splitter)
    .pipe(streamer)
    .pipe(joiner)
    .pipe(process.stdout);
```

### Benchmark

Parsing and re-building messages is not fast but it isn't slow either. On my Macbook Pro I got around 22 MB/second (single process, single parsing queue) when parsing random messages from my own email archive. Time spent includes file calls to find and load random messages from disk.

```
Streaming 20000 random messages through a plain PassThrough
Done. 20000 messages [1244 MB] processed in 10.095 s. with average of 1981 messages/sec [123 MB/s]
Streaming 20000 random messages through Splitter and Joiner
Done. 20000 messages [1244 MB] processed in 55.882 s. with average of 358 messages/sec [22 MB/s]
```

## License

Dual licensed under **MIT** or **EUPLv1.1+**

> `mailsplit` is part of the Zone Mail Suite (ZMS). Suite of programs and modules for an efficient, fast and modern email server.