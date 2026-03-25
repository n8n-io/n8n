# Cookie Handling

## `Cookie` interface

* **name** `string`
* **value** `string`
* **expires** `Date|number` (optional)
* **maxAge** `number` (optional)
* **domain** `string` (optional)
* **path** `string` (optional)
* **secure** `boolean` (optional)
* **httpOnly** `boolean` (optional)
* **sameSite** `'String'|'Lax'|'None'` (optional)
* **unparsed** `string[]` (optional) Left over attributes that weren't parsed.

## `deleteCookie(headers, name[, attributes])`

Sets the expiry time of the cookie to the unix epoch, causing browsers to delete it when received.

```js
import { deleteCookie, Headers } from 'undici'

const headers = new Headers()
deleteCookie(headers, 'name')

console.log(headers.get('set-cookie')) // name=; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

Arguments:

* **headers** `Headers`
* **name** `string`
* **attributes** `{ path?: string, domain?: string }` (optional)

Returns: `void`

## `getCookies(headers)`

Parses the `Cookie` header and returns a list of attributes and values.

```js
import { getCookies, Headers } from 'undici'

const headers = new Headers({
  cookie: 'get=cookies; and=attributes'
})

console.log(getCookies(headers)) // { get: 'cookies', and: 'attributes' }
```

Arguments:

* **headers** `Headers`

Returns: `Record<string, string>`

## `getSetCookies(headers)`

Parses all `Set-Cookie` headers.

```js
import { getSetCookies, Headers } from 'undici'

const headers = new Headers({ 'set-cookie': 'undici=getSetCookies; Secure' })

console.log(getSetCookies(headers))
// [
//   {
//     name: 'undici',
//     value: 'getSetCookies',
//     secure: true
//   }
// ]

```

Arguments:

* **headers** `Headers`

Returns: `Cookie[]`

## `setCookie(headers, cookie)`

Appends a cookie to the `Set-Cookie` header.

```js
import { setCookie, Headers } from 'undici'

const headers = new Headers()
setCookie(headers, { name: 'undici', value: 'setCookie' })

console.log(headers.get('Set-Cookie')) // undici=setCookie
```

Arguments:

* **headers** `Headers`
* **cookie** `Cookie`

Returns: `void`
