node-simple-lru-cache
=====================

It's a very simple and extremely fast lru cache for node.js.

This cache will priorize the lastest used keys over the least used keys, 
so when a new key is added if the cache is full, the least used key will be removed

## Instalation
    
    npm install simple-lru-cache

## Usage
    var SimpleCache = require("simple-lru-cache")

    var cache = new SimpleCache({"maxSize":1000})

    //Add an Objet
    cache.set("hello","world")

    //Get an Object
    cache.get("hello")

    //Delete an Object
    cache.del("hello")

    //Reset cache
    cache.reset()

## Tests
    
    npm install
    npm test

## Benchmark against lru-cache

      make bench
