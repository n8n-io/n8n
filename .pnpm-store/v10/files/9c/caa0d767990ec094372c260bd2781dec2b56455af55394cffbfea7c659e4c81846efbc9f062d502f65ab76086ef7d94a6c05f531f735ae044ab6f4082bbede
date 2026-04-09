/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * File format description for the parquet file format
 */
namespace cpp parquet
namespace java org.apache.parquet.format

/**
 * Types supported by Parquet.  These types are intended to be used in combination
 * with the encodings to control the on disk storage format.
 * For example INT16 is not included as a type since a good encoding of INT32
 * would handle this.
 */
enum Type {
  BOOLEAN = 0;
  INT32 = 1;
  INT64 = 2;
  INT96 = 3;  // deprecated, only used by legacy implementations.
  FLOAT = 4;
  DOUBLE = 5;
  BYTE_ARRAY = 6;
  FIXED_LEN_BYTE_ARRAY = 7;
}

/**
 * DEPRECATED: Common types used by frameworks(e.g. hive, pig) using parquet.
 * ConvertedType is superseded by LogicalType.  This enum should not be extended.
 *
 * See LogicalTypes.md for conversion between ConvertedType and LogicalType.
 */
enum ConvertedType {
  /** a BYTE_ARRAY actually contains UTF8 encoded chars */
  UTF8 = 0;

  /** a map is converted as an optional field containing a repeated key/value pair */
  MAP = 1;

  /** a key/value pair is converted into a group of two fields */
  MAP_KEY_VALUE = 2;

  /** a list is converted into an optional field containing a repeated field for its
   * values */
  LIST = 3;

  /** an enum is converted into a binary field */
  ENUM = 4;

  /**
   * A decimal value.
   *
   * This may be used to annotate binary or fixed primitive types. The
   * underlying byte array stores the unscaled value encoded as two's
   * complement using big-endian byte order (the most significant byte is the
   * zeroth element). The value of the decimal is the value * 10^{-scale}.
   *
   * This must be accompanied by a (maximum) precision and a scale in the
   * SchemaElement. The precision specifies the number of digits in the decimal
   * and the scale stores the location of the decimal point. For example 1.23
   * would have precision 3 (3 total digits) and scale 2 (the decimal point is
   * 2 digits over).
   */
  DECIMAL = 5;

  /**
   * A Date
   *
   * Stored as days since Unix epoch, encoded as the INT32 physical type.
   *
   */
  DATE = 6;

  /**
   * A time
   *
   * The total number of milliseconds since midnight.  The value is stored
   * as an INT32 physical type.
   */
  TIME_MILLIS = 7;

  /**
   * A time.
   *
   * The total number of microseconds since midnight.  The value is stored as
   * an INT64 physical type.
   */
  TIME_MICROS = 8;

  /**
   * A date/time combination
   *
   * Date and time recorded as milliseconds since the Unix epoch.  Recorded as
   * a physical type of INT64.
   */
  TIMESTAMP_MILLIS = 9;

  /**
   * A date/time combination
   *
   * Date and time recorded as microseconds since the Unix epoch.  The value is
   * stored as an INT64 physical type.
   */
  TIMESTAMP_MICROS = 10;


  /**
   * An unsigned integer value.
   *
   * The number describes the maximum number of meaningful data bits in
   * the stored value. 8, 16 and 32 bit values are stored using the
   * INT32 physical type.  64 bit values are stored using the INT64
   * physical type.
   *
   */
  UINT_8 = 11;
  UINT_16 = 12;
  UINT_32 = 13;
  UINT_64 = 14;

  /**
   * A signed integer value.
   *
   * The number describes the maximum number of meaningful data bits in
   * the stored value. 8, 16 and 32 bit values are stored using the
   * INT32 physical type.  64 bit values are stored using the INT64
   * physical type.
   *
   */
  INT_8 = 15;
  INT_16 = 16;
  INT_32 = 17;
  INT_64 = 18;

  /**
   * An embedded JSON document
   *
   * A JSON document embedded within a single UTF8 column.
   */
  JSON = 19;

  /**
   * An embedded BSON document
   *
   * A BSON document embedded within a single BINARY column.
   */
  BSON = 20;

  /**
   * An interval of time
   *
   * This type annotates data stored as a FIXED_LEN_BYTE_ARRAY of length 12
   * This data is composed of three separate little endian unsigned
   * integers.  Each stores a component of a duration of time.  The first
   * integer identifies the number of months associated with the duration,
   * the second identifies the number of days associated with the duration
   * and the third identifies the number of milliseconds associated with
   * the provided duration.  This duration of time is independent of any
   * particular timezone or date.
   */
  INTERVAL = 21;
}

/**
 * Representation of Schemas
 */
enum FieldRepetitionType {
  /** This field is required (can not be null) and each record has exactly 1 value. */
  REQUIRED = 0;

  /** The field is optional (can be null) and each record has 0 or 1 values. */
  OPTIONAL = 1;

  /** The field is repeated and can contain 0 or more values */
  REPEATED = 2;
}

/**
 * Statistics per row group and per page
 * All fields are optional.
 */
struct Statistics {
   /**
    * DEPRECATED: min and max value of the column. Use min_value and max_value.
    *
    * Values are encoded using PLAIN encoding, except that variable-length byte
    * arrays do not include a length prefix.
    *
    * These fields encode min and max values determined by signed comparison
    * only. New files should use the correct order for a column's logical type
    * and store the values in the min_value and max_value fields.
    *
    * To support older readers, these may be set when the column order is
    * signed.
    */
   1: optional binary max;
   2: optional binary min;
   /** count of null value in the column */
   3: optional i64 null_count;
   /** count of distinct values occurring */
   4: optional i64 distinct_count;
   /**
    * Min and max values for the column, determined by its ColumnOrder.
    *
    * Values are encoded using PLAIN encoding, except that variable-length byte
    * arrays do not include a length prefix.
    */
   5: optional binary max_value;
   6: optional binary min_value;
}

/** Empty structs to use as logical type annotations */
struct StringType {}  // allowed for BINARY, must be encoded with UTF-8
struct UUIDType {}    // allowed for FIXED[16], must encoded raw UUID bytes
struct MapType {}     // see LogicalTypes.md
struct ListType {}    // see LogicalTypes.md
struct EnumType {}    // allowed for BINARY, must be encoded with UTF-8
struct DateType {}    // allowed for INT32

/**
 * Logical type to annotate a column that is always null.
 *
 * Sometimes when discovering the schema of existing data, values are always
 * null and the physical type can't be determined. This annotation signals
 * the case where the physical type was guessed from all null values.
 */
struct NullType {}    // allowed for any physical type, only null values stored

/**
 * Decimal logical type annotation
 *
 * To maintain forward-compatibility in v1, implementations using this logical
 * type must also set scale and precision on the annotated SchemaElement.
 *
 * Allowed for physical types: INT32, INT64, FIXED, and BINARY
 */
struct DecimalType {
  1: required i32 scale
  2: required i32 precision
}

/** Time units for logical types */
struct MilliSeconds {}
struct MicroSeconds {}
struct NanoSeconds {}
union TimeUnit {
  1: MilliSeconds MILLIS
  2: MicroSeconds MICROS
  3: NanoSeconds NANOS
}

/**
 * Timestamp logical type annotation
 *
 * Allowed for physical types: INT64
 */
struct TimestampType {
  1: required bool isAdjustedToUTC
  2: required TimeUnit unit
}

/**
 * Time logical type annotation
 *
 * Allowed for physical types: INT32 (millis), INT64 (micros, nanos)
 */
struct TimeType {
  1: required bool isAdjustedToUTC
  2: required TimeUnit unit
}

/**
 * Integer logical type annotation
 *
 * bitWidth must be 8, 16, 32, or 64.
 *
 * Allowed for physical types: INT32, INT64
 */
struct IntType {
  1: required i8 bitWidth
  2: required bool isSigned
}

/**
 * Embedded JSON logical type annotation
 *
 * Allowed for physical types: BINARY
 */
struct JsonType {
}

/**
 * Embedded BSON logical type annotation
 *
 * Allowed for physical types: BINARY
 */
struct BsonType {
}

/**
 * LogicalType annotations to replace ConvertedType.
 *
 * To maintain compatibility, implementations using LogicalType for a
 * SchemaElement must also set the corresponding ConvertedType (if any)
 * from the following table.
 */
union LogicalType {
  1:  StringType STRING       // use ConvertedType UTF8
  2:  MapType MAP             // use ConvertedType MAP
  3:  ListType LIST           // use ConvertedType LIST
  4:  EnumType ENUM           // use ConvertedType ENUM
  5:  DecimalType DECIMAL     // use ConvertedType DECIMAL + SchemaElement.{scale, precision}
  6:  DateType DATE           // use ConvertedType DATE

  // use ConvertedType TIME_MICROS for TIME(isAdjustedToUTC = *, unit = MICROS)
  // use ConvertedType TIME_MILLIS for TIME(isAdjustedToUTC = *, unit = MILLIS)
  7:  TimeType TIME

  // use ConvertedType TIMESTAMP_MICROS for TIMESTAMP(isAdjustedToUTC = *, unit = MICROS)
  // use ConvertedType TIMESTAMP_MILLIS for TIMESTAMP(isAdjustedToUTC = *, unit = MILLIS)
  8:  TimestampType TIMESTAMP

  // 9: reserved for INTERVAL
  10: IntType INTEGER         // use ConvertedType INT_* or UINT_*
  11: NullType UNKNOWN        // no compatible ConvertedType
  12: JsonType JSON           // use ConvertedType JSON
  13: BsonType BSON           // use ConvertedType BSON
  14: UUIDType UUID           // no compatible ConvertedType
}

/**
 * Represents a element inside a schema definition.
 *  - if it is a group (inner node) then type is undefined and num_children is defined
 *  - if it is a primitive type (leaf) then type is defined and num_children is undefined
 * the nodes are listed in depth first traversal order.
 */
struct SchemaElement {
  /** Data type for this field. Not set if the current element is a non-leaf node */
  1: optional Type type;

  /** If type is FIXED_LEN_BYTE_ARRAY, this is the byte length of the vales.
   * Otherwise, if specified, this is the maximum bit length to store any of the values.
   * (e.g. a low cardinality INT col could have this set to 3).  Note that this is
   * in the schema, and therefore fixed for the entire file.
   */
  2: optional i32 type_length;

  /** repetition of the field. The root of the schema does not have a repetition_type.
   * All other nodes must have one */
  3: optional FieldRepetitionType repetition_type;

  /** Name of the field in the schema */
  4: required string name;

  /** Nested fields.  Since thrift does not support nested fields,
   * the nesting is flattened to a single list by a depth-first traversal.
   * The children count is used to construct the nested relationship.
   * This field is not set when the element is a primitive type
   */
  5: optional i32 num_children;

  /**
   * DEPRECATED: When the schema is the result of a conversion from another model.
   * Used to record the original type to help with cross conversion.
   *
   * This is superseded by logicalType.
   */
  6: optional ConvertedType converted_type;

  /**
   * DEPRECATED: Used when this column contains decimal data.
   * See the DECIMAL converted type for more details.
   *
   * This is superseded by using the DecimalType annotation in logicalType.
   */
  7: optional i32 scale
  8: optional i32 precision

  /** When the original schema supports field ids, this will save the
   * original field id in the parquet schema
   */
  9: optional i32 field_id;

  /**
   * The logical type of this SchemaElement
   *
   * LogicalType replaces ConvertedType, but ConvertedType is still required
   * for some logical types to ensure forward-compatibility in format v1.
   */
  10: optional LogicalType logicalType
}

/**
 * Encodings supported by Parquet.  Not all encodings are valid for all types.  These
 * enums are also used to specify the encoding of definition and repetition levels.
 * See the accompanying doc for the details of the more complicated encodings.
 */
enum Encoding {
  /** Default encoding.
   * BOOLEAN - 1 bit per value. 0 is false; 1 is true.
   * INT32 - 4 bytes per value.  Stored as little-endian.
   * INT64 - 8 bytes per value.  Stored as little-endian.
   * FLOAT - 4 bytes per value.  IEEE. Stored as little-endian.
   * DOUBLE - 8 bytes per value.  IEEE. Stored as little-endian.
   * BYTE_ARRAY - 4 byte length stored as little endian, followed by bytes.
   * FIXED_LEN_BYTE_ARRAY - Just the bytes.
   */
  PLAIN = 0;

  /** Group VarInt encoding for INT32/INT64.
   * This encoding is deprecated. It was never used
   */
  //  GROUP_VAR_INT = 1;

  /**
   * Deprecated: Dictionary encoding. The values in the dictionary are encoded in the
   * plain type.
   * in a data page use RLE_DICTIONARY instead.
   * in a Dictionary page use PLAIN instead
   */
  PLAIN_DICTIONARY = 2;

  /** Group packed run length encoding. Usable for definition/repetition levels
   * encoding and Booleans (on one bit: 0 is false; 1 is true.)
   */
  RLE = 3;

  /** Bit packed encoding.  This can only be used if the data has a known max
   * width.  Usable for definition/repetition levels encoding.
   */
  BIT_PACKED = 4;

  /** Delta encoding for integers. This can be used for int columns and works best
   * on sorted data
   */
  DELTA_BINARY_PACKED = 5;

  /** Encoding for byte arrays to separate the length values and the data. The lengths
   * are encoded using DELTA_BINARY_PACKED
   */
  DELTA_LENGTH_BYTE_ARRAY = 6;

  /** Incremental-encoded byte array. Prefix lengths are encoded using DELTA_BINARY_PACKED.
   * Suffixes are stored as delta length byte arrays.
   */
  DELTA_BYTE_ARRAY = 7;

  /** Dictionary encoding: the ids are encoded using the RLE encoding
   */
  RLE_DICTIONARY = 8;

  /** Encoding for floating-point data.
      K byte-streams are created where K is the size in bytes of the data type.
      The individual bytes of an FP value are scattered to the corresponding stream and
      the streams are concatenated.
      This itself does not reduce the size of the data but can lead to better compression
      afterwards.
   */
  BYTE_STREAM_SPLIT = 9;
}

/**
 * Supported compression algorithms.
 *
 * Codecs added in format version X.Y can be read by readers based on X.Y and later.
 * Codec support may vary between readers based on the format version and
 * libraries available at runtime.
 *
 * See Compression.md for a detailed specification of these algorithms.
 */
enum CompressionCodec {
  UNCOMPRESSED = 0;
  SNAPPY = 1;
  GZIP = 2;
  LZO = 3;
  BROTLI = 4;  // Added in 2.4
  LZ4 = 5;     // DEPRECATED (Added in 2.4)
  ZSTD = 6;    // Added in 2.4
  LZ4_RAW = 7; // Added in 2.9
}

enum PageType {
  DATA_PAGE = 0;
  INDEX_PAGE = 1;
  DICTIONARY_PAGE = 2;
  DATA_PAGE_V2 = 3;
}

/**
 * Enum to annotate whether lists of min/max elements inside ColumnIndex
 * are ordered and if so, in which direction.
 */
enum BoundaryOrder {
  UNORDERED = 0;
  ASCENDING = 1;
  DESCENDING = 2;
}

/** Data page header */
struct DataPageHeader {
  /** Number of values, including NULLs, in this data page. **/
  1: required i32 num_values

  /** Encoding used for this data page **/
  2: required Encoding encoding

  /** Encoding used for definition levels **/
  3: required Encoding definition_level_encoding;

  /** Encoding used for repetition levels **/
  4: required Encoding repetition_level_encoding;

  /** Optional statistics for the data in this page**/
  5: optional Statistics statistics;
}

struct IndexPageHeader {
  // TODO
}

struct DictionaryPageHeader {
  /** Number of values in the dictionary **/
  1: required i32 num_values;

  /** Encoding using this dictionary page **/
  2: required Encoding encoding

  /** If true, the entries in the dictionary are sorted in ascending order **/
  3: optional bool is_sorted;
}

/**
 * New page format allowing reading levels without decompressing the data
 * Repetition and definition levels are uncompressed
 * The remaining section containing the data is compressed if is_compressed is true
 **/
struct DataPageHeaderV2 {
  /** Number of values, including NULLs, in this data page. **/
  1: required i32 num_values
  /** Number of NULL values, in this data page.
      Number of non-null = num_values - num_nulls which is also the number of values in the data section **/
  2: required i32 num_nulls
  /** Number of rows in this data page. which means pages change on record boundaries (r = 0) **/
  3: required i32 num_rows
  /** Encoding used for data in this page **/
  4: required Encoding encoding

  // repetition levels and definition levels are always using RLE (without size in it)

  /** length of the definition levels */
  5: required i32 definition_levels_byte_length;
  /** length of the repetition levels */
  6: required i32 repetition_levels_byte_length;

  /**  whether the values are compressed.
  Which means the section of the page between
  definition_levels_byte_length + repetition_levels_byte_length + 1 and compressed_page_size (included)
  is compressed with the compression_codec.
  If missing it is considered compressed */
  7: optional bool is_compressed = 1;

  /** optional statistics for the data in this page **/
  8: optional Statistics statistics;
}

/** Block-based algorithm type annotation. **/
struct SplitBlockAlgorithm {}
/** The algorithm used in Bloom filter. **/
union BloomFilterAlgorithm {
  /** Block-based Bloom filter. **/
  1: SplitBlockAlgorithm BLOCK;
}

/** Hash strategy type annotation. xxHash is an extremely fast non-cryptographic hash
 * algorithm. It uses 64 bits version of xxHash.
 **/
struct XxHash {}

/**
 * The hash function used in Bloom filter. This function takes the hash of a column value
 * using plain encoding.
 **/
union BloomFilterHash {
  /** xxHash Strategy. **/
  1: XxHash XXHASH;
}

/**
 * The compression used in the Bloom filter.
 **/
struct Uncompressed {}
union BloomFilterCompression {
  1: Uncompressed UNCOMPRESSED;
}

/**
  * Bloom filter header is stored at beginning of Bloom filter data of each column
  * and followed by its bitset.
  **/
struct BloomFilterHeader {
  /** The size of bitset in bytes **/
  1: required i32 numBytes;
  /** The algorithm for setting bits. **/
  2: required BloomFilterAlgorithm algorithm;
  /** The hash function used for Bloom filter. **/
  3: required BloomFilterHash hash;
  /** The compression used in the Bloom filter **/
  4: required BloomFilterCompression compression;
}

struct PageHeader {
  /** the type of the page: indicates which of the *_header fields is set **/
  1: required PageType type

  /** Uncompressed page size in bytes (not including this header) **/
  2: required i32 uncompressed_page_size

  /** Compressed (and potentially encrypted) page size in bytes, not including this header **/
  3: required i32 compressed_page_size

  /** The 32bit CRC for the page, to be be calculated as follows:
   * - Using the standard CRC32 algorithm
   * - On the data only, i.e. this header should not be included. 'Data'
   *   hereby refers to the concatenation of the repetition levels, the
   *   definition levels and the column value, in this exact order.
   * - On the encoded versions of the repetition levels, definition levels and
   *   column values
   * - On the compressed versions of the repetition levels, definition levels
   *   and column values where possible;
   *   - For v1 data pages, the repetition levels, definition levels and column
   *     values are always compressed together. If a compression scheme is
   *     specified, the CRC shall be calculated on the compressed version of
   *     this concatenation. If no compression scheme is specified, the CRC
   *     shall be calculated on the uncompressed version of this concatenation.
   *   - For v2 data pages, the repetition levels and definition levels are
   *     handled separately from the data and are never compressed (only
   *     encoded). If a compression scheme is specified, the CRC shall be
   *     calculated on the concatenation of the uncompressed repetition levels,
   *     uncompressed definition levels and the compressed column values.
   *     If no compression scheme is specified, the CRC shall be calculated on
   *     the uncompressed concatenation.
   * - In encrypted columns, CRC is calculated after page encryption; the
   *   encryption itself is performed after page compression (if compressed)
   * If enabled, this allows for disabling checksumming in HDFS if only a few
   * pages need to be read.
   **/
  4: optional i32 crc

  // Headers for page specific data.  One only will be set.
  5: optional DataPageHeader data_page_header;
  6: optional IndexPageHeader index_page_header;
  7: optional DictionaryPageHeader dictionary_page_header;
  8: optional DataPageHeaderV2 data_page_header_v2;
}

/**
 * Wrapper struct to store key values
 */
 struct KeyValue {
  1: required string key
  2: optional string value
}

/**
 * Wrapper struct to specify sort order
 */
struct SortingColumn {
  /** The column index (in this row group) **/
  1: required i32 column_idx

  /** If true, indicates this column is sorted in descending order. **/
  2: required bool descending

  /** If true, nulls will come before non-null values, otherwise,
   * nulls go at the end. */
  3: required bool nulls_first
}

/**
 * statistics of a given page type and encoding
 */
struct PageEncodingStats {

  /** the page type (data/dic/...) **/
  1: required PageType page_type;

  /** encoding of the page **/
  2: required Encoding encoding;

  /** number of pages of this type with this encoding **/
  3: required i32 count;

}

/**
 * Description for column metadata
 */
struct ColumnMetaData {
  /** Type of this column **/
  1: required Type type

  /** Set of all encodings used for this column. The purpose is to validate
   * whether we can decode those pages. **/
  2: required list<Encoding> encodings

  /** Path in schema **/
  3: required list<string> path_in_schema

  /** Compression codec **/
  4: required CompressionCodec codec

  /** Number of values in this column **/
  5: required i64 num_values

  /** total byte size of all uncompressed pages in this column chunk (including the headers) **/
  6: required i64 total_uncompressed_size

  /** total byte size of all compressed, and potentially encrypted, pages
   *  in this column chunk (including the headers) **/
  7: required i64 total_compressed_size

  /** Optional key/value metadata **/
  8: optional list<KeyValue> key_value_metadata

  /** Byte offset from beginning of file to first data page **/
  9: required i64 data_page_offset

  /** Byte offset from beginning of file to root index page **/
  10: optional i64 index_page_offset

  /** Byte offset from the beginning of file to first (only) dictionary page **/
  11: optional i64 dictionary_page_offset

  /** optional statistics for this column chunk */
  12: optional Statistics statistics;

  /** Set of all encodings used for pages in this column chunk.
   * This information can be used to determine if all data pages are
   * dictionary encoded for example **/
  13: optional list<PageEncodingStats> encoding_stats;

  /** Byte offset from beginning of file to Bloom filter data. **/
  14: optional i64 bloom_filter_offset;
}

struct EncryptionWithFooterKey {
}

struct EncryptionWithColumnKey {
  /** Column path in schema **/
  1: required list<string> path_in_schema

  /** Retrieval metadata of column encryption key **/
  2: optional binary key_metadata
}

union ColumnCryptoMetaData {
  1: EncryptionWithFooterKey ENCRYPTION_WITH_FOOTER_KEY
  2: EncryptionWithColumnKey ENCRYPTION_WITH_COLUMN_KEY
}

struct ColumnChunk {
  /** File where column data is stored.  If not set, assumed to be same file as
    * metadata.  This path is relative to the current file.
    **/
  1: optional string file_path

  /** Byte offset in file_path to the ColumnMetaData **/
  2: required i64 file_offset

  /** Column metadata for this chunk. This is the same content as what is at
   * file_path/file_offset.  Having it here has it replicated in the file
   * metadata.
   **/
  3: optional ColumnMetaData meta_data

  /** File offset of ColumnChunk's OffsetIndex **/
  4: optional i64 offset_index_offset

  /** Size of ColumnChunk's OffsetIndex, in bytes **/
  5: optional i32 offset_index_length

  /** File offset of ColumnChunk's ColumnIndex **/
  6: optional i64 column_index_offset

  /** Size of ColumnChunk's ColumnIndex, in bytes **/
  7: optional i32 column_index_length

  /** Crypto metadata of encrypted columns **/
  8: optional ColumnCryptoMetaData crypto_metadata

  /** Encrypted column metadata for this chunk **/
  9: optional binary encrypted_column_metadata
}

struct RowGroup {
  /** Metadata for each column chunk in this row group.
   * This list must have the same order as the SchemaElement list in FileMetaData.
   **/
  1: required list<ColumnChunk> columns

  /** Total byte size of all the uncompressed column data in this row group **/
  2: required i64 total_byte_size

  /** Number of rows in this row group **/
  3: required i64 num_rows

  /** If set, specifies a sort ordering of the rows in this RowGroup.
   * The sorting columns can be a subset of all the columns.
   */
  4: optional list<SortingColumn> sorting_columns

  /** Byte offset from beginning of file to first page (data or dictionary)
   * in this row group **/
  5: optional i64 file_offset

  /** Total byte size of all compressed (and potentially encrypted) column data
   *  in this row group **/
  6: optional i64 total_compressed_size

  /** Row group ordinal in the file **/
  7: optional i16 ordinal
}

/** Empty struct to signal the order defined by the physical or logical type */
struct TypeDefinedOrder {}

/**
 * Union to specify the order used for the min_value and max_value fields for a
 * column. This union takes the role of an enhanced enum that allows rich
 * elements (which will be needed for a collation-based ordering in the future).
 *
 * Possible values are:
 * * TypeDefinedOrder - the column uses the order defined by its logical or
 *                      physical type (if there is no logical type).
 *
 * If the reader does not support the value of this union, min and max stats
 * for this column should be ignored.
 */
union ColumnOrder {

  /**
   * The sort orders for logical types are:
   *   UTF8 - unsigned byte-wise comparison
   *   INT8 - signed comparison
   *   INT16 - signed comparison
   *   INT32 - signed comparison
   *   INT64 - signed comparison
   *   UINT8 - unsigned comparison
   *   UINT16 - unsigned comparison
   *   UINT32 - unsigned comparison
   *   UINT64 - unsigned comparison
   *   DECIMAL - signed comparison of the represented value
   *   DATE - signed comparison
   *   TIME_MILLIS - signed comparison
   *   TIME_MICROS - signed comparison
   *   TIMESTAMP_MILLIS - signed comparison
   *   TIMESTAMP_MICROS - signed comparison
   *   INTERVAL - unsigned comparison
   *   JSON - unsigned byte-wise comparison
   *   BSON - unsigned byte-wise comparison
   *   ENUM - unsigned byte-wise comparison
   *   LIST - undefined
   *   MAP - undefined
   *
   * In the absence of logical types, the sort order is determined by the physical type:
   *   BOOLEAN - false, true
   *   INT32 - signed comparison
   *   INT64 - signed comparison
   *   INT96 (only used for legacy timestamps) - undefined
   *   FLOAT - signed comparison of the represented value (*)
   *   DOUBLE - signed comparison of the represented value (*)
   *   BYTE_ARRAY - unsigned byte-wise comparison
   *   FIXED_LEN_BYTE_ARRAY - unsigned byte-wise comparison
   *
   * (*) Because the sorting order is not specified properly for floating
   *     point values (relations vs. total ordering) the following
   *     compatibility rules should be applied when reading statistics:
   *     - If the min is a NaN, it should be ignored.
   *     - If the max is a NaN, it should be ignored.
   *     - If the min is +0, the row group may contain -0 values as well.
   *     - If the max is -0, the row group may contain +0 values as well.
   *     - When looking for NaN values, min and max should be ignored.
   */
  1: TypeDefinedOrder TYPE_ORDER;
}

struct PageLocation {
  /** Offset of the page in the file **/
  1: required i64 offset

  /**
   * Size of the page, including header. Sum of compressed_page_size and header
   * length
   */
  2: required i32 compressed_page_size

  /**
   * Index within the RowGroup of the first row of the page; this means pages
   * change on record boundaries (r = 0).
   */
  3: required i64 first_row_index
}

struct OffsetIndex {
  /**
   * PageLocations, ordered by increasing PageLocation.offset. It is required
   * that page_locations[i].first_row_index < page_locations[i+1].first_row_index.
   */
  1: required list<PageLocation> page_locations
}

/**
 * Description for ColumnIndex.
 * Each <array-field>[i] refers to the page at OffsetIndex.page_locations[i]
 */
struct ColumnIndex {
  /**
   * A list of Boolean values to determine the validity of the corresponding
   * min and max values. If true, a page contains only null values, and writers
   * have to set the corresponding entries in min_values and max_values to
   * byte[0], so that all lists have the same length. If false, the
   * corresponding entries in min_values and max_values must be valid.
   */
  1: required list<bool> null_pages

  /**
   * Two lists containing lower and upper bounds for the values of each page
   * determined by the ColumnOrder of the column. These may be the actual
   * minimum and maximum values found on a page, but can also be (more compact)
   * values that do not exist on a page. For example, instead of storing ""Blart
   * Versenwald III", a writer may set min_values[i]="B", max_values[i]="C".
   * Such more compact values must still be valid values within the column's
   * logical type. Readers must make sure that list entries are populated before
   * using them by inspecting null_pages.
   */
  2: required list<binary> min_values
  3: required list<binary> max_values

  /**
   * Stores whether both min_values and max_values are orderd and if so, in
   * which direction. This allows readers to perform binary searches in both
   * lists. Readers cannot assume that max_values[i] <= min_values[i+1], even
   * if the lists are ordered.
   */
  4: required BoundaryOrder boundary_order

  /** A list containing the number of null values for each page **/
  5: optional list<i64> null_counts
}

struct AesGcmV1 {
  /** AAD prefix **/
  1: optional binary aad_prefix

  /** Unique file identifier part of AAD suffix **/
  2: optional binary aad_file_unique

  /** In files encrypted with AAD prefix without storing it,
   * readers must supply the prefix **/
  3: optional bool supply_aad_prefix
}

struct AesGcmCtrV1 {
  /** AAD prefix **/
  1: optional binary aad_prefix

  /** Unique file identifier part of AAD suffix **/
  2: optional binary aad_file_unique

  /** In files encrypted with AAD prefix without storing it,
   * readers must supply the prefix **/
  3: optional bool supply_aad_prefix
}

union EncryptionAlgorithm {
  1: AesGcmV1 AES_GCM_V1
  2: AesGcmCtrV1 AES_GCM_CTR_V1
}

/**
 * Description for file metadata
 */
struct FileMetaData {
  /** Version of this file **/
  1: required i32 version

  /** Parquet schema for this file.  This schema contains metadata for all the columns.
   * The schema is represented as a tree with a single root.  The nodes of the tree
   * are flattened to a list by doing a depth-first traversal.
   * The column metadata contains the path in the schema for that column which can be
   * used to map columns to nodes in the schema.
   * The first element is the root **/
  2: required list<SchemaElement> schema;

  /** Number of rows in this file **/
  3: required i64 num_rows

  /** Row groups in this file **/
  4: required list<RowGroup> row_groups

  /** Optional key/value metadata **/
  5: optional list<KeyValue> key_value_metadata

  /** String for application that wrote this file.  This should be in the format
   * <Application> version <App Version> (build <App Build Hash>).
   * e.g. impala version 1.0 (build 6cf94d29b2b7115df4de2c06e2ab4326d721eb55)
   **/
  6: optional string created_by

  /**
   * Sort order used for the min_value and max_value fields in the Statistics
   * objects and the min_values and max_values fields in the ColumnIndex
   * objects of each column in this file. Sort orders are listed in the order
   * matching the columns in the schema. The indexes are not necessary the same
   * though, because only leaf nodes of the schema are represented in the list
   * of sort orders.
   *
   * Without column_orders, the meaning of the min_value and max_value fields
   * in the Statistics object and the ColumnIndex object is undefined. To ensure
   * well-defined behaviour, if these fields are written to a Parquet file,
   * column_orders must be written as well.
   *
   * The obsolete min and max fields in the Statistics object are always sorted
   * by signed comparison regardless of column_orders.
   */
  7: optional list<ColumnOrder> column_orders;

  /**
   * Encryption algorithm. This field is set only in encrypted files
   * with plaintext footer. Files with encrypted footer store algorithm id
   * in FileCryptoMetaData structure.
   */
  8: optional EncryptionAlgorithm encryption_algorithm

  /**
   * Retrieval metadata of key used for signing the footer.
   * Used only in encrypted files with plaintext footer.
   */
  9: optional binary footer_signing_key_metadata
}

/** Crypto metadata for files with encrypted footer **/
struct FileCryptoMetaData {
  /**
   * Encryption algorithm. This field is only used for files
   * with encrypted footer. Files with plaintext footer store algorithm id
   * inside footer (FileMetaData structure).
   */
  1: required EncryptionAlgorithm encryption_algorithm

  /** Retrieval metadata of key used for encryption of footer,
   *  and (possibly) columns **/
  2: optional binary key_metadata
}
