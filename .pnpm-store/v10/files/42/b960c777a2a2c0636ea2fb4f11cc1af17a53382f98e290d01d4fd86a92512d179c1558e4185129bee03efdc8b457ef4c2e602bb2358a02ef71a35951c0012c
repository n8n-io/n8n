# inflected

[![Travis build status](https://img.shields.io/travis/martinandert/inflected/master.svg)](https://travis-ci.org/martinandert/inflected)
[![npm downloads](https://img.shields.io/npm/dm/inflected.svg)](https://npmjs.com/package/inflected)
[![no dependencies](https://img.shields.io/badge/dependencies-none-brightgreen.svg)](https://npmjs.com/package/inflected)
[![license](https://img.shields.io/github/license/martinandert/inflected.svg)](https://github.com/martinandert/inflected/blob/master/LICENSE.txt)

A port of ActiveSupport's inflector to Node.js. Also usable in the browser.


## Installation

Install via npm:

```bash
% npm install inflected
```

Or via yarn:

```bash
% yarn add inflected
```

The UMD build is also available on [unpkg](https://unpkg.com/), adding a `Inflector` object to the global scope.

```html
<script src="https://unpkg.com/inflected/dist/umd/inflected.min.js"></script>
```


## Usage

The module exports an object with several utility functions.

```js
var Inflector = require('inflected');

Inflector.pluralize('Category')  // => 'Categories'
```

If using ES modules, you can cherry-pick only the functions you're interested in:

```js
import { pluralize } from 'inflected';

pluralize('Category')  // => 'Categories'
```

Here is the complete API reference:


### Inflector.pluralize

```js
string pluralize(string word[, string locale])
```

Returns the plural form of the word in the string.

If passed an optional `locale` parameter, the word will be pluralized using rules defined for that language. By default, this parameter is set to "en".

```js
Inflector.pluralize('post')          // => 'posts'
Inflector.pluralize('octopus')       // => 'octopi'
Inflector.pluralize('sheep')         // => 'sheep'
Inflector.pluralize('words')         // => 'words'
Inflector.pluralize('CamelOctopus')  // => 'CamelOctopi'
Inflector.pluralize('ley', 'es')     // => 'leyes'
```


### Inflector.singularize

```js
string singularize(string word[, string locale])
```

The reverse of `pluralize`, returns the singular form of a word in a string.

If passed an optional `locale` parameter, the word will be singularized using rules defined for that language. By default, this parameter is set to "en".

```js
Inflector.singularize('posts')        // => 'post'
Inflector.singularize('octopi')       // => 'octopus'
Inflector.singularize('sheep')        // => 'sheep'
Inflector.singularize('word')         // => 'word'
Inflector.singularize('CamelOctopi')  // => 'CamelOctopus'
Inflector.singularize('leyes', 'es')  // => 'ley'
```


### Inflector.camelize

```js
string camelize(string term[, boolean uppercaseFirstLetter])
```

By default, `camelize` converts strings to UpperCamelCase. If the second argument is set to `false` then `camelize` produces lowerCamelCase.

```js
Inflector.camelize('foo_bar')         // => 'FooBar'
Inflector.camelize('foo_bar', false)  // => 'fooBar'
```

As a rule of thumb you can think of `camelize` as the inverse of `underscore`, though there are cases where that does not hold:

```js
Inflector.camelize(Inflector.underscore('SSLError'))  // => 'SslError'
```

### Inflector.underscore

```js
string underscore(string camelCasedWord)
```

Makes an underscored, lowercase form from the expression in the string.

```js
Inflector.underscore('FooBar')  // => 'foo_bar'
```

As a rule of thumb you can think of `underscore` as the inverse of `camelize`, though there are cases where that does not hold:

```js
Inflector.camelize(Inflector.underscore('SSLError'))  // => 'SslError'
```


### Inflector.humanize

```js
string humanize(string lowerCaseAndUnderscoredWord[, object options])
```

Capitalizes the first word, turns underscores into spaces, and strips a trailing "_id" if present.

Like `titleize`, this is meant for creating pretty output.

The capitalization of the first word can be turned off by setting the `capitalize` option key to `false`. By default, this option is `true`.

```js
Inflector.humanize('employee_salary')                   // => 'Employee salary'
Inflector.humanize('author_id')                         // => 'Author'
Inflector.humanize('author_id', { capitalize: false })  // => 'author'
```


### Inflector.titleize

```js
string titleize(string sentence)
```

Capitalizes all the words and replaces some characters in the string to create a nicer looking title. `titleize` is meant for creating pretty output.

```js
Inflector.titleize('man from the boondocks')   // => 'Man From The Boondocks'
Inflector.titleize('x-men: the last stand')    // => 'X Men: The Last Stand'
Inflector.titleize('TheManWithoutAPast')       // => 'The Man Without A Past'
Inflector.titleize('raiders_of_the_lost_ark')  // => 'Raiders Of The Lost Ark'
```


### Inflector.tableize

```js
string tableize(string className)
```

Create the name of a table like Rails does for models to table names. This method uses the `pluralize` method on the last word in the string.

```js
Inflector.tableize('RawScaledScorer')  // => 'raw_scaled_scorers'
Inflector.tableize('egg_and_ham')      // => 'egg_and_hams'
Inflector.tableize('fancyCategory')    // => 'fancy_categories'
```


### Inflector.classify

```js
string classify(string tableName)
```

Create a class name from a plural table name like Rails does for table names to models.

```js
Inflector.classify('egg_and_hams')  // => 'EggAndHam'
Inflector.classify('posts')         // => 'Post'
```

Singular names are not handled correctly:

```js
Inflector.classify('business')  // => 'Busines'
```


### Inflector.dasherize

```js
string dasherize(string underscoredWord)
```

Replaces underscores with dashes in the string.

```js
Inflector.dasherize('puni_puni')  // => 'puni-puni'
```


### Inflector.foreignKey

```js
string foreignKey(string className[, boolean separateClassNameAndIdWithUnderscore])
```

Creates a foreign key name from a class name. `separateClassNameAndIdWithUnderscore` sets whether the method should put "_" between the name and "id" (default: `true`).

```js
Inflector.foreignKey('Message')         // => 'message_id'
Inflector.foreignKey('Message', false)  // => 'messageid'
```


### Inflector.ordinal

```js
string ordinal(object number)
```

Returns the suffix that should be added to a number to denote the position in an ordered sequence such as 1st, 2nd, 3rd, 4th.

```js
Inflector.ordinal(1)      // => 'st'
Inflector.ordinal(2)      // => 'nd'
Inflector.ordinal(1002)   // => 'nd'
Inflector.ordinal(1003)   // => 'rd'
Inflector.ordinal(-11)    // => 'th'
Inflector.ordinal(-1021)  // => 'st'
```


### Inflector.ordinalize

```js
string ordinalize(object number)
```

Turns a number into an ordinal string used to denote the position in an ordered sequence such as 1st, 2nd, 3rd, 4th.

```js
Inflector.ordinalize(1)      // => '1st'
Inflector.ordinalize(2)      // => '2nd'
Inflector.ordinalize(1002)   // => '1002nd'
Inflector.ordinalize(1003)   // => '1003rd'
Inflector.ordinalize(-11)    // => '-11th'
Inflector.ordinalize(-1021)  // => '-1021st'
```


### Inflector.inflections

```js
Inflections inflections([string locale])
inflections([string locale], [function(Inflections) fn])
```

A singleton instance of the internal Inflections class is yielded by this function, which can then be used to specify additional inflection rules. If passed an optional locale, rules for other languages can be specified. The default locale is "en". Only rules for English are provided by this library.

```js
Inflector.inflections('en', function(inflect) {
  inflect.plural(/^(ox)$/i, '$1$2en');
  inflect.singular /^(ox)en/i, '$1');

  inflect.irregular('octopus', 'octopi');

  inflect.uncountable('equipment', 'snow');
});
```

New rules are added at the top. So in the example above, the irregular rule for octopus will now be the first of the pluralization and singularization rules that is run. This guarantees that your rules run before any of the rules that may already have been loaded.


### Inflector.transliterate

```js
string transliterate(string sentence[, object options])
```

Replaces non-ASCII characters with an ASCII approximation, or if none exists, a replacement character which defaults to "?".

```js
Inflector.transliterate('Ærøskøbing')  // => 'AEroskobing'
```

Default approximations are provided for Western/Latin characters, e.g, "ø", "ñ", "é", "ß", etc.

This method is I18n-aware, so you can set up custom approximations for a locale. This can be useful, for example, to transliterate German's "ü" and "ö" to "ue" and "oe", or to add support for transliterating Russian to ASCII.

In order to make your custom transliterations available, you must set them using the `approximate` helper function:

```js
Inflector.transliterations('de', function(t) {
  t.approximate('ü', 'ue');
  t.approximate('ö', 'oe');
});
```

Now you can have different transliterations for each locale:

```js
Inflector.transliterate('Jürgen')                    // => 'Jurgen'
Inflector.transliterate('Jürgen', { locale: 'de' })  // => 'Juergen'
```


### Inflector.parameterize

```js
string parameterize(string sentence[, object options])
```

Replaces special characters in a string so that it may be used as part of a 'pretty' URL.

```js
Inflector.parameterize('Donald E. Knuth')                      // => 'donald-e-knuth'
Inflector.parameterize('Donald E. Knuth', { separator: '+' })  // => 'donald+e+knuth'
```

As of v2.1, there's also a `preserveCase` option:

```js
Inflector.parameterize('Donald E. Knuth', { preserveCase: true })  // => 'Donald+E+Knuth'
```


### Inflector.constantify

```js
string constantify(string words)
```

Converts words (camelCased, under_scored, or dasherized) to CONSTANT_CASE.

```js
Inflector.constantify('bankAccount')   // => 'BANK_ACCOUNT'
Inflector.constantify('bank-account')  // => 'BANK_ACCOUNT'
Inflector.constantify('bank_account')  // => 'BANK_ACCOUNT'
Inflector.constantify('Bank Account')  // => 'BANK_ACCOUNT'
```



## Contributing

Here's a quick guide:

1. Fork the repo and `make install`.
2. Run the tests. We only take pull requests with passing tests, and it's great to know that you have a clean slate: `make test`.
3. Add a test for your change. Only refactoring and documentation changes require no new tests. If you are adding functionality or are fixing a bug, we need a test!
4. Make the test pass.
5. Push to your fork and submit a pull request.


## Licence

Released under The MIT License.
