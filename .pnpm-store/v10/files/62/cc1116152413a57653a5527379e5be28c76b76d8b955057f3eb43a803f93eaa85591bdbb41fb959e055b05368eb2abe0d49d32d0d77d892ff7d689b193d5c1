'use strict';

module.exports = {
  0x00: 'DECIMAL', // aka DECIMAL
  0x01: 'TINY', // aka TINYINT, 1 byte
  0x02: 'SHORT', // aka SMALLINT, 2 bytes
  0x03: 'LONG', // aka INT, 4 bytes
  0x04: 'FLOAT', // aka FLOAT, 4-8 bytes
  0x05: 'DOUBLE', // aka DOUBLE, 8 bytes
  0x06: 'NULL', // NULL (used for prepared statements, I think)
  0x07: 'TIMESTAMP', // aka TIMESTAMP
  0x08: 'LONGLONG', // aka BIGINT, 8 bytes
  0x09: 'INT24', // aka MEDIUMINT, 3 bytes
  0x0a: 'DATE', // aka DATE
  0x0b: 'TIME', // aka TIME
  0x0c: 'DATETIME', // aka DATETIME
  0x0d: 'YEAR', // aka YEAR, 1 byte (don't ask)
  0x0e: 'NEWDATE', // aka ?
  0x0f: 'VARCHAR', // aka VARCHAR (?)
  0x10: 'BIT', // aka BIT, 1-8 byte
  0xf5: 'JSON',
  0xf6: 'NEWDECIMAL', // aka DECIMAL
  0xf7: 'ENUM', // aka ENUM
  0xf8: 'SET', // aka SET
  0xf9: 'TINY_BLOB', // aka TINYBLOB, TINYTEXT
  0xfa: 'MEDIUM_BLOB', // aka MEDIUMBLOB, MEDIUMTEXT
  0xfb: 'LONG_BLOB', // aka LONGBLOG, LONGTEXT
  0xfc: 'BLOB', // aka BLOB, TEXT
  0xfd: 'VAR_STRING', // aka VARCHAR, VARBINARY
  0xfe: 'STRING', // aka CHAR, BINARY
  0xff: 'GEOMETRY', // aka GEOMETRY
};

// Manually extracted from mysql-5.5.23/include/mysql_com.h
// some more info here: http://dev.mysql.com/doc/refman/5.5/en/c-api-prepared-statement-type-codes.html
module.exports.DECIMAL = 0x00; // aka DECIMAL (http://dev.mysql.com/doc/refman/5.0/en/precision-math-decimal-changes.html)
module.exports.TINY = 0x01; // aka TINYINT, 1 byte
module.exports.SHORT = 0x02; // aka SMALLINT, 2 bytes
module.exports.LONG = 0x03; // aka INT, 4 bytes
module.exports.FLOAT = 0x04; // aka FLOAT, 4-8 bytes
module.exports.DOUBLE = 0x05; // aka DOUBLE, 8 bytes
module.exports.NULL = 0x06; // NULL (used for prepared statements, I think)
module.exports.TIMESTAMP = 0x07; // aka TIMESTAMP
module.exports.LONGLONG = 0x08; // aka BIGINT, 8 bytes
module.exports.INT24 = 0x09; // aka MEDIUMINT, 3 bytes
module.exports.DATE = 0x0a; // aka DATE
module.exports.TIME = 0x0b; // aka TIME
module.exports.DATETIME = 0x0c; // aka DATETIME
module.exports.YEAR = 0x0d; // aka YEAR, 1 byte (don't ask)
module.exports.NEWDATE = 0x0e; // aka ?
module.exports.VARCHAR = 0x0f; // aka VARCHAR (?)
module.exports.BIT = 0x10; // aka BIT, 1-8 byte
module.exports.VECTOR = 0xf2;
module.exports.JSON = 0xf5;
module.exports.NEWDECIMAL = 0xf6; // aka DECIMAL
module.exports.ENUM = 0xf7; // aka ENUM
module.exports.SET = 0xf8; // aka SET
module.exports.TINY_BLOB = 0xf9; // aka TINYBLOB, TINYTEXT
module.exports.MEDIUM_BLOB = 0xfa; // aka MEDIUMBLOB, MEDIUMTEXT
module.exports.LONG_BLOB = 0xfb; // aka LONGBLOG, LONGTEXT
module.exports.BLOB = 0xfc; // aka BLOB, TEXT
module.exports.VAR_STRING = 0xfd; // aka VARCHAR, VARBINARY
module.exports.STRING = 0xfe; // aka CHAR, BINARY
module.exports.GEOMETRY = 0xff; // aka GEOMETRY
