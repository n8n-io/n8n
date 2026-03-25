# cross-argv

Cross platform normalization of process.argv.

```
npm install cross-argv
```

Basically makes arguments with single quote strings work `node app.js 'foo bar'` everywhere,
which otherwise can cause issues when used in `cmd.exe`.

## Usage

``` js
const xargv = require('cross-argv')
console.log(xargs()) // returns a normalized process.argv
```

## API

#### `argv = xargv([argv])`

Returns a normalized argv array that looks the same cross platform.

If no args are passed it normalizes `process.argv`. Otherwise you can pass your own array.

## License

MIT
