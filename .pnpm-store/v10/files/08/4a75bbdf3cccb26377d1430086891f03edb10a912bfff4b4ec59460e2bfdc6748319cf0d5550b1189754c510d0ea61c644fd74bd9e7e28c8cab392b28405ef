# uuid-parse [![Build Status](https://secure.travis-ci.org/zefferus/uuid-parse.svg?branch=parse)](http://travis-ci.org/zefferus/uuid-parse) #

## NOTE: This module is no longer maintained

Simple, fast parsing and unparsing of [RFC4122](http://www.ietf.org/rfc/rfc4122.txt) UUIDS.

Features:

* Parses and unparses UUIDs to and from Buffer to String

## Quickstart

```shell
npm install uuid-parse
```

```javascript
const uuidParse = require('uuid-parse');
```

## API

### uuidParse.parse(id[, buffer[, offset]])
### uuidParse.unparse(buffer[, offset])

Parse and unparse UUIDs

  * `id` - (String) UUID(-like) string
  * `buffer` - (Array | Buffer) Array or buffer where UUID bytes are to be written. Default: A new Buffer is used
  * `offset` - (Number) Starting index in `buffer` at which to begin writing. Default: 0

Example parsing and unparsing a UUID string

```javascript
const bytes = uuidParse.parse('797ff043-11eb-11e1-80d6-510998755d10'); // -> <Buffer 79 7f f0 43 11 eb 11 e1 80 d6 51 09 98 75 5d 10>
const string = uuidParse.unparse(bytes); // -> '797ff043-11eb-11e1-80d6-510998755d10'
```

## Testing

```
npm test
```

## Acknowledgments

Please make sure to check out the repository that originated these functions: [node-uuid](https://github.com/kelektiv/node-uuid). These functions were removed from a recent version of that library and I wanted to make sure they were still exposed for the packages who were dependent on them.
