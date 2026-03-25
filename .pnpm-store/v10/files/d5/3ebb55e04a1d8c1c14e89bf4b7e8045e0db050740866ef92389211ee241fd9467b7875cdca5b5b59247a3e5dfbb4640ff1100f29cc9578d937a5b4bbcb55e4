var mock = require('mock-fs');
module.exports = {
  '/path/to/dir': {
    '.system': 'SYSTEM',
    'def.dat': 'DEF',
    'abc.txt': 'ABC',
    'abc123.txt': 'ABC123',
    'subdir': {
      '.dot': 'DOT',
      'test456.dat': '456',
      'test789.txt': '789',
      'test123.txt': '123',
      'abc123.txt': 'ABC123',
      'subsubdir': {
        '.hidden': 'HIDDEN',
        'abc123.dat': 'ABC123',
        'def456.dat': '456'
      }
    },
    'otherdir': {
      '.other': 'DOT',
      'symlink.dat': mock.symlink({path:'/path/to/dir/subdir/test123.txt'}),
      'test789.txt': '789',
      'test123.txt': '123',
      'subsubdir': {
        '.hidden': 'HIDDEN',
        'abc123.txt': 'ABC123',
        'def456.txt': '456'
      }
    }
  }
};