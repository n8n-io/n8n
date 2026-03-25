<p align="center"><img src="http://dzcpy.github.io/transliteration/transliteration.png" alt="Transliteration"></p>

[![Build Status](https://img.shields.io/circleci/project/github/dzcpy/transliteration/master.svg)](https://circleci.com/gh/dzcpy/transliteration)
[![Coverage Status](https://coveralls.io/repos/github/dzcpy/transliteration/badge.svg?branch=master)](https://coveralls.io/github/dzcpy/transliteration?branch=master)
[![NPM Version](https://img.shields.io/npm/v/transliteration.svg)](https://www.npmjs.com/package/transliteration)
[![NPM Download](https://img.shields.io/npm/dm/transliteration.svg)](https://www.npmjs.com/package/transliteration)
[![](https://data.jsdelivr.com/v1/package/npm/transliteration/badge)](https://www.jsdelivr.com/package/npm/transliteration)
[![License](https://img.shields.io/npm/l/transliteration.svg)](https://github.com/dzcpy/transliteration/blob/master/LICENSE.txt)\
Universal Unicode to Latin transliteration + slugify module. Works on all platforms and with all major languages.

## Demo

[Try it out](http://dzcpy.github.io/transliteration)

## Compatibility / Browser support

IE 9+ and all modern browsers, Node.js, Web Worker, React Native and CLI

## Installation

### Node.js / React Native

```bash
npm install transliteration --save
```

If you are using Typescript, please do not install `@types/transliteration`. Since in verson `2.x`, type definition files are built-in within this project.

```javascript
import { transliterate as tr, slugify } from 'transliteration';

tr('你好, world!');
// Ni Hao , world!
slugify('你好, world!');
// ni-hao-world
```

### Browser (CDN):

```html
<!-- UMD build -->
<script
  async
  defer
  src="https://cdn.jsdelivr.net/npm/transliteration@2.1.8/dist/browser/bundle.umd.min.js"
></script>
<script>
  console.log(transliterate('你好'));
</script>
```

```html
<!-- ESM build -->
<script type="module">
  import { transliterate } from 'https://cdn.jsdelivr.net/npm/transliteration@2.1.8/dist/browser/bundle.esm.min.js';
  console.log(transliterate('你好'));
</script>
```

`transliteration` can be loaded as an AMD / CommonJS module, or as global variables (UMD).

When you use it in the browser, by default it creates three global variables under `window` object:

```javascript
transliterate('你好, World');
// window.transliterate
slugify('Hello, 世界');
// window.slugify
transl('Hola, mundo'); // For backward compatibility only, will be removed in next major version
// window.transl
```

### CLI

```bash
npm install transliteration -g

transliterate 你好 # Ni Hao
slugify 你好 # ni-hao
echo 你好 | slugify -S # ni-hao
```

## Usage

### transliterate(str, [options])

Transliterate the string `str` and return the result. Characters which this module can't handle will default to the placeholder character(s) given in the `unknown` option. If it's not provided, they will be removed.

**Options:** (optional)

```javascript
{
  /**
   * Ignore a list of strings untouched
   * @example tr('你好，世界', { ignore: ['你'] }) // 你 Hao , Shi Jie
   */
  ignore?: string[];
  /**
   * Replace a list of string / regex in the source string with the provided target string before transliteration
   * The option can either be an array or an object
   * @example tr('你好，世界', { replace: {你: 'You'} }) // You Hao , Shi Jie
   * @example tr('你好，世界', { replace: [['你', 'You']] }) // You Hao , Shi Jie
   * @example tr('你好，世界', { replace: [[/你/g, 'You']] }) // You Hao , Shi Jie
   */
  replace?: OptionReplaceCombined;
  /**
   * Same as `replace` but after transliteration
   */
  replaceAfter?: OptionReplaceCombined;
  /**
   * Decides whether or not to trim the result string after transliteration
   * @default false
   */
  trim?: boolean;
  /**
   * Any characters not known by this library will be replaced by a specific string `unknown`
   * @default ''
   */
  unknown?: string;
  /**
   * Fix Chinese spacing. For example, `你好` is transliterated to `Ni Hao` instead of `NiHao`. If you don't need to transliterate Chinese characters, set it to false to false to improve performance.
   * @default true
   */
  fixChineseSpacing?: boolean;
}
```

### transliterate.config([optionsObj], [reset = false])

Bind option object globally so any following calls will use `optionsObj` by default. If `optionsObj` is not given, it will return current default option object.

```javascript
import { transliterate as tr } from 'transliteration';
tr('你好，世界');
// Ni Hao , Shi Jie
tr('Γεια σας, τον κόσμο');
// Geia sas, ton kosmo
tr('안녕하세요, 세계');
// annyeonghaseyo, segye
tr('你好，世界', { replace: { 你: 'You' }, ignore: ['好'] });
// You 好,Shi Jie
tr('你好，世界', { replace: [['你', 'You']], ignore: ['好'] });
// You 好,Shi Jie (option in array form)
tr.config({ replace: [['你', 'You']], ignore: ['好'] });
tr('你好，世界'); // You 好,Shi Jie
console.log(tr.config());
// { replace: [['你', 'You']], ignore: ['好'] }
tr.config(undefined, true);
console.log(tr.config());
// {}
```

### slugify(str, [options])

Convert Unicode `str` into a slug string, making sure it is safe to be used in an URL or in a file name.

**Options:** (optional)

```javascript
  /**
   * Ignore a list of strings untouched
   * @example tr('你好，世界', { ignore: ['你'] }) // 你 Hao , Shi Jie
   */
  ignore?: string[];
  /**
   * Replace a list of string / regex in the source string with the provided target string before transliteration
   * The option can either be an array or an object
   * @example tr('你好，世界', { replace: {你: 'You'} }) // You Hao , Shi Jie
   * @example tr('你好，世界', { replace: [['你', 'You']] }) // You Hao , Shi Jie
   * @example tr('你好，世界', { replace: [[/你/g, 'You']] }) // You Hao , Shi Jie
   */
  replace?: OptionReplaceCombined;
  /**
   * Same as `replace` but after transliteration
   */
  replaceAfter?: OptionReplaceCombined;
  /**
   * Decides whether or not to trim the result string after transliteration
   * @default false
   */
  trim?: boolean;
  /**
   * Any characters not known by this library will be replaced by a specific string `unknown`
   * @default ''
   */
  unknown?: string;
  /**
   * Whether the result need to be converted into lowercase
   * @default true
   */
  lowercase?: boolean;
  /**
   * Whether the result need to be converted into uppercase
   * @default false
   */
  uppercase?: boolean;
  /**
   * Custom separator string
   * @default '-'
   */
  separator?: string;
  /**
   * Allowed characters.
   * When `allowedChars` is set to `'abc'`, only characters which match `/[abc]/g` will be preserved.
   * Other characters will all be converted to `separator`
   * @default 'a-zA-Z0-9-_.~''
   */
  allowedChars?: string;
  /**
   * Fix Chinese spacing. For example, `你好` is transliterated to `Ni Hao` instead of `NiHao`. If you don't need to transliterate Chinese characters, set it to false to false to improve performance.
   */
  fixChineseSpacing?: boolean;
```

```javascript
slugify('你好，世界');
// ni-hao-shi-jie
slugify('你好，世界', { lowercase: false, separator: '_' });
// Ni_Hao_Shi_Jie
slugify('你好，世界', {
  replace: { 你好: 'Hello', 世界: 'world' },
  separator: '_',
});
// hello_world
slugify('你好，世界', {
  replace: [
    ['你好', 'Hello'],
    ['世界', 'world'],
  ],
  separator: '_',
}); // replace option in array form)
// hello_world
slugify('你好，世界', { ignore: ['你好'] });
// 你好shi-jie
```

### slugify.config([optionsObj], [reset = false])

Bind option object globally so any following calls will use `optionsObj` by default. If `optionsObj` is not given, it will return current default option object.

```javascript
slugify.config({ lowercase: false, separator: '_' });
slugify('你好，世界');
// Ni_Hao_Shi_Jie
console.log(slugify.config());
// { lowercase: false, separator: "_" }
slugify.config({ replace: [['你好', 'Hello']] });
slugify('你好, world!');
// This equals slugify('你好, world!', { replace: [['你好', 'Hello']] });
console.log(slugify.config());
// { replace: [['你好', 'Hello']] }
slugify.config(undefined, true);
console.log(slugify.config());
// {}
```

### CLI Usage

```
➜  ~ transliterate --help
Usage: transliterate <unicode> [options]

Options:
  --version      Show version number                                                       [boolean]
  -u, --unknown  Placeholder for unknown characters                           [string] [default: ""]
  -r, --replace  Custom string replacement                                     [array] [default: []]
  -i, --ignore   String list to ignore                                         [array] [default: []]
  -S, --stdin    Use stdin as input                                       [boolean] [default: false]
  -h, --help                                                                               [boolean]

Examples:
  transliterate "你好, world!" -r 好=good -r          Replace `,` with `!`, `world` with `shijie`.
  "world=Shi Jie"                                     Result: Ni good, Shi Jie!
  transliterate "你好，世界!" -i 你好 -i ，           Ignore `你好` and `，`.
                                                      Result: 你好，Shi Jie !
```

```
➜  ~ slugify --help
Usage: slugify <unicode> [options]

Options:
  --version        Show version number                                                     [boolean]
  -U, --unknown    Placeholder for unknown characters                         [string] [default: ""]
  -l, --lowercase  Returns result in lowercase                             [boolean] [default: true]
  -u, --uppercase  Returns result in uppercase                            [boolean] [default: false]
  -s, --separator  Separator of the slug                                     [string] [default: "-"]
  -r, --replace    Custom string replacement                                   [array] [default: []]
  -i, --ignore     String list to ignore                                       [array] [default: []]
  -S, --stdin      Use stdin as input                                     [boolean] [default: false]
  -h, --help                                                                               [boolean]

Examples:
  slugify "你好, world!" -r 好=good -r "world=Shi     Replace `,` with `!` and `world` with
  Jie"                                                `shijie`.
                                                      Result: ni-good-shi-jie
  slugify "你好，世界!" -i 你好 -i ，                 Ignore `你好` and `，`.
                                                      Result: 你好，shi-jie

```

## Caveats

Currently, `transliteration` only supports 1 to 1 code map (from Unicode to Latin). It is the simplest way to implement, but there are some limitations when dealing with polyphonic characters. It does not work well with all languages, please test all possible situations before using it. Some known issues are:

- **Chinese:** Polyphonic characters are not always transliterated correctly. Alternative: `pinyin`.

- **Japanese:** Most Japanese Kanji characters are transliterated into Chinese Pinyin because of the overlapped code map in Unicode. Also there are many polyphonic characters in Japanese which makes it impossible to transliterate Japanese Kanji correctly without tokenizing the sentence. Consider using `kuroshiro` for a better Kanji -> Romaji conversion.

- **Thai:** Currently it is not working. If you know how to fix it, please comment on [this](https://github.com/dzcpy/transliteration/issues/67) issue.

- **Cyrillic:** Cyrillic characters are overlapped between a few languages. The result might be inaccurate in some specific languages, for example Bulgarian.

If you find any other issues, please raise a ticket.

### License

MIT
