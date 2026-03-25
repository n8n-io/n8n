# currency-codes

A node.js module to list and work on currency codes based on the [ISO 4217](http://en.wikipedia.org/wiki/ISO_4217) standard.

	npm install currency-codes

## code('EUR')

``` js
var cc = require('currency-codes');
console.log(cc.code('EUR'));

/*
{
	code: 'EUR',
	number: 978,
	digits: 2,
	currency: 'Euro',
	countries: [
		'andorra', 'austria', 'belgium', 'cyprus', 'estonia', 'finland',
		'france', 'germany', 'greece', 'ireland', 'italy', 'kosovo',
		'luxembourg', 'malta', 'monaco', 'montenegro', 'netherlands',
		'portugal', 'san marino', 'slovakia', 'slovenia', 'spain',
		'vatican city' ]
}
*/
```

## number(967)

``` js
var cc = require('currency-codes');
console.log(cc.number(967));

/*
{
	code: 'ZMW',
	number: 967,
	digits: 2,
	currency: 'Zambian kwacha',
	countries: [ 'zambia' ] }
*/
```

## country('colombia')

``` js
var cc = require('currency-codes');
console.log(cc.country('colombia'));

/*
[
	{
		code: 'COP',
		number: 170,
		digits: 2,
		currency: 'Colombian peso',
		countries: [ 'colombia' ]
	}, {
		code: 'COU',
		number: 970,
		digits: 2,
		currency: 'Unidad de Valor Real',
		countries: [ 'colombia' ]
	}
]
*/
```

## codes()

``` js
var cc = require('currency-codes');
console.log(cc.codes());

/*
[
	'AED',
	'AFN',
	...
	'ZAR',
	'ZMW'
]
*/
```

## numbers()

``` js
var cc = require('currency-codes');
console.log(cc.numbers());

/*
[
	'784',
	'971',
	...
	'710',
	'967'
]
*/
```

## countries()

``` js
var cc = require('currency-codes');
console.log(cc.countries());

/*
[ 
	'united arab emirates',
	'afghanistan',
	...
]
*/
```

## data

``` js
var data = require('currency-codes/data');
console.log(data);

/*
[{
	code: 'AED',
	number: '784',
	digits: 2,
	currency: 'United Arab Emirates dirham',
	countries: ['united arab emirates']
}, {
	code: 'AFN',
	number: '971',
	digits: 2,
	currency: 'Afghan afghani',
	countries: ['afghanistan']
}, {
	...
*/
```

## publishDate

```js
var cc = require('currency-codes');

console.log(cc.publishDate);

/*
2018-08-29
*/
```

## ISO-4217

Fetch the latest copy of ISO-4217 from the [maintainer](https://www.currency-iso.org/) and update this library's currency data file.

```bash
$ npm run iso

> currency-codes@1.5.1 iso currency-codes
> npm run iso:fetch-xml && npm run iso:ingest-xml


> currency-codes@1.5.1 iso:fetch-xml currency-codes
> node scripts/fetch-iso-4217-xml.js

Downloaded https://www.currency-iso.org/dam/downloads/lists/list_one.xml to iso-4217-list-one.xml

> currency-codes@1.5.1 iso:ingest-xml currency-codes
> node scripts/ingest-iso-4217-xml.js

Ingested iso-4217-list-one.xml into data.js
Wrote publish date to iso-4217-publish-date.js
```

Note: You may have to manually tweak the capitalization of some country's names.

# License

MIT
