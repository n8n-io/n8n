# js-levenshtein [![Build Status](https://travis-ci.org/gustf/js-levenshtein.svg?branch=master)](https://travis-ci.org/gustf/js-levenshtein)

A very efficient JS implementation calculating the Levenshtein distance, i.e. the difference between two strings.

Based on Wagner-Fischer dynamic programming algorithm, optimized for speed and memory
 - use a single distance vector instead of a matrix
 - loop unrolling on the outer loop
 - remove common prefixes/postfixes from the calculation
 - minimize the number of comparisons
 
## Install

```
$ npm install --save js-levenshtein
```


## Usage

```js
const levenshtein = require('js-levenshtein');

levenshtein('kitten', 'sitting');
//=> 3
```


## Benchmark

```
$ npm run bench
  
                      50 paragraphs, length max=500 min=240 avr=372.5
             162 op/s » js-levenshtein
              98 op/s » talisman
              94 op/s » levenshtein-edit-distance
              85 op/s » leven
              39 op/s » fast-levenshtein

                      100 sentences, length max=170 min=6 avr=57.5
           3,076 op/s » js-levenshtein
           2,024 op/s » talisman
           1,817 op/s » levenshtein-edit-distance
           1,633 op/s » leven
             800 op/s » fast-levenshtein

                      2000 words, length max=20 min=3 avr=9.5
           3,119 op/s » js-levenshtein
           2,416 op/s » talisman
           2,141 op/s » levenshtein-edit-distance
           1,855 op/s » leven
           1,260 op/s » fast-levenshtein
```

Benchmarks was performed with node v8.12.0 on a MacBook Pro 15", 2.9 GHz Intel Core i9

## License

MIT © Gustaf Andersson