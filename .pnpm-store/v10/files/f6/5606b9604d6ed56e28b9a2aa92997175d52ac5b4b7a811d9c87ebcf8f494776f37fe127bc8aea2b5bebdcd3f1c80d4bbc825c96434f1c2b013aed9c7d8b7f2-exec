#!/usr/bin/env node

var join = require('path').join;
var format = require('format-package-json');
var GitContributors = require('git-contributors').GitContributors;
var opts = join(__dirname, '../');
var pkg = join(__dirname, '../package.json');
var json = require(pkg);
 
json.contributors = []; //clear it

GitContributors.list(opts, function(err, result) {
    result.forEach(function(item) {
        json.contributors.push([item.name, '<' + item.email + '>'].join(' '));
    });
    json.contributors.sort();
    format(pkg, json, function() {
        console.log('Wrote %s contributors to: %s', result.length, pkg);
    });
});




