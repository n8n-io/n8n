#!/usr/bin/env node

(function(){

   try {
      var dive = require('dive');
   } catch (ex) {
      console.error('this example requires "dive", please run "npm install dive"');
      process.exit(1);
   }

   var treeify = require('../treeify'),
       path = require('path'),
       fs = require('fs'),
       rootDir = process.argv.length < 3 ? '.' : process.argv[2],
       tree = {};

   if ( ! fs.existsSync(rootDir)) {
      console.error('path "' + rootDir + '" does not exist - unable to proceed!');
      process.exit(1);
   }

   console.log(rootDir !== '.' ? path.relative(process.cwd(), rootDir) : '.');

   function scanComplete() {
      process.stdout.write('\r       \r');
      console.log(treeify.asTree(tree, true));
   }

   dive(rootDir, { all: true, directories: true }, function(err, thisPath) {
      var relativePath = path.relative(rootDir, thisPath),
          node = tree;

      if (relativePath.indexOf('..') !== 0) {
         relativePath.split(path.sep).forEach(function(part) {
            typeof node[part] !== 'object' && (node[part] = {});
            node = node[part];
         });
      }

   }, scanComplete);

   process.stdout.write('wait... ');

})();
