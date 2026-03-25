# oas-resolver

## Usage

```js
const yaml = require('yaml');
const input = yaml.parse(str);
const source = url; // or filename
resolver.resolve(input,source,options)
.then(function(options){
  fs.writeFileSync(outputFile,yaml.stringify(options.openapi),'utf8');
})
.catch(function(ex){
  // ...
});
```

See here for complete [documentation](/docs/options.md) of the `options` object.
