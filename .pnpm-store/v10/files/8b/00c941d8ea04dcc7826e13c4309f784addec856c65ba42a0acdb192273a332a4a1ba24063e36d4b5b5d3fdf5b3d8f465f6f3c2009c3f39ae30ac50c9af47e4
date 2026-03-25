# hash-sum

> blazing fast unique hash generator

# install

```shell
npm i hash-sum -S
```

# features

- no dependencies
- minimal footprint
- works in all of node.js, io.js, and the browser
- hashes functions based on their source code
- produces different hashes for different object types
- support for circular references in objects
- ignores property assignment order

# `sum(value)`

yields a four-byte hexadecimal hash based off of `value`.

```
# creates unique hashes
00a34759 from: [ 0, 1, 2, 3 ]
a8996f0c from: { '0': 0, '1': 1, '2': 2, '3': 3 }
5b4c2116 from: { '0': 0, '1': 1, '2': 2, '3': 3, length: 4 }
2c937c45 from: { url: 12 }
31d55010 from: { headers: 12 }
2d2e11bc from: { headers: 122 }
ec99d958 from: { headers: '122' }
18c00eee from: { headers: { accept: 'text/plain' } }
6cb332c8 from: { payload: [ 0, 1, 2, 3 ], headers: [ { a: 'b' } ] }
12ff55db from: { a: [Function: a] }
46f806d2 from: { b: [Function: b] }
0660d9c4 from: { b: [Function: b] }
6c95fc65 from: function () {}
2941766e from: function (a) {}
294f8def from: function (b) {}
2d9c0cb8 from: function (a) { return a;}
ed5c63fc from: function (a) {return a;}
bba68bf6 from: ''
2d27667d from: 'null'
774b96ed from: 'false'
2d2a1684 from: 'true'
8daa1a0c from: '0'
8daa1a0a from: '1'
e38f07cc from: 'void 0'
6037ea1a from: 'undefined'
9b7df12e from: null
3c206f76 from: false
01e34ba8 from: true
8a8f9624 from: Infinity
0315bf8f from: -Infinity
64a48b16 from: NaN
1a96284a from: 0
1a96284b from: 1
29172c1a from: undefined
59322f29 from: {}
095b3a22 from: { a: {}, b: {} }
63be56dd from: { valueOf: [Function: valueOf] }
63be4f5c from: { valueOf: [Function: valueOf] }
5d844489 from: []
ba0bfa14 from: 2019-06-28T21:24:31.215Z
49324d16 from: 2019-06-28T03:00:00.000Z
434c9188 from: 1988-06-09T03:00:00.000Z
ce1b5e44 from: global
```

# license

MIT
