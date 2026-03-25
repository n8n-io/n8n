{
  'variables' : {
    'node_engine_include_dir%': 'deps/v8/include',
    'node_host_binary%': 'node',
    'node_with_ltcg%': 'true',
  },
  'target_defaults': {
    'type': 'loadable_module',
    'win_delay_load_hook': 'true',
    'product_prefix': '',

    'conditions': [
      [ 'node_engine=="chakracore"', {
        'variables': {
          'node_engine_include_dir%': 'deps/chakrashim/include'
        },
      }]
    ],

    'include_dirs': [
      '<(node_root_dir)/include/node',
      '<(node_root_dir)/src',
      '<(node_root_dir)/deps/openssl/config',
      '<(node_root_dir)/deps/openssl/openssl/include',
      '<(node_root_dir)/deps/uv/include',
      '<(node_root_dir)/deps/zlib',
      '<(node_root_dir)/<(node_engine_include_dir)'
    ],
    'defines!': [
      'BUILDING_UV_SHARED=1',  # Inherited from common.gypi.
      'BUILDING_V8_SHARED=1',  # Inherited from common.gypi.
    ],
    'defines': [
      'NODE_GYP_MODULE_NAME=>(_target_name)',
      'USING_UV_SHARED=1',
      'USING_V8_SHARED=1',
      # Warn when using deprecated V8 APIs.
      'V8_DEPRECATION_WARNINGS=1'
    ],

    'target_conditions': [
      ['_type=="loadable_module"', {
        'product_extension': 'node',
        'defines': [
          'BUILDING_NODE_EXTENSION'
        ],
        'xcode_settings': {
          'OTHER_LDFLAGS': [
            '-undefined dynamic_lookup'
          ],
        },
      }],

      ['_type=="static_library"', {
        # set to `1` to *disable* the -T thin archive 'ld' flag.
        # older linkers don't support this flag.
        'standalone_static_library': '<(standalone_static_library)'
      }],

      ['_type!="executable"', {
        'conditions': [
          [ 'OS=="android"', {
            'cflags!': [ '-fPIE' ],
          }]
        ]
      }],

      ['_win_delay_load_hook=="true"', {
        # If the addon specifies `'win_delay_load_hook': 'true'` in its
        # binding.gyp, link a delay-load hook into the DLL. This hook ensures
        # that the addon will work regardless of whether the node/iojs binary
        # is named node.exe, iojs.exe, or something else.
        'conditions': [
          [ 'OS=="win"', {
            'defines': [ 'HOST_BINARY=\"<(node_host_binary)<(EXECUTABLE_SUFFIX)\"', ],
            'sources': [
              '<(node_gyp_dir)/src/win_delay_load_hook.cc',
            ],
            'msvs_settings': {
              'VCLinkerTool': {
                'DelayLoadDLLs': [ '<(node_host_binary)<(EXECUTABLE_SUFFIX)' ],
                # Don't print a linker warning when no imports from either .exe
                # are used.
                'AdditionalOptions': [ '/ignore:4199' ],
              },
            },
          }],
        ],
      }],
    ],

    'conditions': [
      [ 'OS=="mac"', {
        'defines': [
          '_DARWIN_USE_64_BIT_INODE=1'
        ],
        'xcode_settings': {
          'DYLIB_INSTALL_NAME_BASE': '@rpath'
        },
      }],
      [ 'OS=="aix"', {
        'ldflags': [
          '-Wl,-bimport:<(node_exp_file)'
        ],
      }],
      [ 'OS=="zos"', {
        'cflags': [
          '-q64',
          '-Wc,DLL',
          '-qlonglong',
          '-qenum=int',
          '-qxclang=-fexec-charset=ISO8859-1'
        ],
        'defines': [
          '_ALL_SOURCE=1',
          'MAP_FAILED=-1',
          '_UNIX03_SOURCE=1'
        ],
        'ldflags': [
          '-q64',
          '<(node_exp_file)'
        ],
      }],
      [ 'OS=="win"', {
        'conditions': [
          ['node_engine=="chakracore"', {
            'library_dirs': [ '<(node_root_dir)/$(ConfigurationName)' ],
            'libraries': [ '<@(node_engine_libs)' ],
          }],
          ['node_with_ltcg=="true"', {
            'msvs_settings': {
              'VCCLCompilerTool': {
                'WholeProgramOptimization': 'true' # /GL, whole program optimization, needed for LTCG
              },
              'VCLibrarianTool': {
                'AdditionalOptions': [
                  '/LTCG:INCREMENTAL', # incremental link-time code generation
                ]
              },
              'VCLinkerTool': {
                'OptimizeReferences': 2, # /OPT:REF
                'EnableCOMDATFolding': 2, # /OPT:ICF
                'LinkIncremental': 1, # disable incremental linking
                'AdditionalOptions': [
                  '/LTCG:INCREMENTAL', # incremental link-time code generation
                ]
              }
            }
          }]
        ],
        'libraries': [
          '-lkernel32.lib',
          '-luser32.lib',
          '-lgdi32.lib',
          '-lwinspool.lib',
          '-lcomdlg32.lib',
          '-ladvapi32.lib',
          '-lshell32.lib',
          '-lole32.lib',
          '-loleaut32.lib',
          '-luuid.lib',
          '-lodbc32.lib',
          '-lDelayImp.lib',
          '-l"<(node_lib_file)"'
        ],
        'msvs_disabled_warnings': [
          # warning C4251: 'node::ObjectWrap::handle_' : class 'v8::Persistent<T>'
          # needs to have dll-interface to be used by
          # clients of class 'node::ObjectWrap'
          4251
        ],
      }, {
        # OS!="win"
        'defines': [
          '_LARGEFILE_SOURCE',
          '_FILE_OFFSET_BITS=64'
        ],
      }],
      [ 'OS in "freebsd openbsd netbsd solaris android" or \
         (OS=="linux" and target_arch!="ia32")', {
        'cflags': [ '-fPIC' ],
      }],
    ]
  }
}
