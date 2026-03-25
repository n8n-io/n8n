# get-own-enumerable-property-symbols [![Build Status](https://travis-ci.org/mightyiam/get-own-enumerable-property-symbols.svg?branch=master)](https://travis-ci.org/mightyiam/get-own-enumerable-property-symbols)

Returns an array of all *enumerable* symbol properties found directly upon a given object.

Similar to [`Object.getOwnPropertySymbols`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertySymbols)
but only [enumerable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Enumerability_and_ownership_of_properties) keys.

```js
import getOwnEnumPropSymbols from 'get-own-enumerable-property-symbols'

getOwnEnumPropSymbols({ [Symbol()]: undefined })
// [Symbol()]
getOwnEnumPropSymbols(Object.defineProperty({}, Symbol(), {enumerable: false}))
// []
```
