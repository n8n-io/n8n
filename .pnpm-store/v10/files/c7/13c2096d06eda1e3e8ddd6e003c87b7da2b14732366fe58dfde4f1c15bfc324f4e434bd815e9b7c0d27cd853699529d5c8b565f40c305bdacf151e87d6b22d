# What is ts-map？

it is a Map structure like ES6 Map. Map is similar to the object, but also a set of key-value pairs, but the "key" range is not limited to strings, various types of values (including objects) can be used as a key.

# Installation

```bash
npm install ts-map
```

# Usage

use in typescript file

```typescript
import TsMap from 'ts-map'
const map = new TsMap()
const k1: number = 1
const k2: number[] = [2] 
const k3: boolean = true
map.set(1, "hello")
map.set(k2, "ts").set(k3, "map")

map.get(1) // "hello"
map.get(k2) // "world"
map.size // 3
map.keys() // [1, [2], true]
map.values() // ["hello", "ts", "map"]

map.forEach((value, key, map) => {
  console.log(key, ':', value)
})
// 1 ':' 'hello'
// [ 2 ] ':' 'ts'
// true ':' 'map'
```

# Getting started

## Constructor with parameter

You can pass in the default parameters in the constructor:

```typescript
const map = new TsMap([
  [1, "ok"],
  [2, "fail"]
])

console.log(map.get(1)) // ok
```

## Class generic

support define generic for ts-map

```typescript
interface Coder {
  name: string
}

const map = new TsMap<number, Coder>([
  [1, {name: 'lavyun'}]
])

map.set(2, {name: "tom"}) // work

map.set(3, "jack") // sorry, error
```

If you do not define generics, but in the constructor passed in the parameters, you also need follow the generic rules.If you do not use generics, you can set any type of key-value pairs for the map.

## API

### size: number

return the Map's size

```typescript
const map = new TsMap<number, Coder>([
  [1, {name: 'lavyun'}]
])

map.set(2, {name: "tom"})
map.size // 2
```

### set(k: K, v: V): TsMapInter<K, V>

set a key-value to Map, support chain called.

```ts
map.set(true, "1")
map.set(1, "hello").set(2, "world")
```

Notice: Only the reference to the same object, Map structure will be regarded as the same key.

```ts
const k = ["1"]
map.set(k, "hello")
map.get(k)  // hello
map.get(["1"])  // undefind
```

If the same key is assigned multiple times, the following value will overwrite the previous value.

```ts
map.set(1, "111").set(1, "222")
map.get(1) // 222
```

### get(k: K): V | undefined

Return the value of the corresponding key,if dosn't include, return undefind.

```ts
map.set(1, "111")
map.get(1) // 111
map.get(2) // undefind
```

### has(k: K): boolean

Determine if a key is included.

```ts
map.set(1, "111")
map.has(1) // true
map.has(2) // false
```

### delete(k: k): boolean

Delete all the corresponding keys and its value, if detele success, return true. else return false.

```ts
map.set(1, "111")
map.set(2, "222")
map.delete(1)
map.has(1) //false
mao.size // 1
```

### clear(): void

Delete all key-value from the Map.

```ts
map.set(1, "111")
map.set(2, "222")
map.size // 2
map.clear()
map.size // 0
```

### keys(): K[]

return all Map's key.

```ts
map.set(1, 2)
map.set(true, false)
map.set(["1"], {name: 'lavyun'})
map.keys() // [1, true, ["1"]]
```

### values(): V[]

return all Map's value.

```ts
map.set(1, 2)
map.set(true, false)
map.set(["1"], {name: 'lavyun'})
map.values() // [2, false, 'lavyun']
```

### entries(): Array<[K, V]>

return all Map's key-value.
```ts
map.set(1, 2)
map.set(true, false)
map.set(["1"], {name: 'lavyun'})
map.entries()
/* 
[
  [1, 2],
  [true, false],
  [["1"], {name: 'lavyun'}]
]
*/
```

### forEach(cb, context?: any): void

Traversal the Map.Accept two parameters, first is a callback, second is a optional context.

callback function accepts 3 optional params,first is value, second is key, last is the map.

```ts
map.set(1, "111").set(2. "222")
map.forEach((value, key, map) => {
  console.log(key, '-', value)
})
// 1 - '111'
// 2 - '222'
```

You can pass the second param to set the callback's context

```ts
const person = {
  name: 'lavyun'
}

map.set(1, "111").set(2. "222")
map.forEach((value, key, map) => {
  console.log(key, '-', value, '-', this.name)
}, person)
// 1 - '111' - 'lavyun'
// 2 - '222' - 'lavyun'
```

## Licence

MIT LICENCE