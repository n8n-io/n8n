# TypeScript Dedent

[![codecov](https://codecov.io/gh/tamino-martinius/node-ts-dedent/branch/master/graph/badge.svg)](https://codecov.io/gh/tamino-martinius/node-ts-dedent)

TypeScript package which smartly trims and strips indentation from multi-line strings.

## Usage Examples

```js
import dedent from 'dedent';

console.log(dedent`A string that gets so long you need to break it over
                    multiple lines. Luckily dedent is here to keep it
                    readable without lots of spaces ending up in the string
                    itself.`);

console.log(dedent`
  A string that gets so long you need to break it over
  multiple lines. Luckily dedent is here to keep it
  readable without lots of spaces ending up in the string
  itself.
`);
```

```txt
A string that gets so long you need to break it over
multiple lines. Luckily dedent is here to keep it
readable without lots of spaces ending up in the string
itself.
```

---

```js
console.log(dedent`
  Leading and trailing lines will be trimmed, so you can write something like
  this and have it work as you expect:

    * how convenient it is
    * that I can use an indented list
        - and still have it do the right thing

  That's all.
`);
```

```txt
Leading and trailing lines will be trimmed, so you can write something like
this and have it work as you expect:

  * how convenient it is
  * that I can use an indented list
    - and still have it do the right thing

That's all.
```

---

```js
console.log(dedent`
  Also works fine

  ${1}. With any kind of
  ${2}. Placeholders
`);
```

```txt
Also works fine

1. With any kind of
2. Placeholders
```

---

```js
console.log(dedent(`
  Wait! I lied. Dedent can also be used as a function.
`);
```

```txt
Wait! I lied. Dedent can also be used as a function.
```

## License

MIT

## Based on

- [dedent](https://www.npmjs.com/package/dedent) by ~dmnd
- [dedent-js](https://www.npmjs.com/package/dedent-js) by ~martin-kolarik

## Changelog

See [history](HISTORY.md) for more details.

- `2.2.0` **2021-08-01** Add indentation to values with multiline strings & added ESM module
- `2.1.1` **2021-03-31** Update dependencies
- `2.1.0` **2021-03-24** Bugfixes
- `2.0.0` **2020-09-28** Bugfixes
- `1.2.0` **2020-09-28** Update dependencies and a couple of minor improvments
- `1.1.0` **2019-07-26** Update dependencies and fixed links in readme
- `1.0.0` **2018-06-14** Initial release
