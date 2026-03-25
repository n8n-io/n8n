{
  'variables': {
    'real_openssl_major%': '0',
  },
  'targets': [
    {
      'target_name': 'sshcrypto',
      'include_dirs': [
        "<!(node -e \"require('nan')\")",
      ],
      'sources': [
        'src/binding.cc'
      ],
      'cflags': [ '-O3' ],

      # Needed for OpenSSL 3.x/node.js v17.x+
      'defines': [
        'OPENSSL_API_COMPAT=0x10100000L',
        'REAL_OPENSSL_MAJOR=<(real_openssl_major)',
      ],
    },
  ],
}
