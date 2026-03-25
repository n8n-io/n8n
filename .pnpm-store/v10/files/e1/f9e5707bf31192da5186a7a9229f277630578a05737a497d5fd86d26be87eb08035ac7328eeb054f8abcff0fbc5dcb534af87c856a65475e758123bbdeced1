##

https://dev.mysql.com/doc/refman/8.0/en/caching-sha2-pluggable-authentication.html

```js
const mysql = require('mysql');
mysql.createConnection({
  authPlugins: {
    caching_sha2_password: mysql.authPlugins.caching_sha2_password({
      onServerPublikKey: function (key) {
        console.log(key);
      },
      serverPublicKey: 'xxxyyy',
      overrideIsSecure: true, //
    }),
  },
});
```
