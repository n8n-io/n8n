{
  'variables': {
    'openssl_fips': ''
  },
  'targets': [
    {
      'target_name': 'bufferutil',
      'sources': ['src/bufferutil.c'],
      'cflags': ['-std=c99'],
      'conditions': [
        ["OS=='mac'", {
          'variables': {
            'clang_version':
              '<!(cc -v 2>&1 | perl -ne \'print $1 if /clang version ([0-9]+(\\.[0-9]+){2,})/\')'
          },
          'xcode_settings': {
            'MACOSX_DEPLOYMENT_TARGET': '10.7'
          },
          'conditions': [
            # Use Perl v-strings to compare versions.
            ['clang_version and <!(perl -e \'print <(clang_version) cmp 12.0.0\')==1', {
              'xcode_settings': {
                'OTHER_CFLAGS': ['-arch arm64'],
                'OTHER_LDFLAGS': ['-arch arm64']
              }
            }]
          ]
        }]
      ]
    }
  ]
}
