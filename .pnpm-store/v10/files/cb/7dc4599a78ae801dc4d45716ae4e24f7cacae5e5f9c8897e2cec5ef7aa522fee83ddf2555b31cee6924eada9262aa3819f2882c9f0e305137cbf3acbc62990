# binascii by [@michalbe](http://github.com/michalbe) #
Port of binascii library from Python


### What ###
> The binascii module contains a number of methods to convert between binary and various ASCII-encoded binary representations.

More: [python binascii docs](https://docs.python.org/2/library/binascii.html)
For now only two methods are implemented - `hexlify` with `b2a_hex` alias and 'unhexlify' (called also `a2b_hex`).
### How to use: ###
```
npm install binascii
```
then:
```javascript
var ba = require('binascii');

console.log(ba.hexlify('A')); // result: '41'
console.log(ba.unhexlify('377abcaf271c')); // result: '7z¼¯'\u001c'
```

### API ###
  * `hexlify` - Return the hexadecimal representation of the binary data. Every byte of data is converted into the corresponding 2-digit hex representation.
  * `unhexlify` - Return the binary data represented by the hexadecimal string. This function is the inverse of `hexlify`.
  * `b2a_hex` - alias of `hexlify`
  * `a2b_hex` - alias of `unhexlify`

### To Do ###
original library supports also:
  * a2b_uu
  * b2a_uu
  * a2b_base64
  * b2a_base64
  * a2b_qp
  * b2a_qp
  * a2b_hqx
  * rledecode_hqx
  * rlecode_hqx
  * b2a_hqx
  * crc_hqx
  * crc32

Interested in implementing any of those? Check [binascii docs](https://docs.python.org/2/library/binascii.html) for more info on how those methods should work
