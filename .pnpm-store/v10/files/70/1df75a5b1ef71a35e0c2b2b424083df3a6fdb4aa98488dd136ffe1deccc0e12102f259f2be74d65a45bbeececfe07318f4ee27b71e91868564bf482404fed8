'use strict'
var t = require('tap')
var uniqueSlug = require('../index.js')

t.plan(5)
var slugA = uniqueSlug()
t.is(slugA.length, 8, 'random slugs are 8 chars')
t.notEqual(slugA, uniqueSlug(), "two slugs aren't the same")
var base = '/path/to/thingy'
var slugB = uniqueSlug(base)
t.is(slugB.length, 8, 'string based slugs are 8 chars')
t.is(slugB, uniqueSlug(base), 'two string based slugs, from the same string are the same')
t.notEqual(slugB, uniqueSlug(slugA), 'two string based slongs, from diff strings are different')
