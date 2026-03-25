{
  'targets': [
    {
      'target_name': 'cpufeatures',
      'dependencies': [ 'deps/cpu_features/cpu_features.gyp:cpu_features' ],
      'include_dirs': [
        'src',
        "<!(node -e \"require('nan')\")",
      ],
      'sources': [
        'src/binding.cc'
      ],
      'cflags': [ '-O3' ],
    },
  ],
}
