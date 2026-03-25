{
  'includes': [ 'common-sqlite.gypi' ],

  'variables': {
    'sqlite_magic%': '',
  },

  'target_defaults': {
    'default_configuration': 'Release',
    'cflags':[
      '-std=c99'
    ],
    'configurations': {
      'Debug': {
        'defines': [ 'DEBUG', '_DEBUG' ],
        'msvs_settings': {
          'VCCLCompilerTool': {
            'RuntimeLibrary': 1, # static debug
          },
        },
      },
      'Release': {
        'defines': [ 'NDEBUG' ],
        'msvs_settings': {
          'VCCLCompilerTool': {
            'RuntimeLibrary': 0, # static release
          },
        },
      }
    },
    'msvs_settings': {
      'VCCLCompilerTool': {
      },
      'VCLibrarianTool': {
      },
      'VCLinkerTool': {
        'GenerateDebugInformation': 'true',
      },
    },
    'conditions': [
      ['OS == "win"', {
        'defines': [
          'WIN32'
        ],
      }]
    ],
  },

  'targets': [
    {
      'target_name': 'action_before_build',
      'type': 'none',
      'hard_dependency': 1,
      'actions': [
        {
          'action_name': 'unpack_sqlite_dep',
          'inputs': [
            './sqlite-autoconf-<@(sqlite_version).tar.gz'
          ],
          'outputs': [
            '<(SHARED_INTERMEDIATE_DIR)/sqlite-autoconf-<@(sqlite_version)/sqlite3.c'
          ],
          'action': ['node','./extract.js','./sqlite-autoconf-<@(sqlite_version).tar.gz','<(SHARED_INTERMEDIATE_DIR)']
        }
      ],
      'direct_dependent_settings': {
        'include_dirs': [
          '<(SHARED_INTERMEDIATE_DIR)/sqlite-autoconf-<@(sqlite_version)/',
        ]
      },
    },
    {
      'target_name': 'sqlite3',
      'type': 'static_library',
      'include_dirs': [ '<(SHARED_INTERMEDIATE_DIR)/sqlite-autoconf-<@(sqlite_version)/' ],
      'dependencies': [
        'action_before_build'
      ],
      'sources': [
        '<(SHARED_INTERMEDIATE_DIR)/sqlite-autoconf-<@(sqlite_version)/sqlite3.c'
      ],
      'direct_dependent_settings': {
        'include_dirs': [ '<(SHARED_INTERMEDIATE_DIR)/sqlite-autoconf-<@(sqlite_version)/' ],
        'defines': [
          'SQLITE_THREADSAFE=1',
          'HAVE_USLEEP=1',
          'SQLITE_ENABLE_FTS3',
          'SQLITE_ENABLE_FTS4',
          'SQLITE_ENABLE_FTS5',
          'SQLITE_ENABLE_RTREE',
          'SQLITE_ENABLE_DBSTAT_VTAB=1',
          'SQLITE_ENABLE_MATH_FUNCTIONS'
        ],
      },
      'cflags_cc': [
          '-Wno-unused-value'
      ],
      'defines': [
        '_REENTRANT=1',
        'SQLITE_THREADSAFE=1',
        'HAVE_USLEEP=1',
        'SQLITE_ENABLE_FTS3',
        'SQLITE_ENABLE_FTS4',
        'SQLITE_ENABLE_FTS5',
        'SQLITE_ENABLE_RTREE',
        'SQLITE_ENABLE_DBSTAT_VTAB=1',
        'SQLITE_ENABLE_MATH_FUNCTIONS'
      ],
      'export_dependent_settings': [
        'action_before_build',
      ],
      'conditions': [
        ["sqlite_magic != ''", {
            'defines': [
              'SQLITE_FILE_HEADER="<(sqlite_magic)"'
            ]
        }]
      ],
    }
  ]
}
