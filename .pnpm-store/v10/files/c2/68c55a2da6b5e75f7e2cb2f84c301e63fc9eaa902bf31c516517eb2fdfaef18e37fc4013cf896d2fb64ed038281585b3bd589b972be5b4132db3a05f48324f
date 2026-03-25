var mock = require('mock-fs');
module.exports = {
  '/path/to/dir': {
    '.system': 'SYSTEM',
    'def.dat': 'DEF',
    'abc.txt': 'ABC',
    'error-file.dat': mock.symlink({path:'/fake/path/file'}),
    'subdir': {
      '.dot': 'DOT',
      'test456.dat': '456',
      'test789.txt': '789',
      'test123.txt': '123',
      'subsubdir': {
        '.hidden': 'HIDDEN',
        'abc123.txt': '123',
        'def456.dat': '456'
      }
    },
    'otherdir': {
      '.other': 'DOT',
      'error-file.dat': mock.symlink({path:'/fake/path/file'}),
      'test789.txt': '789',
      'test123.txt': '123',
      'subsubdir': {
        '.hidden': 'HIDDEN',
        'abc123.txt': '123',
        'def456.dat': '456'
      }
    }
  }
};