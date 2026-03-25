xml-escape
==========

Escape XML in javascript (NodeJS)

npm install xml-escape

```javascript
// Warning escape is a reserved word, so maybe best to use xmlescape for var name
var xmlescape = require('xml-escape');

xmlescape('"hello" \'world\' & false < true > -1');

// output
// '&quot;hello&quot; &apos;world&apos; &amp; false &lt; true &gt; -1'

// don't escape some characters
xmlescape('"hello" \'world\' & false < true > -1', '>"&')

// output
// '"hello" &apos;world&apos; & false &lt; true > -1'
```


There is also now an ignore function thanks to @jayflo

```javascript
esc = require('./');

ignore = '"<&'
// note you should never ignore an &
output = esc('I am "<&not>" escaped', ignore)
console.log(output)

//I am "<&not&gt;" escaped
```

[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/miketheprogrammer/xml-escape/trend.png)](https://bitdeli.com/free "Bitdeli Badge")
