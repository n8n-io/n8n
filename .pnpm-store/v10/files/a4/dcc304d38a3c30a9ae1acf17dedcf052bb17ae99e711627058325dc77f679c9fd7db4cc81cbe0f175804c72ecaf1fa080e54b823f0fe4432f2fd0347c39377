# deprecation

> Log a deprecation message with stack

![build](https://action-badges.now.sh/gr2m/deprecation)

## Usage

<table>
<tbody valign=top align=left>
<tr><th>
Browsers
</th><td width=100%>

Load `deprecation` directly from [cdn.pika.dev](https://cdn.pika.dev)

```html
<script type="module">
  import { Deprecation } from "https://cdn.pika.dev/deprecation/v2";
</script>
```

</td></tr>
<tr><th>
Node
</th><td>

Install with `npm install deprecation`

```js
const { Deprecation } = require("deprecation");
// or: import { Deprecation } from "deprecation";
```

</td></tr>
</tbody>
</table>

```js
function foo() {
  bar();
}

function bar() {
  baz();
}

function baz() {
  console.warn(new Deprecation("[my-lib] foo() is deprecated, use bar()"));
}

foo();
// { Deprecation: [my-lib] foo() is deprecated, use bar()
//     at baz (/path/to/file.js:12:15)
//     at bar (/path/to/file.js:8:3)
//     at foo (/path/to/file.js:4:3)
```

To log a deprecation message only once, you can use the [once](https://www.npmjs.com/package/once) module.

```js
const Deprecation = require("deprecation");
const once = require("once");

const deprecateFoo = once(console.warn);

function foo() {
  deprecateFoo(new Deprecation("[my-lib] foo() is deprecated, use bar()"));
}

foo();
foo(); // logs nothing
```

## License

[ISC](LICENSE)
