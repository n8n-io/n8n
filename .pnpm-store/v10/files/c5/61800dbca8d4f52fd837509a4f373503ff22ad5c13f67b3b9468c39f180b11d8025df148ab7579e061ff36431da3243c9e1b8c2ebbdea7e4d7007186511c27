/**
 * Column types used for @PrimaryGeneratedColumn() decorator.
 */
export type PrimaryGeneratedColumnType = "int" | "int2" | "int4" | "int8" | "integer" | "tinyint" | "smallint" | "mediumint" | "bigint" | "decimal" | "fixed" | "numeric";
/**
 * Column types where spatial properties are used.
 */
export type SpatialColumnType = "geometry" | "geography";
/**
 * Column types where precision and scale properties are used.
 */
export type WithPrecisionColumnType = "float" | "double" | "dec" | "decimal" | "fixed" | "numeric" | "real" | "double precision" | "datetime" | "time" | "time with time zone" | "time without time zone" | "timestamp" | "timestamp without time zone" | "timestamp with time zone";
/**
 * Column types where column length is used.
 */
export type WithLengthColumnType = "character varying" | "varying character" | "nvarchar" | "national varchar" | "character" | "native character" | "varchar" | "char" | "nchar" | "national char" | "nvarchar2" | "binary" | "varbinary" | "string";
export type WithWidthColumnType = "tinyint" | "smallint" | "mediumint" | "int" | "bigint";
/**
 * All other regular column types.
 */
export type SimpleColumnType = "simple-array" | "simple-json" | "simple-enum" | "int2" | "integer" | "int4" | "int8" | "int64" | "unsigned big int" | "float" | "float4" | "float8" | "money" | "boolean" | "bool" | "tinyblob" | "tinytext" | "mediumblob" | "mediumtext" | "blob" | "text" | "citext" | "hstore" | "longblob" | "longtext" | "bytea" | "clob" | "timetz" | "timestamptz" | "date" | "interval" | "year" | "point" | "line" | "lseg" | "box" | "circle" | "path" | "polygon" | "geometry" | "linestring" | "multipoint" | "multilinestring" | "multipolygon" | "geometrycollection" | "int4range" | "int8range" | "numrange" | "tsrange" | "tstzrange" | "daterange" | "int4multirange" | "int8multirange" | "nummultirange" | "tsmultirange" | "tstzmultirange" | "datemultirange" | "enum" | "set" | "cidr" | "inet" | "inet4" | "inet6" | "macaddr" | "bit" | "bit varying" | "varbit" | "tsvector" | "tsquery" | "uuid" | "xml" | "json" | "jsonb" | "varbinary" | "cube" | "ltree";
/**
 * Any column type column can be.
 */
export type ColumnType = WithPrecisionColumnType | WithLengthColumnType | WithWidthColumnType | SpatialColumnType | SimpleColumnType | BooleanConstructor | DateConstructor | NumberConstructor | StringConstructor;
