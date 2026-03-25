var common = require('./common');
var fs = require('fs');

common.register('sort', _sort, {
  canReceivePipe: true,
  cmdOptions: {
    'r': 'reverse',
    'n': 'numerical',
  },
});

// parse out the number prefix of a line
function parseNumber(str) {
  var match = str.match(/^\s*(\d*)\s*(.*)$/);
  return { num: Number(match[1]), value: match[2] };
}

// compare two strings case-insensitively, but examine case for strings that are
// case-insensitive equivalent
function unixCmp(a, b) {
  var aLower = a.toLowerCase();
  var bLower = b.toLowerCase();
  return (aLower === bLower ?
      -1 * a.localeCompare(b) : // unix sort treats case opposite how javascript does
      aLower.localeCompare(bLower));
}

// compare two strings in the fashion that unix sort's -n option works
function numericalCmp(a, b) {
  var objA = parseNumber(a);
  var objB = parseNumber(b);
  if (objA.hasOwnProperty('num') && objB.hasOwnProperty('num')) {
    return ((objA.num !== objB.num) ?
        (objA.num - objB.num) :
        unixCmp(objA.value, objB.value));
  } else {
    return unixCmp(objA.value, objB.value);
  }
}

//@
//@ ### sort([options,] file [, file ...])
//@ ### sort([options,] file_array)
//@
//@ Available options:
//@
//@ + `-r`: Reverse the results
//@ + `-n`: Compare according to numerical value
//@
//@ Examples:
//@
//@ ```javascript
//@ sort('foo.txt', 'bar.txt');
//@ sort('-r', 'foo.txt');
//@ ```
//@
//@ Return the contents of the `file`s, sorted line-by-line. Sorting multiple
//@ files mixes their content (just as unix `sort` does).
function _sort(options, files) {
  // Check if this is coming from a pipe
  var pipe = common.readFromPipe();

  if (!files && !pipe) common.error('no files given');

  files = [].slice.call(arguments, 1);

  if (pipe) {
    files.unshift('-');
  }

  var lines = files.reduce(function (accum, file) {
    if (file !== '-') {
      if (!fs.existsSync(file)) {
        common.error('no such file or directory: ' + file, { continue: true });
        return accum;
      } else if (common.statFollowLinks(file).isDirectory()) {
        common.error('read failed: ' + file + ': Is a directory', {
          continue: true,
        });
        return accum;
      }
    }

    var contents = file === '-' ? pipe : fs.readFileSync(file, 'utf8');
    return accum.concat(contents.trimRight().split('\n'));
  }, []);

  var sorted = lines.sort(options.numerical ? numericalCmp : unixCmp);

  if (options.reverse) {
    sorted = sorted.reverse();
  }

  return sorted.join('\n') + '\n';
}

module.exports = _sort;
