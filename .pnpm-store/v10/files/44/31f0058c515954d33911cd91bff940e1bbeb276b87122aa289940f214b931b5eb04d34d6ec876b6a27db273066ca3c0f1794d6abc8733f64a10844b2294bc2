# js-tokens

The tiny, regex powered, lenient, _almost_ spec-compliant JavaScript tokenizer that never fails.

```js
import jsTokens from "js-tokens";

const jsString = 'JSON.stringify({k:3.14**2}, null /*replacer*/, "\\t")';

Array.from(jsTokens(jsString), (token) => token.value).join("|");
// JSON|.|stringify|(|{|k|:|3.14|**|2|}|,| |null| |/*replacer*/|,| |"\t"|)
```

**[➡️ Full readme](https://github.com/lydell/js-tokens/)**