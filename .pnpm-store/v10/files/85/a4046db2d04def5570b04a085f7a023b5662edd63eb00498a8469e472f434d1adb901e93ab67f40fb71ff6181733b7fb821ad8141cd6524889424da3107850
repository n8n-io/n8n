const Types = [
  {
    'name': 'GZIP',
    'file_extension': '.gz',
    'mime_type': 'application',
    'mime_subtypes': ['gzip', 'x-gzip'],
    'is_supported': true,
  },
  {
    'name': 'DEFLATE',
    'file_extension': '.deflate',
    'mime_type': 'application',
    'mime_subtypes': ['zlib', 'deflate'],
    'is_supported': true,
  },
  {
    'name': 'RAW_DEFLATE',
    'file_extension': '.raw_deflate',
    'mime_type': 'application',
    'mime_subtypes': ['raw_deflate'],
    'is_supported': true,
  },
  {
    'name': 'BZIP2',
    'file_extension': '.bz2',
    'mime_type': 'application',
    'mime_subtypes': ['bzip2', 'x-bzip2', 'x-bz2', 'x-bzip', 'bz2'],
    'is_supported': true,
  },
  {
    'name': 'LZIP',
    'file_extension': '.lz',
    'mime_type': 'application',
    'mime_subtypes': ['lzip', 'x-lzip'],
    'is_supported': false,
  },
  {
    'name': 'LZMA',
    'file_extension': '.lzma',
    'mime_type': 'application',
    'mime_subtypes': ['lzma', 'x-lzma'],
    'is_supported': false,
  },
  {
    'name': 'LZO',
    'file_extension': '.lzo',
    'mime_type': 'application',
    'mime_subtypes': ['lzo', 'x-lzo'],
    'is_supported': false,
  },
  {
    'name': 'XZ',
    'file_extension': '.xz',
    'mime_type': 'application',
    'mime_subtypes': ['xz', 'x-xz'],
    'is_supported': false,
  },
  {
    'name': 'COMPRESS',
    'file_extension': '.Z',
    'mime_type': 'application',
    'mime_subtypes': ['compress', 'x-compress'],
    'is_supported': false,
  },
  {
    'name': 'PARQUET',
    'file_extension': '.parquet',
    'mime_type': 'snowflake',
    'mime_subtypes': ['parquet'],
    'is_supported': true,
  },
  {
    'name': 'ZSTD',
    'file_extension': '.zst',
    'mime_type': 'application',
    'mime_subtypes': ['zstd', 'x-zstd'],
    'is_supported': true,
  },
  {
    'name': 'BROTLI',
    'file_extension': '.br',
    'mime_type': 'application',
    'mime_subtypes': ['br', 'x-br'],
    'is_supported': true,
  },
  {
    'name': 'ORC',
    'file_extension': '.orc',
    'mime_type': 'snowflake',
    'mime_subtypes': ['orc'],
    'is_supported': true,
  }
];

const subtypeToMeta = [];
for (const type of Types) {
  for (const ms of type['mime_subtypes']) {
    subtypeToMeta[ms] = type;
  }
}

/**
 * Return the file compression type based on subtype.
 *
 * @param {String} subtype
 *
 * @returns {Object} the file compression object
 */
exports.lookupByMimeSubType = function lookupByMimeSubType(subtype) {
  return subtypeToMeta[subtype.toLowerCase()];  
};

/**
 * Return the file compression type based on encoding.
 *
 * @param {String} encoding
 *
 * @returns {Object} the file compression object
 */
exports.lookupByEncoding = function lookupByEncoding(encoding) {
  encoding = encoding.substring(encoding.indexOf('/') + 1);
  return subtypeToMeta[encoding];
};
