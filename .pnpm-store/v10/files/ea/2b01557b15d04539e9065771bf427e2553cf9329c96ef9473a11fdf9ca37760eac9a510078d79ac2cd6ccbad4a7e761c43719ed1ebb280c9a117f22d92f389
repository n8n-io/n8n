# python-struct

[![npm Version](https://badge.fury.io/js/python-struct.png)](https://npmjs.org/package/python-struct)

Packs/Unpacks/Measures structs according to Python's `struct` format

## Installation:

```
npm install --save python-struct
```
  
## Usage example:

```javascript

const struct = require('python-struct');

struct.sizeOf('>iixxQ10sb'); // --> 29

struct.pack('>iixxQ10sb', [1234, 5678, require('long').fromString('12345678901234567890'), 'abcdefg', true]); // --> <Buffer 00 00 04 d2 00 00 16 2e 00 00 ab 54 a9 8c eb 1f 0a d2 61 62 63 64 65 66 67 00 00 00 01>

struct.unpack('>iixxQ10sb', Buffer.from('000004d20000162e0000ab54a98ceb1f0ad26162636465666700000001', 'hex')); // --> [ 1234, 5678, 12345678901234567890, 'abcdefg', 1 ]

```

## Usage in the browser

The `"browser"` entry in `package.json` will automatically redirect to the browser adapter for the package.  
*But* you'll have to `npm i buffer` in your project.

## Notes

When using "native" size & alignment, we do not really have a way to find the native size of alignment of types.  
But it's almost always safe to assume that `node_adapter.js` is compiled for the standard architectures, so `native` behaves like `standard`.

If anyone stumbles across a different case, I'll be happy to review it on that specific instance, and figure out what to do.

## Contributing

If you have anything to contribute, or functionality that you lack - you are more than welcome to participate in this!
If anyone wishes to contribute unit tests - that also would be great :-)

## Me
* Hi! I am Daniel Cohen Gindi. Or in short- Daniel.
* danielgindi@gmail.com is my email address.
* That's all you need to know.

## Help

If you want to buy me a beer, you are very welcome to
[![Donate](https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=G6CELS3E997ZE)
 Thanks :-)

## License

All the code here is under MIT license. Which means you could do virtually anything with the code.
I will appreciate it very much if you keep an attribution where appropriate.

    The MIT License (MIT)

    Copyright (c) 2013 Daniel Cohen Gindi (danielgindi@gmail.com)

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.
