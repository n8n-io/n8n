var fs = require('fs');
var path = require('path');
var Promise = require('es6-promise').Promise;

function buildFilter(filters) {
  var filters = (filters instanceof Array) ? filters.slice() : [filters];
  var filterArray = [];

  if (filters.length === 0) return null;

  while(filters.length > 0) {
    var filter = filters.shift();
    filterArray.push('\\/?' + filter.replace(/\./g, '\\.')
       .replace(/(\*?)(\*)(?!\*)/g, function(match, prefix) {
          if(prefix == '*') {
             return match;
          }
          return '[^\\/]*';
       })
       .replace(/\?/g, '[^\\/]?')
       .replace(/\*\*/g, '\.*')
       .replace(/([\-\+\|])/g, '\\$1')
      );
  }
  return new RegExp('^' + filterArray.join('|') + '$', 'i');
}

function readfiles(dir, options, callback) {
  if (typeof options === 'function' || options === null) {
    callback = options;
    options = {};
  }
  options = options || {};
  callback = typeof callback === 'function' ? callback : function () {};

  return new Promise(function (resolve, reject) {

    var files = [];
    var subdirs = [];
    var filterRegExp = options.filter && buildFilter(options.filter);

    (function traverseDir(dirpath, done) {
      fs.readdir(dirpath, function (err, fileList) {
        if (err) {
          // if rejectOnError is not false, reject the promise
          if (options.rejectOnError !== false) {
            return reject(err);
          }
          return done(files);
        }

        // reverse the order of the files if the reverse option is true
        if (options.reverse === true) {
          fileList = fileList.reverse();
        }

        (function next() {

          // if the file list is empty then call done
          if (fileList.length === 0) {
            done(files);
            return;
          }

          var filename = fileList.shift();
          var relFilename = path.join(subdirs.join('/'), filename);
          var fullpath = path.join(dirpath, filename);

          // skip file if it's a hidden file and the hidden option is not set
          if (options.hidden !== true && /^\./.test(filename)) {
            return next();
          }

          // stat the full path
          fs.stat(fullpath, function (err, stat) {

            if (err) {
              // call callback with the error
              var result = callback(err, relFilename, null, stat);

              // if callback result is a function then call the result with next as a parameter
              if (typeof result === 'function' && !err) {
                return result(next);
              }

              // if rejectOnError is not false, reject the promise
              if (options.rejectOnError !== false) {
                return reject(err);
              }

              return next();
            }

            if (stat.isDirectory()) {

              // limit the depth of the traversal if depth is defined
              if (!isNaN(options.depth) && options.depth >= 0 && (subdirs.length + 1) > options.depth) {
                return next();
              }

              // traverse the sub-directory
              subdirs.push(filename);
              traverseDir(fullpath, function () {
                subdirs.pop();
                next();
              });

            } else if (stat.isFile()) {

              // test filters, if it does not match move to next file
              if (filterRegExp && !filterRegExp.test('/' + relFilename)) {
                return next();
              }

              // set the format of the output filename
              var outputName = relFilename;
              if (options.filenameFormat === readfiles.FULL_PATH) {
                outputName = fullpath;
              }else if (options.filenameFormat === readfiles.FILENAME) {
                outputName = filename;
              }
              files.push(outputName);

              // promise to handle file reading (if not disabled)
              new Promise(function (resolve) {
                if (options.readContents === false) {
                  return resolve(null);
                }
                // read the file
                fs.readFile(fullpath, options.encoding || 'utf8', function (err, content) {
                  if (err) throw err;
                  resolve(content);
                });
              }).then(function (content) {
                // call the callback with the content
                var result = callback(err, outputName, content, stat);

                // if callback result is a function then call the result with next as a parameter
                if (typeof result === 'function' && !err) {
                  return result(next);
                }
                // call the next if async is not true
                options.async !== true && next();
              }).catch(function (err) {
                if (options.rejectOnError !== false) {
                  return reject(err);
                }

                next();
              });

            } else {
              next();
            }

          });
        })();
      });
    })(dir, resolve);
  });
}

readfiles.RELATIVE = 0;
readfiles.FULL_PATH = 1;
readfiles.FILENAME = 2;

module.exports = readfiles;