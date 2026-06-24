/**
 * Column types used for @PrimaryGeneratedColumn() decorator.
 */
export type PrimaryGeneratedColumnType =
	| 'int' // mysql, sqlite
	| 'int2' // postgres, sqlite
	| 'int4' // postgres
	| 'int8' // postgres, sqlite
	| 'integer' // postgres, sqlite, mysql
	| 'tinyint' // mysql, sqlite
	| 'smallint' // mysql, postgres, sqlite
	| 'mediumint' // mysql, sqlite
	| 'bigint' // mysql, postgres, sqlite
	| 'decimal' // mysql, postgres, sqlite
	| 'fixed' // mysql
	| 'numeric'; // postgres, sqlite

/**
 * Column types where spatial properties are used.
 */
export type SpatialColumnType =
	| 'geometry' // postgres
	| 'geography'; // postgres

/**
 * Column types where precision and scale properties are used.
 */
export type WithPrecisionColumnType =
	| 'float' // mysql, sqlite
	| 'double' // mysql, sqlite
	| 'dec' // mysql
	| 'decimal' // mysql, postgres, sqlite
	| 'fixed' // mysql
	| 'numeric' // postgres, sqlite, mysql
	| 'real' // mysql, postgres, sqlite
	| 'double precision' // postgres, sqlite, mysql
	| 'datetime' // mysql, sqlite
	| 'time' // mysql, postgres
	| 'time with time zone' // postgres
	| 'time without time zone' // postgres
	| 'timestamp' // mysql, postgres
	| 'timestamp without time zone' // postgres
	| 'timestamp with time zone'; // postgres

/**
 * Column types where column length is used.
 */
export type WithLengthColumnType =
	| 'character varying' // postgres
	| 'varying character' // sqlite
	| 'nvarchar' // mysql
	| 'national varchar' // mysql
	| 'character' // mysql, postgres, sqlite
	| 'native character' // sqlite
	| 'varchar' // mysql, postgres, sqlite
	| 'char' // mysql, postgres
	| 'nchar' // sqlite, mysql
	| 'national char' // mysql
	| 'nvarchar2' // sqlite
	| 'binary' // mysql
	| 'varbinary' // mysql
	| 'string'; // all supported dbs

export type WithWidthColumnType =
	| 'tinyint' // mysql
	| 'smallint' // mysql
	| 'mediumint' // mysql
	| 'int' // mysql
	| 'bigint'; // mysql

/**
 * All other regular column types.
 */
export type SimpleColumnType =
	| 'simple-array' // typeorm-specific, automatically mapped to string
	// |"string" // typeorm-specific, automatically mapped to varchar depend on platform
	| 'simple-json' // typeorm-specific, automatically mapped to string
	| 'simple-enum' // typeorm-specific, automatically mapped to string

	// numeric types
	| 'int2' // postgres, sqlite
	| 'integer' // postgres, sqlite
	| 'int4' // postgres
	| 'int8' // postgres, sqlite
	| 'int64' // cockroachdb
	| 'unsigned big int' // sqlite
	| 'float' // mysql, sqlite
	| 'float4' // postgres
	| 'float8' // postgres
	| 'money' // postgres

	// boolean types
	| 'boolean' // postgres, sqlite, mysql
	| 'bool' // postgres, mysql

	// text/binary types
	| 'tinyblob' // mysql
	| 'tinytext' // mysql
	| 'mediumblob' // mysql
	| 'mediumtext' // mysql
	| 'blob' // mysql, sqlite
	| 'text' // mysql, postgres, sqlite
	| 'citext' // postgres
	| 'hstore' // postgres
	| 'longblob' // mysql
	| 'longtext' // mysql
	| 'bytea' // postgres
	| 'clob' // sqlite

	// date types
	| 'timetz' // postgres
	| 'timestamptz' // postgres
	| 'date' // mysql, postgres, sqlite
	| 'interval' // postgres
	| 'year' // mysql

	// geometric types
	| 'point' // postgres, mysql
	| 'line' // postgres
	| 'lseg' // postgres
	| 'box' // postgres
	| 'circle' // postgres
	| 'path' // postgres
	| 'polygon' // postgres, mysql
	| 'geometry' // mysql
	| 'linestring' // mysql
	| 'multipoint' // mysql
	| 'multilinestring' // mysql
	| 'multipolygon' // mysql
	| 'geometrycollection' // mysql

	// range types
	| 'int4range' // postgres
	| 'int8range' // postgres
	| 'numrange' // postgres
	| 'tsrange' // postgres
	| 'tstzrange' // postgres
	| 'daterange' // postgres

	// multirange types
	| 'int4multirange' // postgres
	| 'int8multirange' // postgres
	| 'nummultirange' // postgres
	| 'tsmultirange' // postgres
	| 'tstzmultirange' // postgres
	| 'datemultirange' // postgres

	// other types
	| 'enum' // mysql, postgres
	| 'set' // mysql
	| 'cidr' // postgres
	| 'inet' // postgres
	| 'inet4' // mariadb
	| 'inet6' // mariadb
	| 'macaddr' // postgres
	| 'bit' // postgres
	| 'bit varying' // postgres
	| 'varbit' // postgres
	| 'tsvector' // postgres
	| 'tsquery' // postgres
	| 'uuid' // postgres, mariadb
	| 'xml' // postgres
	| 'json' // mysql, postgres
	| 'jsonb' // postgres
	| 'varbinary' // mysql
	| 'cube' // postgres
	| 'ltree'; // postgres

/**
 * Any column type column can be.
 */
export type ColumnType =
	| WithPrecisionColumnType
	| WithLengthColumnType
	| WithWidthColumnType
	| SpatialColumnType
	| SimpleColumnType
	| BooleanConstructor
	| DateConstructor
	| NumberConstructor
	| StringConstructor;
