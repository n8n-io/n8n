# bare-fs

Native file system operations for Javascript.

```
npm i bare-fs
```

## Usage

```js
const fs = require('bare-fs')

const fd = await fs.open('hello.txt')

const buffer = Buffer.alloc(1024)

try {
  const length = await fs.read(fd, buffer)

  console.log('Read', length, 'bytes')
} finally {
  await fs.close(fd)
}
```

## License

Apache-2.0
