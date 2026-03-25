<p align="center">
  <h1 align="center">Denque</h1>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/denque"><img src="https://img.shields.io/npm/dm/denque.svg?style=flat-square" alt="NPM downloads"></a>
  <a href="https://www.npmjs.com/package/denque"><img src="https://img.shields.io/npm/v/denque.svg?style=flat-square" alt="NPM version"></a>
  <a href="https://github.com/invertase/denque/actions/workflows/testing.yam"><img src="https://github.com/invertase/denque/actions/workflows/testing.yaml/badge.svg" alt="Tests status"></a>
  <a href="https://codecov.io/gh/invertase/denque"><img src="https://codecov.io/gh/invertase/denque/branch/master/graph/badge.svg?token=rn91iI4bSe" alt="Coverage"></a>
  <a href="/LICENSE"><img src="https://img.shields.io/npm/l/denque.svg?style=flat-square" alt="License"></a>
  <a href="https://twitter.com/invertaseio"><img src="https://img.shields.io/twitter/follow/invertaseio.svg?style=social&label=Follow" alt="Follow on Twitter"></a>
</p>

Denque is a well tested, extremely fast and lightweight [double-ended queue](http://en.wikipedia.org/wiki/Double-ended_queue)
implementation with zero dependencies and includes TypeScript types.

Double-ended queues can also be used as a:

- [Stack](http://en.wikipedia.org/wiki/Stack_\(abstract_data_type\))
- [Queue](http://en.wikipedia.org/wiki/Queue_\(data_structure\))

This implementation is currently the fastest available, even faster than `double-ended-queue`, see the [benchmarks](https://docs.page/invertase/denque/benchmarks).

Every queue operation is done at a constant `O(1)` - including random access from `.peekAt(index)`.

**Works on all node versions >= v0.10**

## Quick Start

Install the package:

```bash
npm install denque
```

Create and consume a queue:

```js
const Denque = require("denque");

const denque = new Denque([1,2,3,4]);
denque.shift(); // 1
denque.pop(); // 4
```


See the [API reference documentation](https://docs.page/invertase/denque/api) for more examples.

---

## Who's using it?

- [Kafka Node.js client](https://www.npmjs.com/package/kafka-node)
- [MariaDB Node.js client](https://www.npmjs.com/package/mariadb)
- [MongoDB Node.js client](https://www.npmjs.com/package/mongodb)
- [MySQL Node.js client](https://www.npmjs.com/package/mysql2)
- [Redis Node.js clients](https://www.npmjs.com/package/redis)

... and [many more](https://www.npmjs.com/browse/depended/denque).


---

## License

- See [LICENSE](/LICENSE)

---

<p align="center">
  <a href="https://invertase.io/?utm_source=readme&utm_medium=footer&utm_campaign=denque">
    <img width="75px" src="https://static.invertase.io/assets/invertase/invertase-rounded-avatar.png">
  </a>
  <p align="center">
    Built and maintained by <a href="https://invertase.io/?utm_source=readme&utm_medium=footer&utm_campaign=denque">Invertase</a>.
  </p>
</p>
