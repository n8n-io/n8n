/// <reference types="node" />

import { Duplex, Readable } from "stream";

declare namespace OracleDB {
    /** Deprecated */
    // const ARRAY: number;
    // const OBJECT: number;

    type CSFRM_IMPLICIT = 1;
    type CSFRM_NCHAR = 2;
    /** Constant for the query result outFormat option. */
    const OUT_FORMAT_ARRAY: number;
    /** Constant for the query result outFormat option. */
    const OUT_FORMAT_OBJECT: number;

    /** Constant for execute() bind parameter type property, for the createLob() type parameter, for the Lob type property, for fetchAsBuffer, for fetchAsString and fetchInfo, and for extended metadata. */
    const BLOB: typeof DB_TYPE_BLOB;
    /** Constant for execute() bind parameter type property, for the createLob() type parameter, for the Lob type property, for fetchAsBuffer, for fetchAsString and fetchInfo, and for extended metadata. */
    const BUFFER: typeof DB_TYPE_RAW;
    /** Constant for execute() bind parameter type property, for the createLob() type parameter, for the Lob type property, for fetchAsBuffer, for fetchAsString and fetchInfo, and for extended metadata. */
    const CLOB: typeof DB_TYPE_CLOB;
    /** Constant for execute() bind parameter type property, for the createLob() type parameter, for the Lob type property, for fetchAsBuffer, for fetchAsString and fetchInfo, and for extended metadata. */
    const CURSOR: typeof DB_TYPE_CURSOR;
    /** Constant for execute() bind parameter type property, for the createLob() type parameter, for the Lob type property, for fetchAsBuffer, for fetchAsString and fetchInfo, and for extended metadata. */
    const DATE: typeof DB_TYPE_TIMESTAMP;
    /** Constant for execute() bind parameter type property, for the createLob() type parameter, for the Lob type property, for fetchAsBuffer, for fetchAsString and fetchInfo, and for extended metadata. */
    const DEFAULT: number;
    /** Constant for execute() bind parameter type property, for the createLob() type parameter, for the Lob type property, for fetchAsBuffer, for fetchAsString and fetchInfo, and for extended metadata. */
    const NUMBER: typeof DB_TYPE_NUMBER;
    /** Constant for execute() bind parameter type property, for the createLob() type parameter, for the Lob type property, for fetchAsBuffer, for fetchAsString and fetchInfo, and for extended metadata. */
    const NCLOB: typeof DB_TYPE_NCLOB;
    /** Constant for execute() bind parameter type property, for the createLob() type parameter, for the Lob type property, for fetchAsBuffer, for fetchAsString and fetchInfo, and for extended metadata. */
    const STRING: typeof DB_TYPE_VARCHAR;

    class DbType {
        num: number;
        name: string;
        columnTypeName: string;
        _bufferSizeFactor: number;
        _oraTypeNum: number;
        csfrm: number;

        constructor(
            num: number,
            name: string,
            columnTypeName: string,
            options?: { bufferSizeFactor?: number; oraTypeNum?: number; csfrm?: number },
        );
        toString: () => string;
    }

    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_BFILE: DbType & {
        num: 2020;
        name: "DB_TYPE_BFILE";
        columnTypeName: "BFILE";
        oraTypeNum: 114;
        bufferSizeFactor: 112;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_BINARY_DOUBLE: DbType & {
        num: 2008;
        name: "DB_TYPE_BINARY_DOUBLE";
        columnTypeName: "BINARY_DOUBLE";
        oraTypeNum: 101;
        bufferSizeFactor: 8;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_BINARY_FLOAT: DbType & {
        num: 2007;
        name: "DB_TYPE_BINARY_FLOAT";
        columnTypeName: "BINARY_FLOAT";
        oraTypeNum: 100;
        bufferSizeFactor: 4;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_BINARY_INTEGER: DbType & {
        num: 2009;
        name: "DB_TYPE_BINARY_INTEGER";
        columnTypeName: "BINARY_INTEGER";
        oraTypeNum: 3;
        bufferSizeFactor: 22;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_BLOB: DbType & {
        num: 2019;
        name: "DB_TYPE_BLOB";
        columnTypeName: "BLOB";
        oraTypeNum: 113;
        bufferSizeFactor: 112;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_BOOLEAN: DbType & {
        num: 2022;
        name: "DB_TYPE_BOOLEAN";
        columnTypeName: "BOOLEAN";
        oraTypeNum: 252;
        bufferSizeFactor: 4;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_CHAR: DbType & {
        num: 2003;
        name: "DB_TYPE_CHAR";
        columnTypeName: "CHAR";
        oraTypeNum: 96;
        bufferSizeFactor: 4;
        csfrm: CSFRM_IMPLICIT;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_CLOB: DbType & {
        num: 2017;
        name: "DB_TYPE_CLOB";
        columnTypeName: "CLOB";
        oraTypeNum: 112;
        bufferSizeFactor: 112;
        csfrm: CSFRM_IMPLICIT;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_CURSOR: DbType & {
        num: 2021;
        name: "DB_TYPE_CURSOR";
        columnTypeName: "CURSOR";
        oraTypeNum: 102;
        bufferSizeFactor: 4;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_DATE: DbType & {
        num: 2011;
        name: "DB_TYPE_DATE";
        columnTypeName: "DATE";
        oraTypeNum: 12;
        bufferSizeFactor: 7;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_INTERVAL_DS: DbType & {
        num: 2015;
        name: "DB_TYPE_INTERVAL_DS";
        columnTypeName: "INTERVAL DAY TO SECOND";
        oraTypeNum: 183;
        bufferSizeFactor: 11;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_INTERVAL_YM: DbType & {
        num: 2016;
        name: "DB_TYPE_INTERVAL_YM";
        columnTypeName: "INTERVAL YEAR TO MONTH";
        oraTypeNum: 182;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_JSON: DbType & { num: 2027; name: "DB_TYPE_JSON"; columnTypeName: "JSON"; oraTypeNum: 119 };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_LONG: DbType & {
        num: 2024;
        name: "DB_TYPE_LONG";
        columnTypeName: "LONG";
        oraTypeNum: 8;
        csfrm: CSFRM_IMPLICIT;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_LONG_NVARCHAR: DbType & {
        num: 2031;
        name: "DB_TYPE_LONG_NVARCHAR";
        columnTypeName: "LONG";
        oraTypeNum: 8;
        csfrm: CSFRM_NCHAR;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_LONG_RAW: DbType & {
        num: 2025;
        name: "DB_TYPE_LONG_RAW";
        columnTypeName: "LONG RAW";
        oraTypeNum: 24;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_NCHAR: DbType & {
        num: 2004;
        name: "DB_TYPE_NCHAR";
        columnTypeName: "NCHAR";
        oraTypeNum: 96;
        bufferSizeFactor: 4;
        csfrm: CSFRM_NCHAR;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_NCLOB: DbType & {
        num: 2018;
        name: "DB_TYPE_NCLOB";
        columnTypeName: "NCLOB";
        oraTypeNum: 112;
        bufferSizeFactor: 112;
        csfrm: CSFRM_NCHAR;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_NUMBER: DbType & {
        num: 2010;
        name: "DB_TYPE_NUMBER";
        columnTypeName: "NUMBER";
        oraTypeNum: 2;
        bufferSizeFactor: 22;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_NVARCHAR: DbType & {
        num: 2002;
        name: "DB_TYPE_NVARCHAR";
        columnTypeName: "NVARCHAR2";
        oraTypeNum: 1;
        bufferSizeFactor: 4;
        csfrm: CSFRM_NCHAR;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_OBJECT: DbType & { num: 2023; name: "DB_TYPE_OBJECT"; columnTypeName: "OBJECT"; oraTypeNum: 109 };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_RAW: DbType & {
        num: 2006;
        name: "DB_TYPE_RAW";
        columnTypeName: "RAW";
        oraTypeNum: 23;
        bufferSizeFactor: 1;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_ROWID: DbType & {
        num: 2005;
        name: "DB_TYPE_ROWID";
        columnTypeName: "ROWID";
        oraTypeNum: 11;
        bufferSizeFactor: 18;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_TIMESTAMP: DbType & {
        num: 2012;
        name: "DB_TYPE_TIMESTAMP";
        columnTypeName: "TIMESTAMP";
        oraTypeNum: 180;
        bufferSizeFactor: 11;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_TIMESTAMP_LTZ: DbType & {
        num: 2014;
        name: "DB_TYPE_TIMESTAMP_LTZ";
        columnTypeName: "TIMESTAMP WITH LOCAL TIME ZONE";
        oraTypeNum: 231;
        bufferSizeFactor: 11;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_TIMESTAMP_TZ: DbType & {
        num: 2013;
        name: "DB_TYPE_TIMESTAMP_TZ";
        columnTypeName: "TIMESTAMP WITH TIME ZONE";
        oraTypeNum: 181;
        bufferSizeFactor: 13;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_UROWID: DbType & { num: 2030; name: "DB_TYPE_UROWID"; columnTypeName: "UROWID"; oraTypeNum: 208 };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_VARCHAR: DbType & {
        num: 2001;
        name: "DB_TYPE_VARCHAR";
        columnTypeName: "VARCHAR2";
        oraTypeNum: 1;
        bufferSizeFactor: 4;
        csfrm: CSFRM_IMPLICIT;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_XMLTYPE: DbType & {
        num: 2032;
        name: "DB_TYPE_XMLTYPE";
        columnTypeName: "XMLTYPE";
        oraTypeNum: 109;
        bufferSizeFactor: 2147483647;
        csfrm: CSFRM_IMPLICIT;
    };
    /** Constant which represents the Oracle Database type. */
    const DB_TYPE_VECTOR: DbType & {
        num: 2033;
        name: "DB_TYPE_VECTOR";
        columnTypeName: "VECTOR";
        oraTypeNum: 127;
    };

    class IntervalYM {
        /**
         * It returns an object containing optional integer attributes: 'years' and 'months'..
         *
         * @since 6.8
         */
        years?: number | undefined;
        months?: number | undefined;
    }

    class IntervalDS {
        /**
         * It returns an object containing optional integer attributes: 'days', 'hours', 'minutes', 'seconds', and 'fseconds' (fractional seconds denoted in nanoseconds).
         *
         * @since 6.8
         */
        days?: number | undefined;
        hours?: number | undefined;
        minutes?: number | undefined;
        seconds?: number | undefined;
        fseconds?: number | undefined;
    }

    class JsonId extends Uint8Array {
        /**
         * It returns a SODA document key '_id' in hex string.
         * @since 6.5.0
         */
        toJSON(): string;
    }

    type TypedArray = Float32Array | Float64Array | Int8Array | Uint8Array | Uint32Array;

    interface SparseVectorInputObject {
        numDimensions: number;
        indices: Array<number> | Uint32Array;
        values: Array<number> | TypedArray;
    }

    type SparseVectorType = SparseVectorInputObject | Array<number> | string | TypedArray;

    class SparseVector<T extends TypedArray = Float64Array> {
        constructor(
            vec?: SparseVectorType,
        );
        /**
         * This property is a JavaScript array or a 32-bit unsigned integer (Uint32Array) TypedArray that specifies the indices (zero-based) of non-zero values in the vector.
         *
         * @since 6.8
         */
        indices?: Array<number> | Uint32Array | undefined;
        /**
         * This property is an integer that specifies the number of dimensions of the vector.
         *
         * @since 6.8
         */
        numDimensions?: number | undefined;
        /**
         * This property is a JavaScript array or TypedArray that specifies the non-zero values stored in the vector.
         *
         * @since 6.8
         */
        values?: Array<number> | TypedArray | undefined;
        /**
         * Converts a sparse vector to a dense vector and returns a TypedArray of 8-bit signed integers, 32-bit floating-point numbers,
         * or 64-bit floating-point numbers depending on the storage format of the sparse vector column’s non-zero values in Oracle Database.
         *
         * @since 6.8
         */
        dense(): T | undefined;
    }

    /** Constant for the dir property of execute() bindParams, queryStream() and executeMany() bindDefs. */
    const BIND_IN: number;
    /** Constant for the dir property of execute() bindParams, queryStream() and executeMany() bindDefs. */
    const BIND_INOUT: number;
    /** Constant for the dir property of execute() bindParams, queryStream() and executeMany() bindDefs. */
    const BIND_OUT: number;

    /** Constant for getConnection() privilege properties. */
    const SYSASM: number;
    /** Constant for getConnection() privilege properties. */
    const SYSBACKUP: number;
    /** Constant for getConnection() privilege properties. */
    const SYSDBA: number;
    /** Constant for getConnection() privilege properties. */
    const SYSDG: number;
    /** Constant for getConnection() privilege properties. */
    const SYSKM: number;
    /** Constant for getConnection() privilege properties. */
    const SYSOPER: number;
    /** Constant for getConnection() privilege properties. */
    const SYSPRELIM: number;
    /** Constant for getConnection() privilege properties. */
    const SYSRAC: number;

    /** Constant for connection.getStatementInfo() properties. */
    const STMT_TYPE_ALTER: number;
    /** Constant for connection.getStatementInfo() properties. */
    const STMT_TYPE_BEGIN: number;
    /** Constant for connection.getStatementInfo() properties. */
    const STMT_TYPE_CALL: number;
    /** Constant for connection.getStatementInfo() properties. */
    const STMT_TYPE_COMMIT: number;
    /** Constant for connection.getStatementInfo() properties. */
    const STMT_TYPE_CREATE: number;
    /** Constant for connection.getStatementInfo() properties. */
    const STMT_TYPE_DECLARE: number;
    /** Constant for connection.getStatementInfo() properties. */
    const STMT_TYPE_DELETE: number;
    /** Constant for connection.getStatementInfo() properties. */
    const STMT_TYPE_DROP: number;
    /** Constant for connection.getStatementInfo() properties. */
    const STMT_TYPE_EXPLAIN_PLAN: number;
    /** Constant for connection.getStatementInfo() properties. */
    const STMT_TYPE_INSERT: number;
    /** Constant for connection.getStatementInfo() properties. */
    const STMT_TYPE_MERGE: number;
    /** Constant for connection.getStatementInfo() properties. */
    const STMT_TYPE_ROLLBACK: number;
    /** Constant for connection.getStatementInfo() properties. */
    const STMT_TYPE_SELECT: number;
    /** Constant for connection.getStatementInfo() properties. */
    const STMT_TYPE_UNKNOWN: number;
    /** Constant for connection.getStatementInfo() properties. */
    const STMT_TYPE_UPDATE: number;

    /** Constant for the Continuous Query Notification message.type. */
    const SUBSCR_EVENT_TYPE_AQ: number;
    /** Constant for the Continuous Query Notification message.type. */
    const SUBSCR_EVENT_TYPE_DEREG: number;
    /** Constant for the Continuous Query Notification message.type. */
    const SUBSCR_EVENT_TYPE_OBJ_CHANGE: number;
    /** Constant for the Continuous Query Notification message.type. */
    const SUBSCR_EVENT_TYPE_QUERY_CHANGE: number;
    /** Constant for the Continuous Query Notification message.type. */
    const SUBSCR_EVENT_TYPE_SHUTDOWN: number;
    /** Constant for the Continuous Query Notification message.type. */
    const SUBSCR_EVENT_TYPE_SHUTDOWN_ANY: number;
    /** Constant for the Continuous Query Notification message.type. */
    const SUBSCR_EVENT_TYPE_STARTUP: number;

    /** Constant for the Continuous Query Notification groupingClass. */
    const SUBSCR_GROUPING_CLASS_TIME: number;

    /** Constant for the Continuous Query Notification groupingType. */
    const SUBSCR_GROUPING_TYPE_LAST: number;
    /** Constant for the Continuous Query Notification groupingType. */
    const SUBSCR_GROUPING_TYPE_SUMMARY: number;

    /** Constant for the Continuous Query Notification qos Quality of Service. */
    const SUBSCR_QOS_BEST_EFFORT: number;
    /** Constant for the Continuous Query Notification qos Quality of Service. */
    const SUBSCR_QOS_DEREG_NFY: number;
    /** Constant for the Continuous Query Notification qos Quality of Service. */
    const SUBSCR_QOS_QUERY: number;
    /** Constant for the Continuous Query Notification qos Quality of Service. */
    const SUBSCR_QOS_RELIABLE: number;
    /** Constant for the Continuous Query Notification qos Quality of Service. */
    const SUBSCR_QOS_ROWIDS: number;

    /** Constant for the Continuous Query Notification namespace. */
    const SUBSCR_NAMESPACE_AQ: number;
    /** Constant for the Continuous Query Notification namespace. */
    const SUBSCR_NAMESPACE_DBCHANGE: number;

    /** Constant for the AqDeqOptions Class 'mode' */
    const AQ_DEQ_MODE_BROWSE: number;
    /** Constant for the AqDeqOptions Class 'mode' */
    const AQ_DEQ_MODE_LOCKED: number;
    /** Constant for the AqDeqOptions Class 'mode' */
    const AQ_DEQ_MODE_REMOVE: number;
    /** Constant for the AqDeqOptions Class 'mode' */
    const AQ_DEQ_MODE_REMOVE_NO_DAT: number;

    /** Constant for the AqDeqOptions Class 'navigation' */
    const AQ_DEQ_NAV_FIRST_MSG: number;
    /** Constant for the AqDeqOptions Class 'navigation' */
    const AQ_DEQ_NAV_NEXT_TRANSACTION: number;
    /** Constant for the AqDeqOptions Class 'navigation' */
    const AQ_DEQ_NAV_NEXT_MSG: number;

    /** Constant for the AqDeqOptions Class 'wait' */
    const AQ_DEQ_NO_WAIT: number;
    /** Constant for the AqDeqOptions Class 'wait' */
    const AQ_DEQ_WAIT_FOREVER: number;

    /** Constant for the AqEnqOptions Class 'deliveryMode' */
    const AQ_DEQ_WAAQ_MSG_DELIV_MODE_PERSISTENTIT_FOREVER: number;
    /** Constant for the AqEnqOptions Class 'deliveryMode' */
    const AQ_MSG_DELIV_MODE_BUFFERED: number;
    /** Constant for the AqEnqOptions Class 'deliveryMode' */
    const AQ_MSG_DELIV_MODE_PERSISTENT_OR_BUFFERED: number;

    /** Constant for the AqMessage Class 'state' */
    const AQ_MSG_STATE_READY: number;
    /** Constant for the AqMessage Class 'state' */
    const AQ_MSG_STATE_WAITING: number;
    /** Constant for the AqMessage Class 'state' */
    const AQ_MSG_STATE_PROCESSED: number;
    /** Constant for the AqMessage Class 'state' */
    const AQ_MSG_STATE_EXPIRED: number;

    /** Constant for the AqEnqOptions Class and AqDeqOptions 'visibility' */
    const AQ_VISIBILITY_IMMEDIATE: number;
    /** Constant for the AqEnqOptions Class and AqDeqOptions 'visibility' */
    const AQ_VISIBILITY_ON_COMMIT: number;

    /** Constant for the Continuous Query Notification connection.subscribe() option operations, and for the notification message operation properties. */
    const CQN_OPCODE_ALL_OPS: number;
    /** Constant for the Continuous Query Notification connection.subscribe() option operations, and for the notification message operation properties. */
    const CQN_OPCODE_ALL_ROWS: number;
    /** Constant for the Continuous Query Notification connection.subscribe() option operations, and for the notification message operation properties. */
    const CQN_OPCODE_ALTER: number;
    /** Constant for the Continuous Query Notification connection.subscribe() option operations, and for the notification message operation properties. */
    const CQN_OPCODE_DELETE: number;
    /** Constant for the Continuous Query Notification connection.subscribe() option operations, and for the notification message operation properties. */
    const CQN_OPCODE_DROP: number;
    /** Constant for the Continuous Query Notification connection.subscribe() option operations, and for the notification message operation properties. */
    const CQN_OPCODE_INSERT: number;
    /** Constant for the Continuous Query Notification connection.subscribe() option operations, and for the notification message operation properties. */
    const CQN_OPCODE_UPDATE: number;

    /** Constant for the connection pool.status readonly attribute. */
    const POOL_STATUS_OPEN: number;
    /** Constant for the connection pool.status readonly attribute. */
    const POOL_STATUS_DRAINING: number;
    /** Constant for the connection pool.status readonly attribute. */
    const POOL_STATUS_CLOSED: number;

    /** Constant for the sodaDatabase.createCollection() mode property. */
    const SODA_COLL_MAP_MODE: number;

    /** Constant for shutting down the Oracle database with oracledb.shutdown() and connection.shutdown() */
    const SHUTDOWN_MODE_ABORT: number;
    /** Constant for shutting down the Oracle database with oracledb.shutdown() and connection.shutdown() */
    const SHUTDOWN_MODE_DEFAULT: number;
    /** Constant for shutting down the Oracle database with oracledb.shutdown() and connection.shutdown() */
    const SHUTDOWN_MODE_FINAL: number;
    /** Constant for shutting down the Oracle database with oracledb.shutdown() and connection.shutdown() */
    const SHUTDOWN_MODE_IMMEDIATE: number;
    /** Constant for shutting down the Oracle database with oracledb.shutdown() and connection.shutdown() */
    const SHUTDOWN_MODE_TRANSACTIONAL: number;
    /** Constant for shutting down the Oracle database with oracledb.shutdown() and connection.shutdown() */
    const SHUTDOWN_MODE_TRANSACTIONAL_LOCAL: number;
    /** Constants for the vectorFormat attribute. */
    const VECTOR_FORMAT_BINARY: number;
    /** Constants for the vectorFormat attribute. */
    const VECTOR_FORMAT_FLOAT32: number;
    /** Constants for the vectorFormat attribute. */
    const VECTOR_FORMAT_FLOAT64: number;
    /** Constants for the vectorFormat attribute. */
    const VECTOR_FORMAT_INT8: number;

    /**
     * If true, the transaction in the current connection is automatically committed at the end of statement execution.
     * This property may be overridden in an execute() call.
     *
     * @default false
     * @since 0.5
     */
    let autoCommit: boolean;
    /**
     * The user-chosen Connection class value defines a logical name for connections.
     * Most single purpose applications should set connectionClass when using a connection pool or DRCP.
     *
     * When a pooled session has a connection class, Oracle ensures that the session is not shared outside of that connection class.
     *
     * The connection class value is similarly used by Database Resident Connection Pooling (DRCP) to allow or disallow sharing of sessions.
     *
     * For example, where two different kinds of users share one pool, you might set connectionClass to ‘HRPOOL’ for connections that
     * access a Human Resources system, and it might be set to ‘OEPOOL’ for users of an Order Entry system.
     * Users will only be given sessions of the appropriate class, allowing maximal reuse of resources in each case,
     * and preventing any session information leaking between the two systems.
     *
     * If connectionClass is set for a non-pooled connection, the driver name is not recorded in V$ views.
     */
    let connectionClass: string;
    /**
     * Specify whether Oracle Database named objects or collections that are queried should be returned to the application
     * as “plain old JavaScript objects” or kept as database-backed objects. This option also applies to output BIND_OUT bind variables.
     *
     * Note that LOBs in objects will be represented as Lob instances and will not be String or Buffer, regardless of any fetchAsString,
     * fetchAsBuffer, or fetchInfo setting.
     *
     * Setting dbObjectAsPojo to true can avoid overhead if object attributes are repeatedly accessed. It also allows applications to
     * close connections before any attributes are accessed unless LOBs are involved. Regardless of the value, the interface to access objects is the same.
     *
     * @default false
     * @since 5.1
     */
    let dbObjectAsPojo: boolean;
    /**
     * This property is a function which converts the data type of the DbObject property to the desired data type.
     * This function is called once for each property inside a DbObject with a single object argument containing the following attributes:
     * type: The value of one of the Oracle Database Type Objects.
     * maxSize: The maximum number of bytes allocated.
     * typeName: The name of the object.
     * precision: Set only for oracledb.DB_TYPE_NUMBER type.
     * scale: Set only for oracledb.DB_TYPE_NUMBER type.
     *
     * The function is expected to return an object containing a converter attribute which works similar to the existing fetch type handler’s converters.
     * The DbObject type handler’s converter attribute is a function which accepts the incoming read value of the DbObject property and returns a transformed value (based on the required data type) for the same DbObject property.
     * This property is not applicable for LOB data type attributes of a DbObject type.
     *
     * @since 6.8
     */
    function dbObjectTypeHandler(metadata: Metadata<any>): FetchTypeResponse | undefined;
    /**
     * Sets the name used for Edition-Based Redefinition by connections.
     *
     * @since 2.2
     */
    let edition: string;
    /**
     * Determines whether Oracle Client events mode should be enabled.
     *
     * This property can be overridden in the oracledb.createPool() call and when getting a standalone connection from oracledb.getConnection().
     *
     * Events mode is required for Continuous Query Notification, Fast Application Notification (FAN) and Runtime Load Balancing (RLB).
     *
     * @default true
     * @since 2.2
     */
    let events: boolean;
    /**
     * If true, connections will be established using external authentication.
     *
     * The user and password properties should not be set when externalAuth is true.
     *
     * This property can be overridden in the oracledb.createPool() call and when getting a standalone connection from oracledb.getConnection().
     *
     * @default false
     * @since 0.5
     */
    let externalAuth: boolean;
    /**
     * This property sets the size of an internal buffer used for fetching query rows from Oracle Database.
     * Changing it may affect query performance but does not affect how many rows are returned to the application.
     *
     * The property is used during the default direct fetches, during ResultSet getRow() calls, and for queryStream(). It is not used for getRows().
     *
     * Increasing this value reduces the number of round-trips to the database but increases memory usage for each data fetch.
     * For queries that return a large number of rows, higher values of fetchArraySize may give better performance.
     * For queries that only return a few rows, reduce the value of fetchArraySize to minimize the amount of memory management during data fetches.
     * JavaScript memory fragmentation may occur in some cases.
     *
     * For direct fetches (those using execute() option resultSet: false), the internal buffer size will be based on the lesser of maxRows and fetchArraySize.
     *
     * @default 100
     * @since 2.0
     */
    let fetchArraySize: number;
    /**
     * Configure data types to be returned as a Buffer instead of the default representation when queried with execute() or queryStream().
     *
     * Currently the only valid type is oracledb.BLOB.
     *
     * By default in node-oracledb, all columns are returned as native types or as Lob instances, in the case of CLOB and BLOB types.
     *
     * Individual query columns in execute() or queryStream() calls can override the fetchAsBuffer global setting by using fetchInfo.
     *
     * @since 1.13
     */
    let fetchAsBuffer: Array<typeof BLOB>;
    /**
     * An array of node-oracledb types. The valid types are oracledb.DATE, oracledb.NUMBER, oracledb.BUFFER, and oracledb.CLOB.
     * When any column having one of the specified types is queried with execute() or queryStream(), the column data is returned as a string instead of the default representation.
     *
     * By default in node-oracledb, all columns are returned as native types or as Lob instances, in the case of CLOB and BLOB types.
     *
     * This property helps avoid situations where using JavaScript types can lead to numeric precision loss, or where date conversion is unwanted.
     *
     * For raw data returned as a string, Oracle returns the data as a hex-encoded string.
     * For dates and numbers returned as a string, the maximum length of a string created by this mapping is 200 bytes.
     * Strings created for CLOB columns will generally be limited by Node.js and V8 memory restrictions.
     *
     * Individual query columns in execute() or queryStream() calls can override the fetchAsString global setting by using fetchInfo.
     *
     * For non-CLOB types, the conversion to string is handled by Oracle client libraries and is often referred to as defining the fetch type.
     */
    let fetchAsString: Array<typeof DATE | typeof NUMBER | typeof BUFFER | typeof CLOB>;
    /**
     * Converter can be used with fetch type handlers to change the returned data.
     * If the value returned by the fetch type handler function is undefined then no conversion takes place.
     */
    function converter<T>(arg: T | null): any;
    type FetchTypeResponse =
        | { type: DbType; converter?: typeof converter }
        | { type?: DbType; converter: typeof converter };
    /**
     * This property is a function that allows applications to examine and modify queried column data before it is returned to the user. This function is called once for each column that is being fetched with a single object argument containing the following attributes:
     * annotations: The object representing the annotations.
     * byteSize: The maximum size in bytes. This is only set if dbType is oracledb.DB_TYPE_VARCHAR, oracledb.DB_TYPE_CHAR, or oracledb.DB_TYPE_RAW.
     * dbType: The database type, that is, one of the Oracle Database Type Objects.
     * dbTypeName: The name of the database type, such as “NUMBER” or “VARCHAR2”.
     * dbTypeClass: The class associated with the database type. This is only set if dbType is oracledb.DB_TYPE_OBJECT.
     * domainName: The name of the SQL domain.
     * domainSchema: The schema name of the SQL domain.
     * isJson: Indicates if the column is known to contain JSON data.
     * name: The name of the column.
     * nullable: Indicates whether NULL values are permitted for this column.
     * precision: Set only when the dbType is oracledb.DB_TYPE_NUMBER.
     * scale: Set only when the dbType is oracledb.DB_TYPE_NUMBER.
     * By default, this property is “undefined”, that is, it is not set.
     * The function is expected to return either nothing or an object containing:
     * the type attribute
     * or the converter attribute
     * or both the type and converter attributes
     * The converter function is a function which can be used with fetch type handlers to change the returned data. This function accepts the value that will be returned by connection.execute() for a particular row and column and returns the value that will actually be returned by connection.execute().
     * This property can be overridden by the fetchTypeHandler option in execute().
     */
    function fetchTypeHandler(metadata: Metadata<any>): FetchTypeResponse | undefined;
    /**
     * The maximum number of rows that are fetched by a query with connection.execute() when not using a ResultSet.
     * Rows beyond this limit are not fetched from the database. A value of 0 means there is no limit.
     *
     * This property may be overridden in an execute() call.
     *
     * To improve database efficiency, SQL queries should use a row limiting clause like OFFSET / FETCH or equivalent.
     * The maxRows property can be used to stop badly coded queries from returning unexpectedly large numbers of rows.
     *
     * When the number of query rows is relatively big, or can not be predicted, it is recommended to use
     * a ResultSet or queryStream(). This allows applications to process rows in smaller chunks or individually,
     * preventing the Node.js memory limit being exceeded or query results being unexpectedly truncated by a
     * maxRows limit.
     *
     * @default 0 (unlimited)
     */
    let maxRows: number;
    /**
     * This readonly property gives a numeric representation of the Oracle client library version which
     * is useful in comparisons. For version a.b.c.d.e, this property
     * gives the number: (100000000 * a) + (1000000 * b) + (10000 * c) + (100 * d) + e
     *
     * @since 1.3
     */
    const oracleClientVersion: number;
    /**
     * This readonly property gives a string representation of the Oracle client library version which is useful for display.
     *
     * @since 2.2
     */
    const oracleClientVersionString: string;
    /**
     * The format of query rows fetched when using connection.execute() or connection.queryStream().
     * It affects both ResultSet and non-ResultSet queries. It can be used for top level queries and REF CURSOR output.
     *
     * This can be either of the Oracledb constants oracledb.ARRAY or oracledb.OBJECT.
     *
     * If specified as oracledb.ARRAY, each row is fetched as an array of column values.
     *
     * If specified as oracledb.OBJECT, each row is fetched as a JavaScript object.
     * The object has a property for each column name, with the property value set to the respective column value.
     * The property name follows Oracle’s standard name-casing rules. It will commonly be uppercase,
     * since most applications create tables using unquoted, case-insensitive names.
     *
     * From node-oracledb 5.1, when duplicate column names are used in queries, then node-oracledb will append
     * numeric suffixes in oracledb.OUT_FORMAT_OBJECT mode as necessary, so that all columns are represented in the JavaScript object.
     *
     * This property may be overridden in an execute() or queryStream() call.
     *
     * @default ARRAY
     */
    let outFormat: number;
    /**
     * The number of connections that are opened whenever a connection request exceeds the number of currently open connections.
     *
     * This property may be overridden when creating a connection pool.
     *
     * @default 1
     */
    let poolIncrement: number;
    /**
     * The maximum number of connections to which a connection pool can grow.
     *
     * This property may be overridden when creating a connection pool.
     *
     * Importantly, if you increase poolMax you should also increase the number of threads available to node-oracledb.
     *
     * @default 4
     */
    let poolMax: number;
    /**
     * The maximum number of connections per shard for connection pools. This ensures that the pool is balanced towards each shard.
     *
     * This property may be overridden when creating a connection pool.
     *
     * When this property is set, and a new connection request would cause the number of connections to the target shard to exceed the limit,
     * then that new connection request will block until a suitable connection has been released back to the pool.
     * Importantly, when blocked, the queueTimeout value will be ignored and the pending connection request will consume one worker thread.
     *
     * @since 4.1
     */
    let poolMaxPerShard: number;
    /**
     * The minimum number of connections a connection pool maintains, even when there is no activity to the target database.
     *
     * This property may be overridden when creating a connection pool.
     *
     * For pools created with External Authentication or with homogeneous set to false, the number of
     * connections initially created is zero even if a larger value is specified for poolMin.
     * The pool increment is always 1, regardless of the value of poolIncrement.
     * Once the number of open connections exceeds poolMin and connections are idle for more than
     * the poolTimeout seconds, then the number of open connections does not fall below poolMin.
     *
     * @default 0
     */
    let poolMin: number;
    /**
     * When a pool getConnection() is called and the connection has been idle in the pool for at least
     * poolPingInterval seconds, node-oracledb internally “pings” the database to check the connection is alive.
     * After a ping, an unusable connection is destroyed and a usable one is returned by getConnection().
     * Connection pinging improves the chance a pooled connection is valid when it is first used because
     * identified unusable connections will not be returned to the application.
     *
     * This property may be overridden when creating a connection pool.
     *
     * @default 60
     * @since 1.12
     */
    let poolPingInterval: number | undefined;
    /**
     * The number of milliseconds that a connection should wait for a response from connection.ping(). Refer to oracledb.poolPingTimeout for details.
     * The default value is 5000 milliseconds.
     * This optional property overrides the oracledb.poolPingTimeout property.
     * See Connection Pool Pinging for more information.
     *
     * @since 6.4
     */
    let poolPingTimeout: number;
    /**
     * The number of seconds after which idle connections (unused in the pool) are terminated.
     * Idle connections are terminated only when the pool is accessed. If the poolTimeout is set to 0,
     * then idle connections are never terminated.
     *
     * This property may be overridden when creating a connection pool.
     *
     * @default 60
     */
    let poolTimeout: number;
    /**
     * This is a query tuning option to set the number of additional rows the underlying Oracle Client library
     * fetches during the internal initial statement execution phase of a query. The prefetch size does not affect when, or how many,
     * rows are returned by node-oracledb to the application.
     *
     * The prefetchRows attribute can be used in conjunction with oracledb.fetchArraySize to tune query performance, memory use,
     * and to reduce the number of round-trip calls needed to return query results.
     *
     * The prefetchRows value is ignored in some cases, such as when the query involves a LOB.
     *
     * If you fetch a REF CURSOR, retrieve rows from that cursor, and then pass it back to a PL/SQL block, you should set
     * prefetchRows to 0 during the initial statement that gets the REF CURSOR. This ensures that rows are not internally
     * fetched from the REF CURSOR by node-oracledb thus making them unavailable in the final PL/SQL code.
     *
     * This property may be overridden in an connection.execute() call, which is preferred usage if you need to change the value.
     *
     * This attribute is not used in node-oracledb version 2, 3 or 4. In those versions use only oracledb.fetchArraySize instead.
     *
     * @default 2
     * @see https://oracle.github.io/node-oracledb/doc/api.html#rowfetching
     */
    let prefetchRows: number;
    /**
     * The oracledb.Promise property is no longer used in node-oracledb 5 and has no effect.
     *
     * Node-oracledb supports Promises on all methods. The native Promise library is used.
     *
     * @deprecated 5.0
     */
    let Promise: Promise<any>;
    /**
     * The number of milliseconds after which connection requests waiting in the connection request queue are terminated.
     * If queueTimeout is 0, then queued connection requests are never terminated.
     *
     * This property may be overridden when creating a connection pool.
     *
     * @default 60000
     * @since 1.7
     */
    let queueTimeout: number;
    /**
     * The maximum number of pending pool.getConnection() calls that can be queued.
     *
     * When the number of pool.getConnection() calls that have been queued waiting for an available connection reaches queueMax,
     * then any future pool.getConnection() calls will immediately return an error and will not be queued.
     *
     * If queueMax is -1, then the queue length is not limited.
     *
     * This property may be overridden when creating a connection pool.
     *
     * @default 500
     */
    let queueMax: number;
    /**
     * This property was removed in node-oracledb 3.0 and queuing was always enabled.
     * In node-oracledb 5.0, set queueMax to 0 to disable queuing.
     *
     * @see https://oracle.github.io/node-oracledb/doc/api.html#connpoolqueue
     */
    let errorOnConcurrentExecute: boolean;
    /**
     * This property can be set to throw an error if concurrent operations are attempted
     * on a single connection.
     *
     * The default value for errorOnConcurrentExecute is false.
     *
     * Each Oracle connection can only interact with the database for one operation at a time.
     * Attempting to do more than one operation concurrently may be a sign of an incorrectly coded application,
     * for example an await may be missing.
     * Examples of operations that cannot be executed in parallel on a single connection include connection.execute(),
     *  connection.executeMany(), connection.queryStream(), connection.getDbObjectClass(), connection.commit(),
     *  connection.close(), SODA calls, and streaming from Lobs.
     */
    let queueRequests: number;
    /**
     * The number of statements that are cached in the statement cache of each connection.
     *
     * This property may be overridden for specific Pool or Connection objects.
     *
     * In general, set the statement cache to the size of the working set of statements being
     * executed by the application. Statement caching can be disabled by setting the size to 0.
     *
     * @default 30
     */
    let stmtCacheSize: number;
    /**
     * This property is a boolean that determines the node-oracledb driver mode which is in use. If the value is true, it indicates that node-oracledb Thin mode is in use.
     * If the value is false, it indicates that node-oracledb Thick mode is in use.
     * The default value is true.
     * Immediately after node-oracledb is imported, this property is set to true indicating that node-oracledb defaults to Thin mode. If oracledb.initOracleClient() is called,
     * then the value of this property is set to False indicating that Thick mode is enabled. Once the first standalone connection or connection pool is created,
     * or a call to oracledb.initOracleClient() is made, then node-oracledb’s mode is fixed and the value set in oracledb.thin will never change for the lifetime of the process.
     * The property connection.thin can be used to check a connection’s mode and the attribute pool.thin can be used to check a pool’s mode.
     * The value that is displayed for the connection.thin, pool.thin, and oracledb.thin attributes will be the same.
     */
    let thin: boolean;
    /**
     * This readonly property gives a numeric representation of the node-oracledb version.
     * For version x.y.z, this property gives the number: (10000 * x) + (100 * y) + z
     */
    const version: number;
    /**
     * This readonly property gives a string representation of the node-oracledb version, including the version suffix if one is present.
     *
     * @since 2.1
     */
    const versionString: string;
    /**
     * This readonly property gives a string representing the version suffix (e.g. “-dev” or “-beta”) or an empty string if no version suffix is present.
     *
     * @since 2.1
     */
    const versionSuffix: string;

    interface BindParameter {
        /**
         * The direction of the bind. One of the Execute Bind Direction Constants.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#oracledbconstantsbinddir
         */
        dir?: number | undefined;
        /**
         * The number of array elements to be allocated for a PL/SQL Collection INDEX BY associative
         * array OUT or IN OUT array bind variable. For IN binds, the value of maxArraySize is ignored.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#plsqlindexbybinds
         */
        maxArraySize?: number | undefined;
        /**
         * The maximum number of bytes that an OUT or IN OUT bind variable of type STRING or BUFFER can use to get data.
         *
         * The maximum limit depends on the database type, see below. When binding IN OUT, then maxSize refers to the
         * size of the returned value: the input value can be smaller or bigger. For IN binds, maxSize is ignored.
         *
         * @default 200
         */
        maxSize?: number | undefined;
        /**
         * The node-oracledb or JavaScript data type to be bound. One of the Node-oracledb Type Constants.
         *
         * With IN or IN OUT binds the type can be explicitly set with type or it will default to the type
         * of the input data value. With OUT binds, the type defaults to oracledb.STRING whenever type is not specified.
         */
        type?: DbType | number | string | undefined;
        /**
         * The input value or variable to be used for an IN or IN OUT bind variable.
         */
        val?: any;
    }

    /**
     * Used with connection.executeMany() to define a bind variable's types, sizes and directions.
     */
    interface BindDefinition {
        /**
         * The direction of the bind. One of the Execute Bind Direction Constants.
         *
         * @default BIND_IN
         */
        dir?: number | undefined;
        /**
         * Required for Strings and Buffers. Ignored for other types. Specifies the maximum number of bytes
         * allocated when processing each value of this bind variable. When data is being passed into the database,
         * maxSize should be at least the size of the longest value. When data is being returned from the database,
         * maxSize should be the size of the longest value. If maxSize is too small, executeMany() will throw an
         * error that is not handled by batchErrors.
         */
        maxSize?: number | undefined;
        /**
         * The node-oracledb or JavaScript data type to be bound. One of the Node-oracledb Type Constants.
         */
        type?: DbType | number | undefined;
    }

    /**
     * Used with connection.execute() to associate values or JavaScript variables to a statement’s bind variables by name.
     *
     * @see https://oracle.github.io/node-oracledb/doc/api.html#executebindParams
     */
    type BindParameters =
        | Record<string, BindParameter | string | number | bigint | Date | DBObject_IN<any> | Buffer | null | undefined>
        | BindParameter[]
        | any[];

    interface CloseConnectionOptions {
        /**
         * If drop is false, then the connection is returned to the pool for reuse.
         *
         * If drop is true, the connection will be completely dropped from the connection pool
         *
         * @default false
         */
        drop: boolean;
    }

    interface ResumeSessionlessTxnOpts {
        /**
         * The number of seconds that the current connection waits to resume a transaction if another connection is using it.
         * This timeout is only effective when the transaction is in use by another connection.
         * In this case, the current connection waits for the transaction to be suspended within this timeout period.
         *
         * @default 60s
         */
        timeout?: number;
        /** Determines whether the request to start a transaction is to be sent immediately or with the next database operation.
         *
         * @default false
         */
        deferRoundTrip?: boolean;
    }
    interface SessionlessTransactionOpts {
        /** A unique identifier for the sessionless transaction. */
        transactionId?: string | Buffer;
        /**
         * The number of seconds before which this transaction can be resumed by a connection the next time that it is suspended.
         * If a transaction is not resumed within this specified duration, the transaction will be rolled back.
         *
         * @default 60s
         */
        timeout?: number;
        /** Determines whether the request to start a transaction is to be sent immediately or with the next database operation.
         *
         * @default false
         */
        deferRoundTrip?: boolean;
    }

    interface Connection {
        /**
         * The action attribute for end-to-end application tracing.
         * This is a write-only property. Displaying a Connection object will show a value of null for this attribute.
         */
        action?: string | undefined;
        /**
         * Sets the maximum number of milliseconds that each underlying round-trip between node-oracledb and Oracle Database may take.
         * Each node-oracledb method or operation may make zero or more round-trips.
         * The callTimeout value applies to each round-trip individually, not to the sum of all round-trips.
         * Time spent processing in node-oracledb before or after the completion of each round-trip is not counted.
         */
        callTimeout?: number | undefined;
        /**
         * The client identifier for end-to-end application tracing, use with mid-tier authentication, and with Virtual Private Databases.
         * This is a write-only property. Displaying a Connection object will show a value of null for this attribute.
         */
        clientId?: string | undefined;

        /**
         * The client information for end-to-end application tracing.
         * This is a write-only property. Displaying connection.clientInfo will show a value of null.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#endtoend
         * @since 4.1
         */
        clientInfo?: string | undefined;
        /**
         * This read-only property identifies the connect string used to connect to Oracle Database.
         * Available only in node-oracledb Thin mode.
         *
         * @since 6.7
         */
        readonly connectString: string;
        /**
         * Object containing connection related information.
         * @since 6.7
         */
        connectTraceConfig?: {
            /**
             * ConnectString used to connect to the database.
             */
            readonly connectString?: string;
            /**
             * hostName of Oracle database.
             */
            readonly hostName?: string | undefined;
            /**
             * instanceName associated with the connection.
             */
            readonly instanceName?: string;
            /**
             * The name of pluggable Oracle database associated with connection.
             */
            readonly pdbName?: string;
            /**
             * port to Oracle database for associated connection.
             */
            readonly port?: number | undefined;
            /**
             * protocol used to establish connection to Oracle database.
             */
            readonly protocol?: string | undefined;
            /**
             * serviceName of Oracle database instance associated with connection.
             */
            readonly serviceName?: string;
            /**
             * Name of the user used to estaiblish connection.
             */
            readonly user: string;
        } | undefined;
        /**
         * After setting currentSchema, SQL statements using unqualified references to schema objects will resolve to objects in the specified schema.
         * This setting does not change the session user or the current user, nor does it give the session user any additional system or object privileges for the session.
         * The value of currentSchema will be empty until it has been explicitly set.
         * This property is an efficient alternative to ALTER SESSION SET CURRENT_SCHEMA.
         *
         * @since 4.0
         */
        currentSchema?: string | undefined;
        /**
         * This read-only property is a string that specifies the Oracle Database domain name associated with the connection. This property returns the same value as the SQL expression:
         * SELECT UPPER(VALUE) FROM V$PARAMETER WHERE NAME = 'db_domain';
         * The above SQL expression returns NULL if the domain name is not specified. The dbDomain property returns an empty string in this case.
         *
         * @since 6.3
         */
        readonly dbDomain?: string | undefined;
        /**
         * This read-only property is a string that specifies the name of the Oracle Database associated with the connection. This property returns the same value as the SQL expression:
         * SELECT UPPER(NAME) FROM V$DATABASE;
         *
         * @since 6.3
         */
        readonly dbName?: string | undefined;
        /**
         * The database operation information for end-to-end application tracing.
         * This is a write-only property. Displaying connection.dbOp will show a value of null.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#endtoend
         * @since 4.1
         */
        dbOp?: string | undefined;
        /**
         * This write-only property is a string that sets the execution context identifier.
         * The value is available in the ECID column of the V$SESSION view. It is also shown in audit logs.
         * Note: This property can only be used in the node-oracledb Thick mode. See Enabling node-oracledb Thick Mode.
         *
         * @since 5.3
         */
        ecid?: string | undefined;
        /**
         * This read-only property is a string that identifies the host name of Oracle Database.
         * Available only in node-oracledb Thin mode.
         *
         * @since 6.7
         */
        readonly hostName?: string;
        /**
         * This read-only attribute specifies the Oracle Database instance name associated with the connection. It returns the same value as the SQL expression sys_context('userenv', 'instance_name').
         *
         * @since 6.1
         */
        instanceName?: string | undefined;
        /**
         * This read-only attribute is an array of bytes that specifies the logical transaction ID for the connection.
         * It is used within Oracle Transaction Guard as a means of ensuring that transactions are not duplicated.
         * This attribute is only available with Oracle 12.1 Database or later. In node-oracledb Thick mode,
         * Oracle Client libraries 12.1 or later are additionally required.
         *
         * @since 6.9
         */
        readonly ltxid?: Buffer;
        /**
         * This read-only attribute specifies the maximum database identifier length in bytes supported by the database to which the connection has been established.
         * The value may be undefined, 30, or 128. The value undefined indicates the size cannot be reliably determined by node-oracledb, which occurs when using Oracle Client libraries 12.1 (or older) to connect to Oracle Database 12.2, or later.
         *
         * @since 6.8
         */
        readonly maxIdentifierLength?: number | undefined;
        /**
         * This read-only property is a number that indicates the maximum number of SQL statements that can be concurrently opened in one connection. This value can be specified in the server parameter file using the open_cursors parameter. This property returns the same value as the SQL expression:
         * SELECT VALUE FROM V$PARAMETER WHERE NAME = 'open_cursors';
         * This property requires Oracle Database 12.1 or later.
         *
         * @since 6.3
         */
        readonly maxOpenCursors?: number | undefined;
        /**
         * The module attribute for end-to-end application tracing.
         * This is a write-only property. Displaying a Connection object will show a value of null for this attribute.
         */
        module?: string | undefined;
        /**
         * This readonly property gives a numeric representation of the Oracle database version which is useful in comparisons.
         * For version a.b.c.d.e, this property gives the number: (100000000 * a) + (1000000 * b) + (10000 * c) + (100 * d) + e.
         * Note if you connect to Oracle Database 18, the version will only be accurate if node-oracledb is also using Oracle Database 18 client libraries.
         * Otherwise it will show the base release such as 1800000000 instead of 1803000000.
         *
         * @since 1.3
         */
        readonly oracleServerVersion: number;
        /**
         * This readonly property gives a string representation of the Oracle database version which is useful for display.
         * Note if you connect to Oracle Database 18, the version will only be accurate if node-oracledb is also using Oracle Database 18 client libraries.
         * Otherwise it will show the base release such as “18.0.0.0.0” instead of “18.3.0.0.0”.
         *
         * @since 2.2
         */
        readonly oracleServerVersionString: string;
        /**
         * This read-only property identifies the port to which the client is connected.
         * Available only in node-oracledb Thin mode.
         *
         * @since 6.7
         */
        readonly port: number;
        /**
         * This read-only property identifies the protocol used to connect to Oracle Database.
         * Available only in node-oracledb Thin mode.
         *
         * @since 6.7
         */
        readonly protocol: string;
        /**
         * This read-only property is a string that identifies the Oracle Database service name associated with the connection. This property returns the same value as the SQL expression:
         * SELECT UPPER(SYS_CONTEXT('USERENV', 'SERVICE_NAME')) FROM DUAL;
         *
         * @since 6.3
         */
        readonly serviceName?: string | undefined;
        /**
         * The number of statements to be cached in the statement cache of the connection.
         * The default value is the stmtCacheSize property in effect in the Pool object when the connection is created in the pool.
         */
        readonly stmtCacheSize: number;
        /**
         * Applications can set the tag property on pooled connections to indicate the ‘session state’ that a connection has.
         * The tag will be retained when the connection is released to the pool.
         * A subsequent pool.getConnection() can request a connection that has a given tag.
         * It is up to the application to set any desired session state and set connection.tag prior to closing the connection.
         * The tag property is not used for standalone connections.
         * When node-oracledb is using Oracle Client libraries 12.2 or later, the tag must be a multi-property tag with name=value pairs like “k1=v1;k2=v2”.
         * An empty string represents not having a tag set.
         *
         * @since 3.1
         */
        tag?: string | undefined;
        /**
         * This read-only attribute is a boolean that identifies the node-oracledb mode in which the connection was established. If the value is true, then it indicates that the connection was established in node-oracledb Thin mode.
         * If the value is false, then it indicates that the connection was established in node-oracledb Thick mode.
         * The default value is true.
         *
         * @since 6.0
         */
        readonly thin?: boolean | undefined;
        /**
         * This read/write attribute is a string that specifies the internal name that is used by the connection when logging two-phase commit transactions.
         * This property can only be used in the node-oracledb Thick mode. See Enabling node-oracledb Thick Mode.
         *
         * @since 5.3
         */
        tpcInternalName?: string | undefined;
        /**
         * This read/write attribute is a string that specifies the external name that is used by the connection when logging two-phase commit transactions.
         * This property can only be used in the node-oracledb Thick mode. See Enabling node-oracledb Thick Mode.
         */
        tpcExternalName?: string | undefined;
        /**
         * This read-only property is a boolean that indicates whether a transaction is currently in progress in the connection. If the value is True, then it indicates that the specified connection has an active transaction. If the value is False, then the specified connection does not have an active transaction.
         *
         * @since 6.3
         */
        readonly transactionInProgress?: boolean | undefined;
        /**
         * This read-only identifies the user provided to connect to Oracle Database.
         *
         * @since 6.7
         */
        readonly user?: string;
        /**
         * This read-only property provides an error object that gives information about any database warnings (such as password being in the grace period) that were generated during connection establishment (both standalone connections and pooled connections). This attribute is present if a warning is thrown by the database but the operation is otherwise completed successfully. The connection will be usable despite the warning.
         * For standalone connections, the error object returned by connection.warning will be present for the lifetime of the connection.
         * For pooled connections, the error object returned by connection.warning will be cleared when a connection is released to the pool using connection.close().
         * In node-oracledb Thick mode, warnings may be generated during pool creation itself. These warnings will be placed on the new connections created by the pool, provided no warnings were generated by the individual connection creations, in which case those connection warnings will be returned.
         *
         * @since 6.3
         */
        readonly warning?: DBError | undefined;
        /**
         * Begins a new sessionless transaction using the specified transaction identifier.
         * This method returns the transaction identifier specified by the user or generated by node-oracledb as a Buffer value.
         *
         * @since 6.9
         */
        beginSessionlessTransaction(opts: SessionlessTransactionOpts): SessionlessTransactionOpts["transactionId"];
        beginSessionlessTransaction(opts: SessionlessTransactionOpts, callback: (error: DBError) => void): void;
        /**
         * Stops the currently running operation on the connection.
         *
         * If there is no operation in progress or the operation has completed by the time the break is issued, the break() is effectively a no-op.
         *
         * If the running asynchronous operation is interrupted, its callback will return an error.
         *
         * In network configurations that drop (or in-line) out-of-band breaks, break() may hang unless you have DISABLE_OOB=ON in a sqlnet.ora file.
         *
         * If you use use break() with DRCP connections, it is currently recommended to drop the connection when releasing it back to the pool: await connection.close({drop: true}).
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#tnsadmin
         */
        break(): Promise<void>;
        break(callback: (error: DBError) => void): void;

        /**
         * Changes the password of the specified user.
         *
         * Only users with the ALTER USER privilege can change passwords of other users.
         *
         * @param user The name of the user whose password is to be changed.
         * @param oldPassword The current password of the currently connected user. If changePassword() is being used by a DBA to change the password of another user, the value of oldPassword is ignored and can be an empty string.
         * @param newPassword The new password of the user whose password is to be changed.
         *
         * @since 2.2
         * @see https://oracle.github.io/node-oracledb/doc/api.html#changingpassword
         */
        changePassword(user: string, oldPassword: string, newPassword: string): Promise<void>;
        changePassword(
            user: string,
            oldPassword: string,
            newPassword: string,
            callback: (error: DBError) => void,
        ): void;

        /**
         * Releases a connection.
         *
         * Calling close() as soon as a connection is no longer required is strongly encouraged for system efficiency.
         * Calling close() for pooled connections is required to prevent the pool running out of connections.
         *
         * When a connection is released, any ongoing transaction on the connection is rolled back.
         *
         * If an error occurs on a pooled connection and that error is known to make the connection
         * unusable, then close() will drop that connection from the connection pool so a future
         * pooled getConnection() call that grows the pool will create a new, valid connection.
         *
         * @param options Only affects pooled connections.
         *
         * @since 1.9
         * @alias release()
         */
        close(options: CloseConnectionOptions): Promise<void>;
        close(): Promise<void>;
        close(options: CloseConnectionOptions, callback: (error: DBError) => void): void;
        close(callback: (error: DBError) => void): void;

        /**
         * This call commits the current transaction in progress on the connection.
         */
        commit(): Promise<void>;
        commit(callback: (error: DBError) => void): void;

        /**
         * Creates a Lob as an Oracle temporary LOB. The LOB is initially empty. Data can be streamed to the LOB,
         * which can then be passed into PL/SQL blocks, or inserted into the database.
         *
         * When no longer required, Lobs created with createLob() should be closed with lob.close() because
         * Oracle Database resources are held open if temporary LOBs are not closed.
         *
         * Open temporary LOB usage can be monitored using the view V$TEMPORARY_LOBS.
         *
         * LOBs created with createLob() can be bound for IN, IN OUT and OUT binds.
         *
         * @param type One of the constants CLOB or BLOB
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#lobhandling
         * @see https://oracle.github.io/node-oracledb/doc/api.html#lobbinds
         */
        createLob(type: DbType): Promise<Lob>;
        createLob(type: DbType, callback: (error: DBError, lob: Lob) => void): void;
        /**
         * This synchronous method decodes an OSON Buffer and returns a Javascript value. This method is useful for fetching BLOB columns that have the check constraint IS JSON FORMAT OSON enabled.
         * The parameters of the connection.decodeOSON() are: buf; Buffer; The OSON buffer that is to be decoded.
         *
         * @param buf The OSON buffer that is to be decoded.
         *
         * @since 6.4
         *
         * @see https://node-oracledb.readthedocs.io/en/latest/user_guide/json_data_type.html#osontype
         */
        decodeOSON(buf: Buffer): any;
        /**
         * This synchronous method encodes a JavaScript value to OSON bytes and returns a Buffer. This method is useful for inserting OSON bytes directly into BLOB columns that have the check constraint IS JSON FORMAT OSON enabled.
         *
         * @param value The JavaScript value that is to be encoded into OSON bytes. The JavaScript value can be any value supported by JSON.
         *
         * @since 6.4
         *
         * @see https://node-oracledb.readthedocs.io/en/latest/user_guide/json_data_type.html#osontype
         */
        encodeOSON(value: any): Buffer;
        /**
         * This call executes a single SQL or PL/SQL statement.
         *
         * @param sql The SQL statement that is executed. The statement may contain bind parameters.
         * @param bindParams This function parameter is needed if there are bind parameters in the SQL statement.
         * @param options This is an optional parameter to execute() that may be used to control statement execution.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#sqlexecution
         * @see https://oracle.github.io/node-oracledb/doc/api.html#querystream For an alternative
         */
        execute<T>(sql: string, bindParams: BindParameters, options: ExecuteOptions): Promise<Result<T>>;
        execute<T>(
            sql: string,
            bindParams: BindParameters,
            options: ExecuteOptions,
            callback: (error: DBError, result: Result<T>) => void,
        ): void;

        /**
         * This call executes a single SQL or PL/SQL statement.
         *
         * @param sql The SQL statement that is executed. The statement may contain bind parameters.
         * Changed in version 6.4: The ability to accept an object (returned from the sql function of the third-party sql-template-tag module) as an input parameter was added to connection.execute().
         *
         * @param bindParams This function parameter is needed if there are bind parameters in the SQL statement.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#sqlexecution
         * @see https://oracle.github.io/node-oracledb/doc/api.html#querystream For an alternative
         */
        execute<T>(sql: string, bindParams: BindParameters): Promise<Result<T>>;
        execute<T>(
            sql: string,
            bindParams: BindParameters,
            callback: (error: DBError, result: Result<T>) => void,
        ): void;

        /**
         * This call executes a single SQL or PL/SQL statement.
         *
         * @param sql The SQL statement that is executed. The statement may contain bind parameters.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#sqlexecution
         * @see https://oracle.github.io/node-oracledb/doc/api.html#querystream For an alternative
         */
        execute<T>(sql: string): Promise<Result<T>>;
        execute<T>(sql: string, callback: (error: DBError, result: Result<T>) => void): void;
        /**
         * This call executes a single SQL or PL/SQL statement.
         *
         * @param sql The SQL object that has statement to be executed and bindParams.
         * The statement may contain bind parameters.
         * The SQL object contains bind parameters if statement has it.
         * @param options This is an optional parameter to execute() that may be used to control statement execution.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#sqlexecution
         * @see https://github.com/blakeembrey/sql-template-tag
         * @see https://github.com/oracle/node-oracledb/issues/1629
         */
        execute<T>(sql: object): Promise<Result<T>>;
        execute<T>(sql: object, callback: (error: DBError, result: Result<T>) => void): void;
        execute<T>(sql: object, options: ExecuteOptions): Promise<Result<T>>;
        execute<T>(
            sql: object,
            options: ExecuteOptions,
            callback: (error: DBError, result: Result<T>) => void,
        ): void;
        /**
         * This method allows sets of data values to be bound to one DML or PL/SQL statement for execution.
         * It is like calling connection.execute() multiple times but requires fewer round-trips.
         * This is an efficient way to handle batch changes, for example when inserting or updating multiple rows.
         * The method cannot be used for queries.
         *
         * The executeMany() method supports IN, IN OUT and OUT binds for most data types
         * except PL/SQL Collection Associative Arrays.
         *
         * The version of this function which accepts a number of iterations should be used when no bind parameters
         * are required or when all bind parameters are OUT binds.
         *
         * @param sql The SQL or PL/SQL statement that executeMany() executes. The statement should contain bind variable names.
         * @param binds
         *
         * Contains values or variables to be bound to the executed statement.
         * It must be an array of arrays (for ‘bind by position’) or an array of objects whose keys
         * match the bind variable names in the SQL statement (for ‘bind by name’). Each sub-array or
         * sub-object should contain values for the bind variables used in the SQL statement.
         * At least one such record must be specified.
         *
         * If a record contains fewer values than expected, NULL values will be used. For bind by position,
         * empty values can be specified using syntax like [a,,c,d].
         *
         * By default, the direction of binds is BIND_IN. The first data record determines
         * the number of bind variables, each bind variable’s data type, and its name (when binding by name).
         * If a variable in the first record contains a null, this value is ignored and a subsequent record
         * is used to determine that variable’s characteristics. If all values in all records for a particular
         * bind variable are null, the type of that bind is STRING with a maximum size of 1.
         *
         * The maximum sizes of strings and buffers are determined by scanning all records in the bind data.
         *
         * If a bindDefs property is used, no data scanning occurs. This property explicitly specifies the
         * characteristics of each bind variable.
         *
         * @param options Optional parameter to control the execution.
         *
         * @since 2.2
         */
        executeMany<T>(sql: string, binds: BindParameters[], options: ExecuteManyOptions): Promise<Results<T>>;
        executeMany<T>(
            sql: string,
            binds: BindParameters[],
            options: ExecuteManyOptions,
            callback: (error: DBError, result: Results<T>) => void,
        ): void;

        executeMany<T>(sql: string, binds: BindParameters[]): Promise<Results<T>>;
        executeMany<T>(
            sql: string,
            binds: BindParameters[],
            callback: (error: DBError, result: Results<T>) => void,
        ): void;

        /**
         * This method allows sets of data values to be bound to one DML or PL/SQL statement for execution.
         * It is like calling connection.execute() multiple times but requires fewer round-trips.
         * This is an efficient way to handle batch changes, for example when inserting or updating multiple rows.
         * The method cannot be used for queries.
         *
         * The executeMany() method supports IN, IN OUT and OUT binds for most data types
         * except PL/SQL Collection Associative Arrays.
         *
         * The version of this function which accepts a number of iterations should be used when no bind parameters
         * are required or when all bind parameters are OUT binds.
         *
         * @param sql The SQL or PL/SQL statement that executeMany() executes. The statement should contain bind variable names.
         * @param iterations The number of times the SQL should be executed.
         * @param options Optional parameter to control the execution.
         */
        executeMany<T>(sql: string, iterations: number, options: ExecuteManyOptions): Promise<Results<T>>;
        executeMany<T>(
            sql: string,
            iterations: number,
            options: ExecuteManyOptions,
            callback: (error: DBError, result: Results<T>) => void,
        ): void;

        executeMany<T>(sql: string, iterations: number): Promise<Results<T>>;
        executeMany<T>(sql: string, iterations: number, callback: (error: DBError, result: Results<T>) => void): void;

        /**
         * Returns a DbObject prototype object representing the named Oracle Database object or collection.
         * When the definition of a type changes in the database, such as might occur in a development environment,
         * you should fully close connections to clear the object caches used by node-oracledb and the Oracle client libraries.
         *
         * For example, when using a pool you could use await connection.close({drop: true}), or restart the pool.
         * Then getDbObjectClass() can be called again to get the updated type information.
         *
         * @param className The name of the Oracle object or collection.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#objects
         * @since 4.0
         */
        getDbObjectClass<T>(className: string): Promise<DBObjectClass<T>>;
        getDbObjectClass<T>(className: string, callback: (error: DBError, dbObject: DBObjectClass<T>) => void): void;

        getQueue<T>(name: string, options?: GetAdvancedQueueOptions): Promise<AdvancedQueue<T>>;
        getQueue<T>(name: string, callback: (error: DBError, queue: AdvancedQueue<T>) => void): void;
        getQueue<T>(
            name: string,
            options: GetAdvancedQueueOptions,
            callback: (error: DBError, queue: AdvancedQueue<T>) => void,
        ): void;

        /**
         * Returns a parent SodaDatabase object for use with Simple Oracle Document Access (SODA).
         *
         * @since 3.0
         * @see https://oracle.github.io/node-oracledb/doc/api.html#sodaoverview
         */
        getSodaDatabase(): SodaDatabase;

        /**
         * Parses a SQL statement and returns information about it. This is most useful for finding column
         * names of queries, and for finding the names of bind variables used.
         *
         * This method performs a round-trip to the database, so unnecessary calls should be avoided.
         *
         * The information is provided by lower level APIs that have some limitations. Some uncommon
         * statements will return the statement type as oracledb.STMT_TYPE_UNKNOWN.
         * DDL statements are not parsed, so syntax errors in them will not be reported.
         * The direction and types of bind variables cannot be determined.
         *
         * @param sql SQL statement to parse.
         *
         * @since 2.2
         */
        getStatementInfo(sql: string): Promise<StatementInfo>;
        getStatementInfo(sql: string, callback: (error: DBError, info: StatementInfo) => void): void;
        /**
         * This synchronous function returns a boolean indicating the health status of a connection.
         * Connections may become unusable in several cases, such as if the network socket is broken, if an Oracle error indicates the connection is unusable or after receiving a planned down notification from the database.
         * This function is best used before starting a new database request on an existing standalone connection. Pooled connections internally perform this check before returning a connection to the application.
         * If this function returns false, the connection should be closed by the application and a new connection should be established instead.
         * This function performs a local check. To fully check a connection’s health, use connection.ping() which performs a round-trip to the database.
         */
        isHealthy(): boolean;
        /**
         * This method checks that a connection is currently usable and the network to the database is valid.
         * This call can be useful for system health checks. A ping only confirms that a single connection
         * is usable at the time of the ping.
         *
         * Pinging does not replace error checking during statement execution, since network or database
         * failure may occur in the interval between ping() and execute() calls.
         *
         * Pinging requires a round-trip to the database so unnecessary ping calls should be avoided.
         *
         * If ping() returns an error, the application should close the connection.
         *
         * @since 2.2
         */
        ping(): Promise<void>;
        ping(callback: (error: DBError) => void): void;

        /**
         * This function provides query streaming support. The parameters are the same as execute() except
         * a callback is not used. Instead this function returns a stream used to fetch data.
         *
         * Each row is returned as a data event. Query metadata is available via a metadata event.
         * The end event indicates the end of the query results.
         *
         * The connection must remain open until the stream is completely read.
         *
         * For tuning, adjust the value of oracledb.fetchArraySize or the option fetchArraySize (see execute()).
         *
         * @param sql The SQL statement that is executed. The statement may contain bind parameters.
         * @param bindParams This function parameter is needed if there are bind parameters in the SQL statement.
         * @param options This is an optional parameter to execute() that may be used to control statement execution.
         *
         * @since 1.8
         * @see https://oracle.github.io/node-oracledb/doc/api.html#streamingresults
         */
        queryStream<T>(sql: string, bindParams: BindParameters, options: ExecuteOptions): QueryStream<T>;
        queryStream<T>(sql: string, bindParams: BindParameters): QueryStream<T>;
        queryStream<T>(sql: string): QueryStream<T>;

        /**
         * Releases a connection.
         *
         * Calling release() as soon as a connection is no longer required is strongly encouraged for system efficiency.
         * Calling release() for pooled connections is required to prevent the pool running out of connections.
         *
         * When a connection is released, any ongoing transaction on the connection is rolled back.
         *
         * If an error occurs on a pooled connection and that error is known to make the connection
         * unusable, then release() will drop that connection from the connection pool so a future
         * pooled getConnection() call that grows the pool will create a new, valid connection.
         *
         * @param options Only affects pooled connections.
         *
         * @since 1.9
         * @alias close()
         */
        release(options: CloseConnectionOptions): Promise<void>;
        release(): Promise<void>;
        release(options: CloseConnectionOptions, callback: (error: DBError) => void): void;
        release(callback: (error: DBError) => void): void;

        /**
         * Resumes an existing sessionless transaction using the specified transaction identifier.
         * This method returns the transaction identifier used to resume the sessionless transaction as a Buffer value.
         *
         * @since 6.9
         */
        resumeSessionlessTransaction(
            transactionId: SessionlessTransactionOpts["transactionId"],
            resTxnOpts?: ResumeSessionlessTxnOpts,
        ): SessionlessTransactionOpts["transactionId"];
        resumeSessionlessTransaction(callback: (error: DBError) => void): void;
        /**
         * Rolls back the current transaction in progress on the connection.
         */
        rollback(): Promise<void>;
        rollback(callback: (error: DBError) => void): void;

        /**
         * Used to shut down a database instance. This is the flexible version of oracledb.shutdown(), allowing more control over behavior.
         *
         * This method must be called twice. The first call blocks new connections. SQL statements such as await ALTER DATABASE CLOSE NORMAL
         * and ALTER DATABASE DISMOUNT can then be used to close and unmount the database instance. Alternatively database administration can
         * be performed. Finally, a second call connection.shutdown(oracledb.SHUTDOWN_MODE_FINAL) is required to fully close the database instance.
         *
         * If the initial connection.shutdown() shutdownMode mode oracledb.SHUTDOWN_MODE_ABORT is used, then connection.shutdown() does not need to be called a second time.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#startupshutdown
         * @since 5.0
         */
        shutdown(mode?: number): Promise<void>;
        shutdown(mode: number, cb: (err: Error) => void): void;
        shutdown(cb: (err: Error) => void): void;

        /**
         * Used to start up a database instance. This is the flexible version of oracledb.startup(), allowing more control over behavior.
         *
         * The connection must be a standalone connection, not a pooled connection.
         *
         * This function starts the database in an unmounted state. SQL statements such as ALTER DATABASE MOUNT and ALTER DATABASE OPEN
         * can then be executed to completely open the database instance. Database recovery commands could also be executed at this time.
         *
         * The connection used must have the privilege set to oracledb.SYSPRELIM, along with either oracledb.SYSDBA or oracledb.SYSOPER.
         * For example oracledb.SYSDBA | oracledb.SYSPRELIM.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#startupshutdown
         * @since 5.0
         */
        startup(opts?: StartupOptions): Promise<void>;
        startup(opts: StartupOptions, cb: (err: Error) => void): void;
        startup(cb: (err: Error) => void): void;

        /**
         * Register a JavaScript callback method to be invoked when data is changed in the database by any committed transaction,
         * or when there are Advanced Queuing messages to be dequeued.
         *
         * For notifications to work, the connection must be created with events mode true, which is the default.
         * The database must be able to connect to the node-oracledb machine for notifications to be received.
         * Typically this means that the machine running node-oracledb needs a fixed IP address.
         *
         * If there is any problem sending a notification, then the callback method will not be invoked.
         * The connection.subscribe() method may be called multiple times with the same name, as long as the same connection is used.
         * In this case, the second and subsequent invocations ignore all options properties other than sql and binds.
         * Instead, the new SQL statement is registered to the same subscription, and the same JavaScript notification callback is used.
         * For performance reasons this can be preferable to creating a new subscription for each query.
         *
         * AQ notifications were added in node-oracledb 4.0.
         * The result callback parameter was added in node-oracledb 4.0.
         *
         * @param name For Continuous Query Notification this is an arbitrary name given to the subscription. For Advanced Queuing notifications this must be the queue name.
         * @param options Options that control the subscription.
         *
         * @since 2.3
         */
        subscribe(name: string, options: SubscribeOptions): Promise<Subscription>;
        subscribe(
            name: string,
            options: SubscribeOptions,
            callback: (error: DBError, result: Subscription) => void,
        ): void;

        /**
         * Suspends the currently active sessionless transaction immediately.
         * This detaches the transaction from the connection, allowing it to be resumed later with the transaction identifier that was specified when
         * creating the sessionless transaction. Also, the timeout value defined in Connection.beginSessionlessTransaction()
         *  comes into effect and determines how long the transaction can stay suspended.
         *
         * @since 6.9
         */
        suspendSessionlessTransaction(): void;
        suspendSessionlessTransaction(callback: (error: DBError) => void): void;
        /**
         * Unregister a Continuous Query Notification (CQN) subscription previously created with connection.subscribe().
         * No further notifications will be sent. The notification callback does not receive a notification of the
         * deregistration event.
         *
         * A subscription can be unregistered using a different connection to the initial subscription, as long as
         * the credentials are the same.
         *
         * If the subscription timeout was reached and the subscription was automatically unregistered, you will get
         * an error if you call connection.unsubscribe().
         *
         * @param name Name of the subscription used in connection.subscribe().
         */
        unsubscribe(name: string): Promise<void>;
        unsubscribe(name: string, callback: (error: DBError) => void): void;
    }

    /**
     * Result of connection.subscribe() for continous query notification subscriptions.
     *
     * @see https://oracle.github.io/node-oracledb/doc/api.html#cqn
     * @since 4.0
     */
    interface Subscription {
        /**
         * Value of REGID in the database view USER_CHANGE_NOTIFICATION_REGS or the value of REG_ID in USER_SUBSCR_REGISTRATIONS.
         *
         * For advanced queue SUBSCR_NAMESPACE_AQ subscriptions, regId is undefined.
         */
        regId?: string | undefined;
    }

    /**
     * Used with connection.subscribe() to control a subscription.
     */
    interface SubscribeOptions {
        /** An array (bind by position) or object (bind by name) containing the bind values to use in the sql property. */
        binds?: BindParameters | undefined;
        /** The notification callback that will be called whenever notifications are sent by the database. */
        callback: (message: SubscriptionMessage) => void;
        /**
         * Enables CQN “client initiated” connections which internally use the same approach as normal connections to the database,
         * and do not require the database to be able to connect back to the application. Since client initiated connections
         * do not need additional network configuration, they have ease-of-use and security advantages.
         *
         * @default false
         * @since 4.2
         */
        clientInitiated?: boolean | undefined;
        /**
         * An integer mask which currently, if set, can only contain the value SUBSCR_GROUPING_CLASS_TIME.
         * If this value is set then notifications are grouped by time into a single notification.
         */
        groupingClass?: number | undefined;
        /**
         * Either SUBSCR_GROUPING_TYPE_SUMMARY (the default) indicating notifications should be
         * grouped in a summary, or SUBSCR_GROUPING_TYPE_LAST indicating the last notification in the
         * group should be sent.
         */
        groupingType?: number | undefined;
        /**
         * If groupingClass contains SUBSCR_GROUPING_CLASS_TIME then groupingValue can be used to
         * set the number of seconds over which notifications will be grouped together, invoking callback once.
         * If groupingClass is not set, then groupingValue is ignored.
         */
        groupingValue?: number | undefined;
        /**
         * A string containing an IPv4 or IPv6 address on which the subscription should listen to receive notifications.
         * If not specified, then the Oracle Client library will select an IP address.
         */
        ipAddress?: string | undefined;
        /** One of the Subscribe Namespace Constants. */
        namespace?: number | undefined;
        /**
         * An integer mask containing one or more of the operation type CQN_OPCODE_* constants to
         * indicate what types of database change should generation notifications.
         */
        operations?: number | undefined;
        /**
         * The port number on which the subscription should listen to receive notifications.
         * If not specified, then the Oracle Client library will select a port number.
         */
        port?: number | undefined;
        /** An integer mask containing one or more of the quality of service SUBSCR_QOS_* constants. */
        qos?: number | undefined;
        /** The SQL query string to use for notifications. */
        sql: string;
        /**
         * The number of seconds the subscription should remain active. Once this length of time has been reached,
         * the subscription is automatically unregistered and a deregistration notification is sent.
         */
        timeout?: number | undefined;
    }

    /**
     * Information about a subscription's notification.
     */
    interface SubscriptionMessage {
        /** Name of the database which sent the notification. */
        dbName?: string | undefined;
        /**
         * Name of the Advanced Queue. Undefined for CQN.
         *
         * @since 4.0
         */
        queueName?: string | undefined;
        /** Array of objects specifying the queries which were affected by the Query Change notification. */
        queries?:
            | Array<{
                /** Array of objects specifying the tables which were affected by the notification. */
                tables?: SubscriptionTable[];
            }>
            | undefined;
        /** Indicates whether the subscription is registered with the database. */
        registered: boolean;

        /** Buffer containing the identifier of the transaction which spawned the notification. */
        txId: Buffer;
        /** Registration ID of affected registration. */
        regId: bigint;
        /** Type of notification sent. One of the Subscribe Event Type Constants. */
        type: number;
    }

    /**
     * An object specifying the table that was affected by a subscription's notification.
     */
    interface SubscriptionTable {
        /** Name of the table which was modified in some way. */
        name: string;
        /**
         * One of the CQN_OPCODE_* constants.
         */
        operation: number;
        /**
         * array of objects specifying the rows which were changed. This will only be defined if the qos
         * quality of service used when creating the subscription indicated the desire for ROWIDs and no
         * summary grouping took place.
         */
        rows?:
            | Array<{
                /** One of the CQN_OPCODE_* constants. */
                operation: number;
                /** ROWID of the row that was affected. */
                rowid: string;
            }>
            | undefined;
    }

    /**
     * Result of connection.getStatementInfo().
     */
    interface StatementInfo<T = {}> {
        /** Array of strings corresponding to the unique names of the bind variables used in the SQL statement. */
        bindNames?: string[] | undefined;
        /** Extended metadata properties. */
        metaData?: Array<Metadata<T>> | undefined;
        /** One of the SQL Statement Type Constants. */
        statementType?: number | undefined;
    }

    type AccessToken = () => string | string | { token: string } | (() => { token: string; privateKey: string }) | {
        token: string;
        privateKey: string;
    };
    interface AccessTokenConfigAzure {
        clientId: string;
        authority: string;
        scopes: string;
        clientSecret?: string | undefined;
        authType: string;
    }
    interface AccessTokenConfigOCI {
        profile: string;
        configFileLocation: string;
    }
    type AppContextOpts = [string, string, string];
    /**
     * Provides connection credentials and connection-specific configuration properties.
     */
    interface ConnectionAttributes {
        /**
         * For Microsoft Azure Active Directory OAuth 2.0 token-based authentication, accessToken can be:
         *      a callback function returning the token as a string
         *      an object with a token attribute containing the token as a string
         *      or the token as a string
         *
         * Tokens can be obtained using various approaches. For example, using the Azure Active Directory API.
         *
         * For Oracle Cloud Infrastructure Identity and Access Management (IAM) token-based authentication, accessToken can be:
         *      a callback function returning an object containing token and privateKey attributes
         *      or an object containing token and privateKey attributes
         *
         * The properties of the accessToken object are described in createPool(): accessToken Object Attributes.
         *
         * If accessToken is a callback function:
         *      function accessToken(boolean refresh, object accessTokenConfig)
         *
         * When accessToken is a callback function, it will be invoked at the time the pool is created (even if poolMin is 0). It is also called when the pool needs to expand (causing new connections to be created) and the current token has expired. The returned token is used by node-oracledb for authentication. The refresh parameter is described in createPool(): refresh Parameter Values.
         * The accessTokenConfig parameter is described in accessTokenConfig.
         *
         * When the callback is first invoked, the refresh parameter will be set to false. This indicates that the application can provide a token from its own application managed cache, or it can generate a new token if there is no cached value. Node-oracledb checks whether the returned token has expired. If it has expired, then the callback function will be invoked a second time with refresh set to true. In this case the function must externally acquire a token, optionally add it to the application’s cache, and return the token.
         * For token-based authentication, the externalAuth and homogeneous pool attributes must be set to true. The user (or username) and password attributes should not be set.
         * See Token-Based Authentication for more information.
         *
         * New in version 5.4: The accessToken property was added to support IAM token-based authentication.For IAM token-based authentiation, this property must be an Object. For node-oracledb Thick mode, Oracle Client libraries 19.14 (or later), or 21.5 (or later) must be used for IAM token-based authentication.
         *
         * Changed in version 5.5: The accessToken property was extended to allow OAuth 2.0 token-based authentication in node-oracledb 5.5. For OAuth 2.0, the property should be a string, or a callback. For node-oracledb Thick mode, Oracle Client libraries 19.15 (or later), or 21.7 (or later) must be used. The callback usage supports both OAuth 2.0 and IAM token-based authentication.
         * @since 5.4
         */
        accessToken?: AccessToken | undefined;
        /**
         * An object containing the Azure-specific or OCI-specific parameters that need to be set when using the Azure Software Development Kit (SDK) or Oracle Cloud Infrastructure (OCI) SDK for token generation. This property should only be specified when the accessToken property is a callback function. For more information on the Azure-specific parameters, see sampleazuretokenauth.js  and for the OCI-specific parameters, see sampleocitokenauth.js.
         * For OAuth2.0 token-based authentication and when using node-oracledb Thick mode, Oracle Client libraries 19.15 (or later), or 21.7 (or later) must be used. For IAM token-based authentication and when using node-oracledb Thick mode, Oracle Client libraries 19.14 (or later), or 21.5 (or later) are required.
         *
         * @since 6.3
         */
        accessTokenConfig?: AccessTokenConfigAzure | AccessTokenConfigOCI;
        /**
         * An array of array values that identifies the application context used by the connection.
         * The elements of the array should contain three string values - namespace, name, and value.
         *
         * @since 6.9
         */
        appContext?: Array<AppContextOpts>;
        /**
         * An alias of connectionString. Only one of the properties should be used.
         * The Oracle database instance to connect to.
         * The string can be an Easy Connect string, or a Net Service Name from atnsnames.ora file, or the name of a local Oracle database instance.
         */
        connectString?: string | undefined;
        /**
         * An alias of connectString. Only one of the properties should be used.
         * The Oracle database instance to connect to.
         * The string can be an Easy Connect string, or a Net Service Name from atnsnames.ora file, or the name of a local Oracle database instance.
         *
         * @since 2.1
         */
        connectionString?: string | undefined;
        /**
         * Enhanced Mail (PEM)-encoded private certificate, if it is encrypted.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string.
         * @since 6.0
         */
        walletPassword?: string | undefined;
        /**
         * The directory where the wallet can be found. In node-oracledb Thin mode, this must be the directory that contains the PEM-encoded wallet file.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string.
         * @since 6.0
         */
        walletLocation?: string | undefined;
        /**
         * Sets the name used for Edition-Based Redefinition by this connection.
         * This optional property overrides the oracledb.edition property.
         *
         * @since 2.2
         */
        edition?: string | undefined;
        /**
         * Determines if the standalone connection is created using Oracle Call Interface events mode.
         * This optional property overrides the oracledb.events property.
         *
         * @default false
         * @since 2.2
         */
        events?: boolean | undefined;
        /**
         * Determines if the connection should be established using External Authentication.
         * This optional property overrides the oracledb.externalAuth property.
         * The user and password properties should not be set when externalAuth is true.
         *
         * @default false
         */
        externalAuth?: boolean | undefined;
        /**
         * Used in conjunction with tag when getting a connection from a connection pool.
         * Indicates that the tag in a connection returned from a connection pool may not match the requested tag.
         *
         * @default false
         * @since 3.1
         */
        matchAny?: boolean | undefined;
        /**
         * The new password to use for the database user. When using newPassword, the password property should be set to the current password.
         * This allows passwords to be changed at the time of connection, in particular it can be used to connect when the old password has expired.
         *
         * @since 2.2
         */
        newPassword?: string | undefined;
        /**
         * The password of the database user. A password is also necessary if a proxy user is specified.
         */
        password?: string | undefined;
        /**
         * Enables the connection to use either a weaker or more secure DN matching behavior when the sslServerDNMatch property is set.
         * If the value is True, then the sslServerDNMatch property uses a weaker DN matching behavior which only checks the server certificate (and not the listener certificate), and allows the service name to be used for partial DN matching. The DN matching for a partial match first matches the host name that the client connected to against the common name (CN) of the database server certificate DN or the Subject Alternate Names (SAN) of the database server certificate. If this fails, then the service name is matched against the CN of the database server certificate DN.
         * If the value is False, then the sslServerDNMatch property uses a more secure DN matching behavior which checks both the listener and server certificates, and does not allow a service name check for partial DN matching. The DN matching for a partial match matches the host name that the client connected to against the CN of the certificate DN or the SAN of the certificate. The service name is not checked in this case.
         * The default value is False.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string instead.
         *
         * @since 6.1
         */
        sslAllowWeakDNMatch?: boolean | undefined;
        /**
         * The name or IP address of a proxy host to use for tunneling secure connections.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string instead.
         *
         * @since 6.0
         */
        httpsProxy?: string | undefined;
        /**
         * The port to be used to communicate with the proxy host.
         * The default value is 0.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string instead.
         *
         * @since 6.0
         */
        httpsProxyPort?: number | undefined;
        /**
         * Specifies the host and port of the PL/SQL debugger with the format host=<host>;port=<port>. This allows using the Java Debug Wire Protocol (JDWP) to debug PL/SQL code called by node-oracledb.
         * The default value is the value of environment variable ORA_DEBUG_JDWP.
         * For node-oracledb Thick mode, set the ORA_DEBUG_JDWP environment variable with the same syntax instead. See Application Tracing.
         *
         * @since 6.0
         */
        debugJdwp?: string | undefined;
        /**
         * The number of times that a connection attempt should be retried before the attempt is terminated.
         * The default value is 0.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string instead.
         *
         * @since 6.0
         */
        retryCount?: number | undefined;
        /**
         * The number of seconds to wait before making a new connection attempt.
         * The default value is 1. Changed to 1 from 0 in version 6.7
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string instead.
         *
         * @since 6.0
         */
        retryDelay?: number | undefined;
        /**
         * The timeout duration in seconds for an application to establish an Oracle Net connection.
         * There is no timeout by default.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string instead.
         *
         * @since 6.0
         */
        connectTimeout?: number | undefined;
        /**
         * The maximum number of seconds to wait to establish a connection to the database host.
         * The default value is 20.0. Changed to 20.0 from 60.0 in version 6.7
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string instead.
         *
         * @since 6.0
         */
        transportConnectTimeout?: number | undefined;
        /**
         * The number of minutes between the sending of keepalive probes. If this property is set to a value greater than zero, it enables the keepalive probes.
         * The default value is 0.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string instead.
         *
         * @since 6.0
         */
        expireTime?: number | undefined;
        /**
         * The Oracle Net Session Data Unit (SDU) packet size in bytes. The database server configuration should also set this parameter.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string instead.
         *
         * @since 6.0
         */
        sdu?: number | undefined;
        /**
         * The application specific prefix parameter that is added to the connection identifier.
         *
         * @since 6.0
         */
        connectionIdPrefix?: string | undefined;
        /**
         * The password of the database user. A password is also necessary if a proxy user is specified.
         */
        configDir?: string | undefined;
        /**
         * The directory in which the Optional Oracle Net Configuration Files are found.
         * For node-oracledb Thick mode, use the oracledb.initOracleClient() option configDir instead.
         * @since 6.0
         */
        sourceRoute?: string | undefined;
        /**
         * The distinguished name (DN) that should be matched with the certificate DN. If not specified, a partial match is performed instead. A partial match matches the hostname that the client connected to against the common name (CN) of the certificate DN or the Subject Alternate Names (SAN) of the certificate.
         * This value is ignored if the sslServerDNMatch property is not set to the value True.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string instead.
         *
         * @since 6.0
         */
        sslServerCertDN?: string | undefined;
        /**
         * Determines whether the server certificate DN should be matched in addition to the regular certificate verification that is performed.
         * If the sslServerCertDN property is not provided, a partial DN match is performed instead. A partial match matches the hostname that the client connected to against the CN of the certificate DN or the SAN of the certificate.
         * The default value is True.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string instead.
         *
         * @since 6.0
         */
        sslServerDNMatch?: boolean | undefined;
        /**
         * Enables network routing through multiple protocol addresses. The value of this property can be ON or OFF.
         *  The default value is ON.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string instead.
         * @since 6.0
         */
        poolAlias?: string | undefined;
        /**
         * The privilege to use when establishing connection to the database.
         * This optional property should be one of the privileged connection constants.
         * Note only non-pooled connections can be privileged.
         *
         * @since 2.1
         */
        privilege?: number | undefined;
        /**
         * Allows a connection to be established directly to a database shard.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#sharding
         * @since 4.1
         */
        shardingKey?: Array<string | number | Date | Buffer> | undefined;
        /**
         * The number of statements to be cached in the statement cache of each connection.
         * This optional property may be used to override the oracledb.stmtCacheSize property.
         */
        stmtCacheSize?: number | undefined;
        /**
         * Allows a connection to be established directly to a database shard.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#sharding
         * @since 4.1
         */
        superShardingKey?: Array<string | number | Date | Buffer> | undefined;
        /**
         * Used when getting a connection from a connection pool.
         * Indicates the tag that a connection returned from a connection pool should have.
         * Various heuristics determine the tag that is actually returned.
         *
         * @since 3.1
         */
        tag?: string | undefined;
        /**
         * The database user name. Can be a simple user name or a proxy of the form alison[fred].
         */
        user?: string | undefined;
        /**
         * The two properties are aliases for each other. Use only one of the properties.
         * The database user name. Can be a simple user name or a proxy of the form alison[fred]. See the Client Access Through a Proxy section in the Oracle Call Interface manual for more details about proxy authentication.
         */
        username?: string | undefined;
        /**
         * Enables the connection to use the TLS extension, Server Name Indication (SNI).
         * This property requires Oracle Database 23.7 (or later).
         * Available only in node-oracledb Thin mode.
         *
         * @default false
         * @since 6.8
         */
        useSNI?: boolean | undefined;
        /**
         * Indicates if network data compression needs to be enabled or disabled for a database connection.
         * Enabling data compression reduces the size of the Oracle Net Session Data Unit (SDU) that is to be sent over a connection.
         * Available only in thin driver mode.
         *
         * @default false
         * @since 6.8
         */
        networkCompression?: boolean | undefined;
        /**
         * The minimum data size, in bytes, for which compression should be performed on the Oracle Net Session Data Unit (SDU).
         * The minimum data size is 200 bytes.
         *
         * @default 1024
         * @since 6.8
         */
        networkCompressionThreshold?: number | undefined;
        /**
         * The name of the driver that is used by the client to connect to Oracle Database.
         * This is equivalent to the value in the `CLIENT_DRIVER` column of the `V$SESSION_CONNECT_INFO` view.
         * This optional property overrides the `oracledb.driverName` property.
         * This property can only be used in the node-oracledb Thin mode.
         *
         * @since 6.7.0
         */
        driverName?: string | undefined;
        /**
         * The name of the host machine from where the connection originates.
         * This is equivalent to the value in the `MACHINE` column of the `V$SESSION` view.
         * This optional property overrides the `oracledb.machine` property.
         * This property can only be used in the node-oracledb Thin mode.
         *
         * @since 6.7.0
         */
        machine?: string | undefined;
        /**
         * The name of the operating system user that initiates the database connection.
         * This is equivalent to the value in the `OSUSER` column of the `V$SESSION` view.
         * This optional property overrides the `oracledb.osUser` property.
         * This property can only be used in the node-oracledb Thin mode.
         *
         * @since 6.7.0
         */
        osUser?: string | undefined;
        /**
         * The name of the program connecting to the database.
         * This is equivalent to the value in the `PROGRAM` column of the `V$SESSION` view.
         * This optional property overrides the `oracledb.program` property.
         * This property can only be used in the node-oracledb Thin mode.
         *
         * @since 6.7.0
         */
        program?: string | undefined;
        /**
         * The name of the terminal from where the connection originates.
         * This is equivalent to the value in the `TERMINAL` column of the `V$SESSION` view.
         * This optional property overrides the `oracledb.terminal` property.
         * This property can only be used in the node-oracledb Thin mode.
         *
         * @since 6.7.0
         */
        terminal?: string | undefined;
        /**
         * The security credentials required to establish a mutual TLS (mTLS) connection to Oracle Database.
         * This property can be used to directly specify the security credentials instead of storing and reading the credentials from the `ewallet.pem` file specified in the walletLocation property.
         * The value of the walletContent property overrides the `walletLocation` value and the `WALLET_LOCATION` parameter in the connection string.
         *
         * @since 6.6.0
         */
        walletContent?: string | undefined;
    }

    interface DBError extends Error {
        /**
         * This property is a string that represents the error code, which is the error prefix followed by the error number, for example ORA-01017, DPI-1080, and NJS-500.
         */
        code?: string | undefined;
        /**
         * The Oracle error number. This value is undefined for non-Oracle errors and for messages prefixed with NJS or DPI.
         */
        errorNum?: number | undefined;
        /**
         * The text of the error message.
         *
         * The error may be a standard Oracle message with a prefix like ORA or PLS.
         *
         * Alternatively it may be a node-oracledb specific error prefixed with NJS or DPI.
         */
        message: string;
        /**
         * Generally offset is the character offset into the SQL text that resulted in the Oracle error.
         *
         * The value may be 0 in non-SQL contexts. This value is undefined for non-Oracle errors and for messages prefixed with NJS or DPI.
         */
        offset?: number | undefined;
        /**
         * This property is a boolean which determines whether the error is recoverable or not.
         * This requires Oracle Database 12.1 (or later).
         * For node-oracledb Thick mode, Oracle Client 12.1 (or later) is also required.
         */
        isRecoverable: boolean;
        /**
         * This property is a string. When using Promises or Async/Await, the Error object includes a stack
         *
         * The stack trace displays only the application backtrace and not the driver’s internal frames or functions.
         * See Increasing the Stack Trace Limit to understand how to increase the number of stack frames displayed in a trace.
         */
        stack?: string;
    }

    /**
     * Used to control statement execution.
     */
    interface ExecuteOptions {
        /**
         * If true, the transaction in the current connection is automatically committed at the end of statement execution.
         *
         * @default false
         */
        autoCommit?: boolean | undefined;
        /**
         * Overrides oracledb.dbObjectAsPojo.
         *
         * Specify whether Oracle Database named objects or collections that are queried should be returned to the application
         * as “plain old JavaScript objects” or kept as database-backed objects. This option also applies to output BIND_OUT bind variables.
         *
         * Note that LOBs in objects will be represented as Lob instances and will not be String or Buffer, regardless of any fetchAsString,
         * fetchAsBuffer, or fetchInfo setting.
         *
         * Setting dbObjectAsPojo to true can avoid overhead if object attributes are repeatedly accessed. It also allows applications to
         * close connections before any attributes are accessed unless LOBs are involved. Regardless of the value, the interface to access objects is the same.
         *
         * @default false
         * @since 5.1
         */
        dbObjectAsPojo?: boolean | undefined;
        /**
         * This property sets the size of an internal buffer used for fetching query rows from Oracle Database.
         * Changing it may affect query performance but does not affect how many rows are returned to the application.
         *
         * The property is used during the default direct fetches, during ResultSet getRow() calls, and for queryStream(). It is not used for getRows().
         *
         * Increasing this value reduces the number of round-trips to the database but increases memory usage for each data fetch.
         * For queries that return a large number of rows, higher values of fetchArraySize may give better performance.
         * For queries that only return a few rows, reduce the value of fetchArraySize to minimize the amount of memory management during data fetches.
         * JavaScript memory fragmentation may occur in some cases.
         *
         * For direct fetches (those using execute() option resultSet: false), the internal buffer size will be based on the lesser of maxRows and fetchArraySize.
         *
         * @default 100
         */
        fetchArraySize?: number | undefined;
        /**
         * Depreciated in Version 6.0.0
         * Use the oracledb.fetchTypeHandler method instead.
         *
         * Defines how query column data should be represented in JavaScript. It can be used in conjunction with,
         * or instead of, the global settings fetchAsString and fetchAsBuffer.
         *
         * Example:
         *
         *      fetchInfo: {
         *          "HIRE_DATE":    { type: oracledb.STRING },  // return the date as a string
         *          "HIRE_DETAILS": { type: oracledb.DEFAULT }  // override fetchAsString or fetchAsBuffer
         *      }
         */
        fetchInfo?:
            | Record<
                string,
                {
                    type: DbType | number;
                }
            >
            | undefined;
        /**
         * Overrides oracledb.fetchTypeHandler.
         *
         * @since 6.0
         */
        fetchTypeHandler?: (metadata: Metadata<any>) => FetchTypeResponse | undefined;
        /**
         * The maximum number of rows that are fetched by a query with connection.execute() when not using a ResultSet.
         * Rows beyond this limit are not fetched from the database. A value of 0 means there is no limit.
         *
         * To improve database efficiency, SQL queries should use a row limiting clause like OFFSET / FETCH or equivalent.
         * The maxRows property can be used to stop badly coded queries from returning unexpectedly large numbers of rows.
         *
         * When the number of query rows is relatively big, or can not be predicted, it is recommended to use
         * a ResultSet or queryStream(). This allows applications to process rows in smaller chunks or individually,
         * preventing the Node.js memory limit being exceeded or query results being unexpectedly truncated by a
         * maxRows limit.
         *
         * @default 0 (unlimited)
         */
        maxRows?: number | undefined;
        /**
         * The format of query rows fetched when using connection.execute() or connection.queryStream().
         * It affects both ResultSet and non-ResultSet queries. It can be used for top level queries and REF CURSOR output.
         *
         * This can be either of the Oracledb constants oracledb.ARRAY or oracledb.OBJECT.
         *
         * If specified as oracledb.ARRAY, each row is fetched as an array of column values.
         *
         * If specified as oracledb.OBJECT, each row is fetched as a JavaScript object.
         * The object has a property for each column name, with the property value set to the respective column value.
         * The property name follows Oracle’s standard name-casing rules. It will commonly be uppercase,
         * since most applications create tables using unquoted, case-insensitive names.
         *
         * @default ARRAY
         */
        outFormat?: number | undefined;
        /**
         * This is a query tuning option to set the number of additional rows the underlying Oracle Client library fetches during
         * the internal initial statement execution phase of a query. The prefetch size does not affect when, or how many,
         * rows are returned by node-oracledb to the application.
         *
         * The prefetchRows attribute can be used in conjunction with oracledb.fetchArraySize to tune query performance, memory use,
         * and to reduce the number of round-trip calls needed to return query results.
         *
         * The prefetchRows value is ignored in some cases, such as when the query involves a LOB.
         *
         * This attribute is not used in node-oracledb version 2, 3 or 4. In those versions use only oracledb.fetchArraySize instead.
         *
         * @default 2
         * @see https://oracle.github.io/node-oracledb/doc/api.html#rowfetching
         * @since 5.0
         */
        prefetchRows?: number | undefined;
        /**
         * Determines whether query results should be returned as a ResultSet object or directly.
         *
         * @default false
         */
        resultSet?: boolean | undefined;
        /**
         * When keepInStmtCache is true, and statement caching is enabled, then the statement will be added to the cache if it is not already present. This helps the performance of re-executed statements. See Statement Caching.
         * The default value is true.
         * New in version 5.3.
         * In earlier versions, statements were always added to the statement cache, if caching was enabled.
         */
        keepInStmtCache?: boolean | undefined;
        /**
         * Determines whether an active sessionless transaction should be suspended when execute() completes successfully.
         * This property is only applicable for sessionless transactions.
         * When this property is used with transactions that are not sessionless, an error will be thrown.
         *
         * @default false
         *
         * @since 6.9
         */
        suspendOnSuccess?: boolean;
    }

    /**
     * Used to control statement execution.
     */
    interface ExecuteManyOptions {
        /**
         * If true, the transaction in the current connection is automatically committed at the end of statement execution.
         *
         * This optional property overrides oracledb.autoCommit.
         *
         * Note batchErrors can affect autocommit mode.
         *
         * @default false
         */
        autoCommit?: boolean | undefined;
        /**
         * This optional property allows invalid data records to be rejected while still letting valid data be processed.
         * It can only be set true for INSERT, UPDATE, DELETE or MERGE statements.
         *
         * When false, the executeMany() call will stop when the first error occurs.The callback error object will be set.
         *
         * When batchErrors is true, processing will continue even if there are data errors.
         * The executeMany() callback error parameter is not set. Instead, an array containing an error per
         * input data record will be returned in the callback result parameter. All valid data records will
         * be processed and a transaction will be started but not committed, even if autoCommit is true.
         * The application can examine the errors, take action, and explicitly commit or rollback as desired.
         *
         * Note that some classes of error will always return via the executeMany() callback error object,
         * not as batch errors. No transaction is created in this case.
         *
         * @default false
         */
        batchErrors?: boolean | undefined;
        /**
         * Defines the bind variable types, sizes and directions. This object is optional in some cases but it is more efficient to set it.
         *
         * It should be an array or an object, depending on the structure of the binds parameter.
         */
        bindDefs?: Record<string, BindDefinition> | BindDefinition[] | undefined;
        /**
         * When true, this optional property enables output of the number of rows affected by each input data record.
         * It can only be set true for INSERT, UPDATE, DELETE or MERGE statements.
         *
         * This feature works when node-oracledb is using version 12, or later, of the Oracle client library.
         *
         * @default false
         */
        dmlRowCounts?: boolean | undefined;
        /**
         * When keepInStmtCache is true, and statement caching is enabled, then the statement will be added to the cache if it is not already present. This helps the performance of re-executed statements. See Statement Caching.
         * The default value is true.
         * New in version 5.3.
         * In earlier versions, statements were always added to the statement cache, if caching was enabled.
         */
        keepInStmtCache?: boolean | undefined;
    }

    /**
     * Options which may be specified when getting an instance of the Advanced Queue class.
     */
    interface GetAdvancedQueueOptions {
        /**
         * Name of an Oracle Database object type, or a DbObject Class earlier acquired from connection.getDbObjectClass().
         * If the name of an object type is used, it is recommended that a fully qualified name be used.
         */
        payloadType?: string | undefined;
    }

    /**
     * Lob objects can be used to access Oracle Database CLOB and BLOB data.
     *
     * @see https://oracle.github.io/node-oracledb/doc/api.html#lobhandling
     */
    interface Lob extends Duplex {
        /**
         * This corresponds to the size used by the Oracle LOB layer when accessing or modifying the LOB value.
         */
        readonly chunkSize: number;
        /**
         * Length of a queried LOB in bytes (for BLOBs) or characters (for CLOBs).
         */
        readonly length: number;
        /**
         * The number of bytes (for BLOBs) or characters (for CLOBs) to read for each Stream ‘data’ event of a queried LOB.
         *
         * For efficiency, it is recommended that pieceSize be a multiple of chunkSize.
         *
         * The property should not be reset in the middle of streaming since data will be lost when
         * internal buffers are resized.
         *
         * The maximum value for pieceSize is limited to the value of UINT_MAX.
         *
         * @default chunkSize
         */
        pieceSize: number;
        /**
         * The type of Lob being used. It will have the value of one of the constants BLOB or CLOB.
         *
         * The value is derived from the bind type when using LOB bind variables, or from the column
         * type when a LOB is returned by a query.
         */
        readonly type: DbType | number;

        /**
         * Explicitly closes a Lob.
         *
         * Lobs created with createLob() should be explicitly closed with lob.close() when no longer needed.
         * This frees resources in node-oracledb and in Oracle Database.
         *
         * Persistent or temporary Lobs returned from the database may also be closed with lob.close() as
         * long as streaming is not currently happening. Note these Lobs are automatically closed when
         * streamed to completion or used as the source for an IN OUT bind.
         * If you try to close a Lob being used for streaming you will get the error NJS-023: concurrent
         * operations on a Lob are not allowed.
         *
         * The lob.close() method emits the Node.js Stream ‘close’ event unless the Lob has already been
         * explicitly or automatically closed.
         *
         * The connection must be open when calling lob.close() on a temporary LOB, such as those created
         * by createLob().
         *
         * Once a Lob is closed, it cannot be bound.
         *
         * @deprecated since 4.2, lob.destroy() should be used instead.
         * @see https://oracle.github.io/node-oracledb/doc/api.html#closinglobs
         */
        close(): Promise<void>;
        close(callback: (error: DBError) => void): void;

        /**
         * Return all the LOB data. CLOBs and NCLOBs will be returned as strings. BLOBs will be returned as a Buffer.
         *
         * This method is usable for LOBs up to 1 GB in length.
         *
         * For queries returning LOB columns, it can be more efficient to use fetchAsString, fetchAsBuffer, or fetchInfo instead of lob.getData().
         *
         * Note it is an asynchronous method and requires a round-trip to the database.
         *
         * For LOBs of type CLOB and NCLOB, the offset is the position from which the data is to be fetched, in UCS-2 code points. UCS-2 code points are equivalent to characters for all but supplemental characters. If supplemental characters are in the LOB, the offset and amount will have to be chosen carefully to avoid splitting a character.
         * For LOBs of type BLOB and BFILE, the offset is the position of the byte from which the data is to be fetched.
         * The default is 1.
         * The value of offset must be greater than or equal to 1.
         * If the offset specified in lob.getData() exceeds the length of the LOB, then the value null is returned.
         *
         * @since 4.0
         */
        getData(): Promise<string | Buffer>;
        getData(callback: (error: DBError, data: string | Buffer) => void): void;

        /**
         * Returns a portion (or all) of the data in the LOB object. Note that
         * the offset is in bytes for BLOB and BFILE type LOBs and
         * in UCS-2 code points for CLOB and NCLOB type LOBs. UCS-2 code points
         * are equivalent to characters for all but supplemental characters.
         * If supplemental characters are in the LOB, the offset will
         * have to be chosen carefully to avoid splitting a character.
         *
         * This method is usable for LOBs up to 1 GB in length.
         *
         * For queries returning LOB columns, it can be more efficient to use fetchAsString,
         * fetchAsBuffer, or fetchInfo instead of lob.getData().
         *
         * Note it is an asynchronous method and requires a round-trip to the database.
         *
         * @since 6.4.0
         *
         * @param offset The absolute offset inside LOB.
         * @param amount The number of bytes(BLOB) or characters(CLOB) returned starting from offset.
         */
        getData(offset: number): Promise<string | Buffer>;
        getData(offset: number, callback: (error: DBError, data: string | Buffer) => void): void;
        getData(offset: number, amount: number): Promise<string | Buffer>;
        getData(offset: number, amount: number, callback: (error: DBError, data: string | Buffer) => void): void;
    }

    /**
     * Included in the result of a query execution to describe details of the columns involved.
     */
    interface Metadata<T> {
        /**
         * The column name follows Oracle’s standard name-casing rules. It will commonly be uppercase,
         * since most applications create tables using unquoted, case-insensitive names.
         */
        name: string;
        /**
         * One of the Node-oracledb Type Constant values.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#oracledbconstantsnodbtype
         */
        fetchType?: DbType | number | undefined;
        /**
         * The annotations object associated with the fetched column. If the column has no associated annotations, this property value is undefined. Annotations are supported from Oracle Database 23c onwards. If node-oracledb Thick mode is used, Oracle Client 23c is also required.
         */
        annotations?: any;
        /**
         * One of the Node-oracledb Type Constant values.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#oracledbconstantsdbtype
         */
        dbType?: DbType | undefined;
        /**
         * The class associated with the database type. This is only set if the database type is an object type.
         */
        dbTypeClass?: DBObjectClass<T> | undefined;
        /**
         * Name of the database type, such as “NUMBER” or “VARCHAR2”. For object types, this will be the object name.
         */
        dbTypeName?: string | undefined;
        /**
         * The name of the SQL domain associated with the fetched column. If the column does not have a SQL domain, this property value is undefined. SQL domains are supported from Oracle Database 23c onwards. If node-oracledb Thick mode is used, Oracle Client 23c is also required.
         */
        domainName?: string | undefined;
        /**
         * The schema name of the SQL domain associated with the fetched column. If the column does not have a SQL domain, this property value is undefined. SQL domains are supported from Oracle Database 23c onwards. If node-oracledb Thick mode is used, Oracle Client 23c is also required.
         */
        domainSchema?: string | undefined;
        /**
         * Indicates if the column is known to contain JSON data. This will be true for JSON columns (from Oracle Database 21c) and for LOB and VARCHAR2 columns where “IS JSON” constraint is enabled (from Oracle Database 19c). This property will be false for all the other columns. It will also be false for any column when Oracle Client 18c or earlier is used in Thick mode or the Oracle Database version is earlier than 19c.
         */
        isJson?: boolean | undefined;
        /**

         * Indicates if the column is known to contain binary encoded OSON data. This attribute will be true in Thin mode and while using Oracle Client version 21c (or later) in Thick mode when the “IS JSON FORMAT OSON” check constraint is enabled on BLOB and RAW columns. It will be set to false for all other columns. It will also be set to false for any column when the Thick mode uses Oracle Client versions earlier than 21c. Note that the “IS JSON FORMAT OSON” check constraint is available from Oracle Database 19c onwards.
         */
        isOson?: boolean | undefined;
        /**
         * Database byte size. This is only set for DB_TYPE_VARCHAR, DB_TYPE_CHAR and DB_TYPE_RAW column types.
         */
        byteSize?: number | undefined;
        /**
         * Set only for DB_TYPE_NUMBER, DB_TYPE_TIMESTAMP, DB_TYPE_TIMESTAMP_TZ and DB_TYPE_TIMESTAMP_LTZ columns.
         */
        precision?: number | undefined;
        /**
         * Set only for DB_TYPE_NUMBER columns.
         */
        scale?: number | undefined;
        /**
         * Indicates whether NULL values are permitted for this column.
         */
        nullable?: boolean | undefined;
    }

    /**
     * Statistics
     */
    interface Statistics {
        gatheredDate: Date;
        upTime: Date;
        upTimeSinceReset: Date;
        connectionRequests: number;
        requestsEnqueued: number;
        requestsDequeued: number;
        failedRequests: number;
        rejectedRequests: number;
        requestTimeouts: number;
        maximumQueueLength: number;
        currentQueueLength: number;
        timeInQueue: number;
        minimumTimeInQueue: number;
        maximumTimeInQueue: number;
        averageTimeInQueue: number;
        connectionsInUse: number;
        connectionsOpen: number;
        poolAlias: string;
        queueMax: number;
        queueTimeout: number;
        poolMin: number;
        poolMax: number;
        poolIncrement: number;
        poolTimeout: number;
        poolPingInterval: number;
        poolMaxPerShard: number;
        stmtCacheSize: number;
        sodaMetaDataCache: boolean;
        threadPoolSize: number;
    }

    interface PoolStatistics {
        logStatistics(): void;
    }

    /**
     * Contains a pool of connections to the database.
     */
    interface Pool {
        /**
         * The number of currently active connections in the connection pool i.e. the number of connections currently “checked out” using getConnection().
         */
        readonly connectionsInUse: number;
        /**
         * The number of currently open connections in the underlying connection pool.
         */
        readonly connectionsOpen: number;
        /**
         * The alias of this pool in the connection pool cache. An alias cannot be changed once the pool has been created.
         */
        readonly poolAlias?: string | undefined;
        /**
         * The number of connections that are opened whenever a connection request exceeds the number of currently open connections.
         */
        readonly poolIncrement: number;
        /**
         * The maximum number of connections that can be open in the connection pool.
         */
        readonly poolMax: number;
        /**
         * The minimum number of connections a connection pool maintains, even when there is no activity to the target database.
         */
        readonly poolMin: number;
        /**
         * The maximum number of connections per shard for connection pools. This ensures that the pool is balanced towards each shard.
         *
         * @since 4.1
         */
        readonly poolMaxPerShard: number;
        /**
         * The maximum number of seconds that a connection can remain idle in a connection pool (not “checked out” to the application by getConnection())
         * before node-oracledb pings the database prior to returning that connection to the application.
         */
        readonly poolPingInterval: number;
        /**
         * This read-only property is a number which specifies the maximum number of milliseconds that a connection should wait for a response from connection.ping().
         *
         * @since 6.4
         */
        readonly poolPingTimeout: number;
        /**
         * The time (in seconds) after which the pool terminates idle connections (unused in the pool).
         * The number of connections does not drop below poolMin.
         */
        readonly poolTimeout: number;
        /**
         * This attribute decides how long a connection is allowed to stay in the pool
         * before it is deemed unfit for user and dropped from the pool.
         *
         * @default 0
         * @since 6.9
         */
        readonly maxLifetimeSession: number;
        /**
         * The time (in milliseconds) that a connection request should wait in the queue before the request is terminated.
         */
        readonly queueTimeout: number;
        /**
         * One of the POOL_STATUS_* constants indicating whether the pool is open, being drained of in-use connections, or has been closed.
         */
        readonly status: number;
        /**
         * The number of statements to be cached in the statement cache of each connection.
         */
        readonly stmtCacheSize: number;

        /**
         * This call closes connections in the pool and terminates the connection pool.
         *
         * If a drainTime is not given, then any open connections should be released with connection.close()
         * before pool.close() is called, otherwise the pool close will fail and the pool will remain open.
         *
         * If a drainTime is specified, then any new pool.getConnection() calls will fail. If connections are in
         * use by the application, they can continue to be used for the specified number of seconds, after which
         * the pool and all open connections are forcibly closed. Prior to this time limit, if there are no
         * connections currently “checked out” from the pool with getConnection(), then the pool and any connections
         * that are idle in the pool are immediately closed. Non-zero drainTime values are strongly recommended so
         * applications have the opportunity to gracefully finish database operations. A drainTime of 0 may be
         * used to close a pool and its connections immediately.
         *
         * In network configurations that drop (or in-line) out-of-band breaks, forced pool termination may hang
         * unless you have DISABLE_OOB=ON in a sqlnet.ora file, see Optional Oracle Net Configuration.
         *
         * When the pool is closed, it will be removed from the connection pool cache.
         *
         * @param drainTime
         *
         * The number of seconds before the pool and connections are force closed.
         *
         * If drainTime is 0, the pool and its connections are closed immediately.
         *
         * @alias terminate
         * @since 1.9
         */
        close(drainTime?: number): Promise<void>;
        close(drainTime: number, callback: (error: DBError) => void): void;
        close(callback: (error: DBError) => void): void;

        /**
         * This method obtains a connection from the connection pool.
         *
         * If a previously opened connection is available in the pool, that connection is returned.
         * If all connections in the pool are in use, a new connection is created and returned to the caller,
         * as long as the number of connections does not exceed the specified maximum for the pool.
         * If the pool is at its maximum limit, the getConnection() call results in an error, such as ORA-24418:
         * Cannot open further sessions.
         *
         * By default pools are created with homogeneous set to true. The user name and password are supplied
         * when the pool is created. Each time pool.getConnection() is called, a connection for that user is returned:
         *
         *      pool.getConnection(
         *          function (err, conn) { ... }
         *      );
         *
         * If a heterogeneous pool was created by setting homogeneous to false during creation and credentials
         * were omitted, then the user name and password may be used in pool.getConnection() like:
         *
         *      pool.getConnection(
         *          {
         *              user     : 'hr',
         *              password : mypw,  // mypw contains the hr schema password
         *          },
         *          function (err, conn) { ... }
         *      );
         *
         * In this case, different user names may be used each time pool.getConnection() is called.
         * Proxy users may also be specified.
         *
         * @param poolAttributes Contains properties related to the pool used to retrieve the connection.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#connectionhandling
         * @see https://oracle.github.io/node-oracledb/doc/api.html#connpoolproxy
         */
        getConnection(poolAttributes?: GetPooledConnectionOptions): Promise<Connection>;
        getConnection(
            poolAttributes: GetPooledConnectionOptions,
            callback: (error: DBError, connection: Connection) => void,
        ): void;
        getConnection(callback: (error: DBError, connection: Connection) => void): void;
        /**
         * This call closes connections in the pool and terminates the connection pool.
         *
         * If a drainTime is not given, then any open connections should be released with connection.close()
         * before pool.close() is called, otherwise the pool close will fail and the pool will remain open.
         *
         * If a drainTime is specified, then any new pool.getConnection() calls will fail. If connections are in
         * use by the application, they can continue to be used for the specified number of seconds, after which
         * the pool and all open connections are forcibly closed. Prior to this time limit, if there are no
         * connections currently “checked out” from the pool with getConnection(), then the pool and any connections
         * that are idle in the pool are immediately closed. Non-zero drainTime values are strongly recommended so
         * applications have the opportunity to gracefully finish database operations. A drainTime of 0 may be
         * used to close a pool and its connections immediately.
         *
         * In network configurations that drop (or in-line) out-of-band breaks, forced pool termination may hang
         * unless you have DISABLE_OOB=ON in a sqlnet.ora file, see Optional Oracle Net Configuration.
         *
         * When the pool is closed, it will be removed from the connection pool cache.
         *
         * @param drainTime
         *
         * The number of seconds before the pool and connections are force closed.
         *
         * If drainTime is 0, the pool and its connections are closed immediately.
         *
         * @alias close
         */
        terminate(drainTime?: number): Promise<void>;
        terminate(drainTime: number, callback: (error: DBError) => void): void;
        terminate(callback: (error: DBError) => void): void;

        /**
         * If enableStatistics is true, this method can be used to output statistics to the console.
         */
        logStatistics(): void;

        /**
         * Method to obtain a JSON object with all statistical metrics and pool properties
         */
        getStatistics(): Statistics;

        /**
         * Allows a subset of pool creation properties to be changed without needing to restart the pool or restart the application.
         * Properties such as the maximum number of connections in the pool, or the statement cache size used by connections can be changed.
         * Properties are optional.
         * Unspecified properties will leave those pool properties unchanged. The properties are processed in two stages.
         * After any size change has been processed, reconfiguration on the other properties is done sequentially.
         * If an error such as an invalid value occurs when changing one property, then an error will be thrown but any already changed properties will retain their new values.
         */
        reconfigure(poolAttrs: PoolAttributes): Promise<void>;
        reconfigure(poolAttrs: PoolAttributes, callback: (error: DBError) => void): void;
    }

    /**
     * Used with pool.getConnection().
     */
    interface GetPooledConnectionOptions {
        /** Database user to retrieve the connection for. */
        user?: string | undefined;
        /** Password of the specified user. */
        password?: string | undefined;
        /** Optionally set the connection tag. */
        tag?: string | undefined;
    }

    /**
     * Provides connection credentials and pool-specific configuration properties.
     * The properties provided override the default pooling properties of the Oracledb object.
     * If an attribute is not set, or is null, the value of the related Oracledb property will be used.
     */
    interface PoolAttributes {
        /**
         * For Microsoft Azure Active Directory OAuth 2.0 token-based authentication, accessToken can be:
         *      a callback function returning the token as a string
         *      an object with a token attribute containing the token as a string
         *      or the token as a string
         *
         * Tokens can be obtained using various approaches. For example, using the Azure Active Directory API.
         *
         * For Oracle Cloud Infrastructure Identity and Access Management (IAM) token-based authentication, accessToken can be:
         *      a callback function returning an object containing token and privateKey attributes
         *      or an object containing token and privateKey attributes
         *
         * The properties of the accessToken object are described in createPool(): accessToken Object Attributes.
         *
         * If accessToken is a callback function:
         *      function accessToken(boolean refresh, object accessTokenConfig)
         *
         * When accessToken is a callback function, it will be invoked at the time the pool is created (even if poolMin is 0). It is also called when the pool needs to expand (causing new connections to be created) and the current token has expired. The returned token is used by node-oracledb for authentication. The refresh parameter is described in createPool(): refresh Parameter Values.
         * The accessTokenConfig parameter is described in accessTokenConfig.
         *
         * When the callback is first invoked, the refresh parameter will be set to false. This indicates that the application can provide a token from its own application managed cache, or it can generate a new token if there is no cached value. Node-oracledb checks whether the returned token has expired. If it has expired, then the callback function will be invoked a second time with refresh set to true. In this case the function must externally acquire a token, optionally add it to the application’s cache, and return the token.
         * For token-based authentication, the externalAuth and homogeneous pool attributes must be set to true. The user (or username) and password attributes should not be set.
         * See Token-Based Authentication for more information.
         *
         * New in version 5.4: The accessToken property was added to support IAM token-based authentication.For IAM token-based authentiation, this property must be an Object. For node-oracledb Thick mode, Oracle Client libraries 19.14 (or later), or 21.5 (or later) must be used for IAM token-based authentication.
         *
         * Changed in version 5.5: The accessToken property was extended to allow OAuth 2.0 token-based authentication in node-oracledb 5.5. For OAuth 2.0, the property should be a string, or a callback. For node-oracledb Thick mode, Oracle Client libraries 19.15 (or later), or 21.7 (or later) must be used. The callback usage supports both OAuth 2.0 and IAM token-based authentication.
         * @since 5.4
         */
        accessToken?: AccessToken | undefined;
        /**
         * An object containing the Azure-specific or OCI-specific parameters that need to be set when using the Azure Software Development Kit (SDK) or Oracle Cloud Infrastructure (OCI) SDK for token generation. This property should only be specified when the accessToken property is a callback function. For more information on the Azure-specific parameters, see sampleazuretokenauth.js  and for the OCI-specific parameters, see sampleocitokenauth.js.
         * For OAuth2.0 token-based authentication and when using node-oracledb Thick mode, Oracle Client libraries 19.15 (or later), or 21.7 (or later) must be used. For IAM token-based authentication and when using node-oracledb Thick mode, Oracle Client libraries 19.14 (or later), or 21.5 (or later) are required.
         *
         * @since 6.3
         */
        accessTokenConfig?: AccessTokenConfigAzure | AccessTokenConfigOCI | undefined;
        /**
         * An array of array values that identifies the application context used by the connection.
         * The elements of the array should contain three string values - namespace, name, and value.
         * Available only in node-oracledb Thin mode.
         *
         * @since 6.9
         */
        appContext?: Array<AppContextOpts>;
        /**
         * An alias of connectionString. Only one of the properties should be used.
         * The Oracle database instance used by connections in the pool.
         * The string can be an Easy Connect string, or a Net Service Name from a tnsnames.ora file, or the name of a local Oracle database instance.
         */
        connectString?: string | undefined;
        /**
         * An alias of connectString. Only one of the properties should be used.
         * The Oracle database instance used by connections in the pool.
         * The string can be an Easy Connect string, or a Net Service Name from a tnsnames.ora file, or the name of a local Oracle database instance.
         *
         * @since 2.1
         */
        connectionString?: string | undefined;
        /**
         * The password to decrypt the Privacy Enhanced Mail (PEM)-encoded private certificate, if it is encrypted.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string instead.
         *
         * @since 6.0
         */
        walletPassword?: string | undefined;
        /**
         * The directory where the wallet can be found. In node-oracledb Thin mode, this must be the directory that contains the PEM-encoded wallet file.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string instead.
         *
         * @since 6.0
         */
        walletLocation?: string | undefined;
        /**
         * Sets the name used for Edition-Based Redefinition by connections in the pool.
         * This optional property overrides the oracledb.edition property.
         *
         * @since 2.2
         */
        edition?: string | undefined;
        /**
         * Indicate whether Oracle Call Interface events mode should be enabled for this pool.
         * This optional property overrides the oracledb.events property.
         *
         * @default false
         * @since 2.2
         */
        events?: boolean | undefined;
        /**
         * Indicate whether pooled connections should be established using External Authentication.
         * This optional property overrides the oracledb.externalAuth property.
         * The user and password properties should not be set when externalAuth is true.
         *
         * @default false
         * @since 0.5
         */
        externalAuth?: boolean | undefined;
        /**
         * Indicate whether connections in the pool all have the same credentials (a ‘homogeneous’ pool), or whether different credentials can be used (a ‘heterogeneous’ pool).
         * When set to false, the user name and password can be omitted from the connection.createPool() call, but will need to be given for subsequent pool.getConnection() calls.
         * Different pool.getConnection() calls can provide different user credentials.
         * Alternatively, when homogeneous is false, the user name (the ‘proxy’ user name) and password can be given, but subsequent pool.getConnection() calls can specify a different user name to access that user’s schema.
         * Heterogeneous pools cannot be used with the connection pool cache. Applications should ensure the pool object is explicitly passed between code modules, or use a homogeneous pool and make use of connection.clientId.
         *
         * @default true
         * @since 2.3
         */
        homogeneous?: boolean | undefined;
        /**
         * The password of the database user used by connections in the pool. A password is also necessary if a proxy user is specified at pool creation.
         * If homogeneous is false, then the password may be omitted at pool creation but given in subsequent pool.getConnection() calls.
         */
        password?: string | undefined;
        /**
         * The poolAlias is an optional property that is used to explicitly add pools to the connection pool cache.
         * If a pool alias is provided, then the new pool will be added to the connection pool cache and the poolAlias value can then be used with methods that utilize the connection pool cache, such as oracledb.getPool() and oracledb.getConnection().
         *
         * @since 1.11
         */
        poolAlias?: string | undefined;
        /**
         * The directory in which the Optional Oracle Net Configuration Files are found.
         * For node-oracledb Thick mode, use the oracledb.initOracleClient() option configDir.
         * @since 6.0
         */
        configDir?: string | undefined;
        /**
         * Enables network routing through multiple protocol addresses. The value of this property can be ON or OFF.
         * The default value is ON.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string.
         * @since 6.0
         */
        sourceRoute?: string | undefined;
        /**
         * The distinguished name (DN) that should be matched with the server. If specified, this value is used for any verification. Otherwise, the hostname will be used.
         * This value is ignored if the sslServerDNMatch property is not set to the value True.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string.
         * @since 6.0
         */
        sslServerCertDN?: string | undefined;
        /**
         * Enables the connection to use either a weaker or more secure DN matching behavior when the sslServerDNMatch property is set.
         * If the value is True, then the sslServerDNMatch property uses a weaker DN matching behavior which only checks the server certificate (and not the listener certificate), and allows the service name to be used for partial DN matching. The DN matching for a partial match first matches the host name that the client connected to against the common name (CN) of the database server certificate DN or the Subject Alternate Names (SAN) of the database server certificate. If this fails, then the service name is matched against the CN of the database server certificate DN.
         * If the value is False, then the sslServerDNMatch property uses a more secure DN matching behavior which checks both the listener and server certificates, and does not allow a service name check for partial DN matching. The DN matching for a partial match matches the host name that the client connected to against the CN of the certificate DN or the SAN of the certificate. The service name is not checked in this case.
         * The default value is False.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string instead.
         * @since 6.1
         */
        sslAllowWeakDNMatch?: boolean | undefined;
        /**
         * Determines whether the server certificate DN should be matched in addition to the regular certificate verification that is performed.
         * If the sslServerCertDN parameter is not provided, host name matching is performed instead.
         * The default value is True.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string.
         * @since 6.0
         */
        sslServerDNMatch?: boolean | undefined;
        /**
         * The name or IP address of a proxy host to use for tunneling secure connections.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string.
         */
        httpsProxy?: string | undefined;
        /**
         * The port to be used to communicate with the proxy host.
         * The default value is 0.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string.
         *
         * @since 6.0
         * @default 0
         */
        httpsProxyPort?: number | undefined;
        /**
         * The number of times that a connection attempt should be retried before the attempt is terminated.
         * The default value is 0.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string.
         *
         * @since 6.0
         * @default 0
         */
        retryCount?: number | undefined;
        /**
         * The number of seconds to wait before making a new connection attempt.
         * The default value is 1. Changed to 1 from 0 in version 6.7
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string.
         *
         * @since 6.0
         * @default 1
         */
        retryDelay?: number | undefined;
        /**
         * The timeout duration in seconds for an application to establish an Oracle Net connection.
         * There is no timeout by default.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string.
         * @since 6.0
         */
        connectTimeout?: number | undefined;
        /**
         * The maximum number of seconds to wait to establish a connection to the database host.
         * The default value is 20.0. Changed to 20.0 from 60.0 in version 6.7
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string.
         * @default 20.0
         * @since 6.0
         */
        transportConnectTimeout?: number | undefined;
        /**
         * The number of minutes between the sending of keepalive probes. If this property is set to a value greater than zero, it enables the keepalive probes.
         * The default value is 0.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string.
         * @default 0
         * @since 6.0
         */
        expireTime?: number | undefined;
        /**
         * The Oracle Net Session Data Unit (SDU) packet size in bytes. The database server configuration should also set this parameter.
         * For node-oracledb Thick mode, use an Easy Connect string or a Connect Descriptor string.
         * @since 6.0
         */
        sdu?: number | undefined;
        /**
         * The application specific prefix parameter that is added to the connection identifier.
         * @since 6.0
         */
        connectionIdPrefix?: string | undefined;
        /**
         * The number of connections that are opened whenever a connection request exceeds the number of currently open connections.
         * This optional property overrides the oracledb.poolIncrement property.
         *
         * @default 1
         */
        poolIncrement?: number | undefined;
        /**
         * The maximum number of connections to which a connection pool can grow.
         * This optional property overrides the oracledb.poolMax property.
         * Importantly, if you increase poolMax you should also increase the number of threads available to node-oracledb.
         *
         * @default 4
         */
        poolMax?: number | undefined;
        /**
         * The maximum number of connections per shard for connection pools. This ensures that the pool is balanced towards each shard.
         * This optional property overrides the oracledb.poolMaxPerShard property.
         *
         * @since 4.1
         */
        poolMaxPerShard?: number | undefined;
        /**
         * The minimum number of connections a connection pool maintains, even when there is no activity to the target database.
         * This optional property overrides the oracledb.poolMin property.
         *
         * @default 0
         */
        poolMin?: number | undefined;
        /**
         * When a pool getConnection() is called and the connection has been idle in the pool for
         * at least poolPingInterval seconds, an internal “ping” will be performed first to check the aliveness of the connection.
         * This optional property overrides the oracledb.poolPingInterval property.
         *
         * @default 60
         */
        poolPingInterval?: number | undefined;
        /**
         * The number of seconds after which idle connections (unused in the pool) may be terminated.
         * Idle connections are terminated only when the pool is accessed.
         * This optional property overrides the oracledb.poolTimeout property.
         *
         * @default 60
         */
        poolTimeout?: number | undefined;
        /**
         * The maximum number of pending pool.getConnection() calls that can be queued.
         *
         * When the number of pool.getConnection() calls that have been queued waiting for an available connection reaches queueMax,
         * then any future pool.getConnection() calls will immediately return an error and will not be queued.
         *
         * If queueMax is -1, then the queue length is not limited.
         *
         * This property may be overridden when creating a connection pool.
         *
         * @default 500
         */
        queueMax?: number | undefined;
        /**
         * This property was removed in node-oracledb 3.0 and queuing was always enabled.
         * In node-oracledb 5.0, set queueMax to 0 to disable queuing.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#connpoolqueue
         */
        queueRequests?: number | undefined;
        /**
         * The number of milliseconds after which connection requests waiting in the connection request queue are terminated.
         * If queueTimeout is set to 0, then queued connection requests are never terminated.
         * This optional property overrides the oracledb.queueTimeout property.
         *
         * @default 60000
         */
        queueTimeout?: number | undefined;
        /**
         * When sessionCallback is a Node.js function, it will be invoked for each pool.getConnection() call that will return a newly created connection in the pool.
         * It will also be called if pool.getConnection() requests a connection from the pool with a given tag, and that tag value does not match the connection’s current actual tag.
         * It will not be invoked for other getConnection() calls. The tag requested by pool.getConnection() is passed as the requestedTag parameter and the actual tag is available in connection.tag.
         *
         * The session callback is called before getConnection() returns so it can be used to do logging or efficiently set session state such as with ALTER SESSION statements.
         * Make sure any session state is set and connection.tag is updated in the sessionCallback function prior to it calling its own callback function otherwise the session will not be correctly set when getConnection() returns.
         *
         * When node-oracledb is using Oracle Client libraries 12.2 or later, the tag must be a multi-property tag with name=value pairs like “k1=v1;k2=v2”.
         * When using Oracle Client libraries 12.2 or later, sessionCallback can be a string containing the name of a PL/SQL procedure to be called when pool.getConnection() requests a tag, and that tag does not match the connection’s actual tag.
         * When the application uses DRCP connections, a PL/SQL callback can avoid the round-trip calls that a Node.js function would require to set session state. For non-DRCP connections, the PL/SQL callback will require a round-trip from the application.
         *
         * The PL/SQL procedure declaration is:
         *
         *      PROCEDURE mycallback (
         *         desired_props IN  VARCHAR2,
         *         actual_props  IN  VARCHAR2
         *      );
         *
         * @since 3.1
         */
        sessionCallback?:
            | string
            | ((connection: Connection, requestedTag: string, callback: (error?: unknown) => void) => void)
            | undefined;
        /**
         * Indicates whether the pool’s connections should share a cache of SODA metadata. This improves SODA performance by reducing round-trips to the database when opening collections. It has no effect on non-SODA operations.
         * The default is false.
         * There is no global equivalent for setting this attribute. SODA metadata caching is restricted to pooled connections only.
         * Note that if the metadata of a collection is changed externally, the cache can get out of sync. If this happens, the cache can be cleared by calling pool.reconfigure({sodaMetadataCache: false}). See pool.reconfigure().
         * A second call to reconfigure() should then be made to re-enable the cache.
         * It requires Oracle Client 21.3 (or later). The feature is also available in Oracle Client 19c from 19.11 onward.
         *
         * @since 5.2
         */
        sodaMetaDataCache?: boolean | undefined;
        /**
         * The number of statements to be cached in the statement cache of each connection in the pool.
         * This optional property overrides the oracledb.stmtCacheSize property.
         */
        stmtCacheSize?: number | undefined;
        /**
         * The database user name for connections in the pool. Can be a simple user name or a proxy of the form alison[fred].
         * If homogeneous is false, then the pool user name and password need to be specified only if the application wants that user to proxy the users supplied in subsequent pool.getConnection() calls.
         */
        user?: string | undefined;
        /**
         * Further statistics can be enabled by setting the createPool() poolAttrs parameter _enableStats to true.
         * Statistics can be output to the console by calling the pool.logStatistics() method.
         */
        enableStatistics?: boolean | undefined;
        /**
         * The privilege to use when establishing connection to the database.
         * This optional property should be one of the privileged connection constants.
         * For Thin mode only, privilege is applicable in createPool. Thick mode
         * still needs to pass it in pool.getConnection.
         *
         * @since 6.5.1
         */
        privilege?: number | undefined;
        /**
         * Enables the connection to use the TLS extension, Server Name Indication (SNI).
         * This property requires Oracle Database 23.7 (or later).
         * Available only in node-oracledb Thin mode.
         *
         * @default false
         * @since 6.8
         */
        useSNI?: boolean | undefined;
        /**
         * Indicates if network data compression needs to be enabled or disabled for a database connection.
         * Enabling data compression reduces the size of the Oracle Net Session Data Unit (SDU) that is to be sent over a connection.
         * Available only in thin driver mode.
         *
         * @default false
         * @since 6.8
         */
        networkCompression?: boolean | undefined;
        /**
         * The minimum data size, in bytes, for which compression should be performed on the Oracle Net Session Data Unit (SDU).
         * The minimum data size is 200 bytes.
         *
         * @default 1024
         * @since 6.8
         */
        networkCompressionThreshold?: number | undefined;
        /**
         * The name of the driver that is used by the client to connect to Oracle Database.
         * This is equivalent to the value in the `CLIENT_DRIVER` column of the `V$SESSION_CONNECT_INFO` view.
         * This optional property overrides the `oracledb.driverName` property.
         * This property can only be used in the node-oracledb Thin mode.
         *
         * @since 6.7.0
         */
        driverName?: string | undefined;
        /**
         * The name of the host machine from where the connection originates.
         * This is equivalent to the value in the `MACHINE` column of the `V$SESSION` view.
         * This optional property overrides the `oracledb.machine` property.
         * This property can only be used in the node-oracledb Thin mode.
         *
         * @since 6.7.0
         */
        machine?: string | undefined;
        /*
         * The name of the operating system user that initiates the database connection.
         * This is equivalent to the value in the `OSUSER` column of the `V$SESSION` view.
         * This optional property overrides the `oracledb.osUser` property.
         * This property can only be used in the node-oracledb Thin mode.
         *
         * @since 6.7.0
         */
        osUser?: string | undefined;
        /**
         * The name of the program connecting to the database.
         * This is equivalent to the value in the `PROGRAM` column of the `V$SESSION` view.
         * This optional property overrides the `oracledb.program` property.
         * This property can only be used in the node-oracledb Thin mode.
         *
         * @since 6.7.0
         */
        program?: string | undefined;
        /**
         * The name of the terminal from where the connection originates.
         * This is equivalent to the value in the `TERMINAL` column of the `V$SESSION` view.
         * This optional property overrides the `oracledb.terminal` property.
         * This property can only be used in the node-oracledb Thin mode.
         *
         * @since 6.7.0
         */
        terminal?: string | undefined;
        /**
         * The security credentials required to establish a mutual TLS (mTLS) connection to Oracle Database.
         * This property can be used to directly specify the security credentials instead of storing and reading the credentials from the `ewallet.pem` file specified in the walletLocation property.
         * The value of the walletContent property overrides the `walletLocation` value and the `WALLET_LOCATION` parameter in the connection string.
         *
         * @since 6.6.0
         */
        walletContent?: string | undefined;
        /**
         * This attribute decides how long a connection is allowed to stay in the pool
         * before it is deemed unfit for user and dropped from the pool.
         *
         * @default 0
         * @since 6.9
         */
        maxLifetimeSession?: number;
    }

    /**
     * Used for enqueuing and dequeuing Oracle Advanced Queuing messages. Each can be used for enqueuing, dequeuing, or for both.
     *
     * @see https://oracle.github.io/node-oracledb/doc/api.html#aq
     * @since 4.0
     */
    interface AdvancedQueue<T> {
        /** Contains the name of the queue specified in the connection.getQueue() call. */
        readonly name: string;
        /** Options to use when dequeuing messages. Attributes can be set before each queue.deqOne() or queue.deqMany(). */
        deqOptions: DequeueOptions;
        /** Options to use when enqueuing messages. Attributes can be set before each queue.enqOne() or queue.denqMany(). */
        enqOptions: EnqueueOptions;
        /** One of the DB_TYPE_RAW or DB_TYPE_OBJECT or DB_TYPE_JSON constants. */
        readonly payloadType: DbType | number;
        /**
         * The DBObject Class corresponding to the payload type specified when the queue was created
         *
         * This is defined only if payloadType has the value oracledb.DB_TYPE_OBJECT.
         */
        readonly payloadTypeClass?: DBObjectClass<T> | undefined;
        /** Either the string “RAW” or the name of the Oracle Database object type identified when the queue was created. */
        readonly payloadTypeName: string;

        /**
         * Dequeues up to the specified number of messages
         *
         * @param maxMessages Maximum number of messages to dequeue.
         */
        deqMany(maxMessages: number): Promise<Array<AdvancedQueueMessage<T>>>;
        deqMany(
            maxMessages: number,
            callback: (error: DBError, messages: Array<AdvancedQueueMessage<T>>) => void,
        ): void;

        /**
         * Dequeues a single message. Depending on the dequeue options, the message may also be returned as undefined if no message is available.
         */
        deqOne(): Promise<AdvancedQueueMessage<T> | undefined>;
        deqOne(callback: (error: DBError, message?: AdvancedQueueMessage<T>) => void): void;

        /**
         * Enqueues multiple messages.
         *
         * Warning: calling enqMany() in parallel on different connections acquired from the same pool may fail due to Oracle bug 29928074.
         * Ensure that enqMany() is not run in parallel, use standalone connections, or make multiple calls to enqOne().
         * The deqMany() method is not affected.
         *
         * Previously, aqQueue.enqMany() did not return any value. Now, this method returns an array of AqMessage objects.
         * @param messages Messages to enqueue.
         */
        enqMany(messages: Array<EnqueueMessage<T>>): Promise<AdvancedQueueMessage<T>>;
        enqMany(
            messages: Array<EnqueueMessage<T>>,
            callback: (error: DBError) => AdvancedQueueMessage<T>,
        ): AdvancedQueueMessage<T>;

        /**
         * Enqueues a single message.
         *
         * Previously, aqQueue.enqOne() did not return any value. Now, this method returns an AqMessage object.
         *
         * @param message
         */
        enqOne(message: EnqueueMessage<T>): Promise<AdvancedQueueMessage<T>>;
        enqOne(
            message: EnqueueMessage<T>,
            callback: (error: DBError) => AdvancedQueueMessage<T>,
        ): AdvancedQueueMessage<T>;
    }

    type EnqueueMessage<T> =
        | string
        | Buffer
        | DBObject_IN<T>
        | {
            /** Correlation that was used during enqueue. */
            correlation: string;
            /** Number of seconds the message was delayed before it could be dequeued. */
            delay: number;
            /** Name of the exception queue defined when the message was enqueued. */
            exceptionQueue: string;
            /** Number of seconds until expiration defined when the message was enqueued. */
            expiration: number;
            /** Contains the payload of the message, with type depending on the value of queue.payloadType.
             * Note that enqueued Strings are returned as UTF-8 encoded Buffers.
             */
            payload: string | Buffer | DBObject_IN<T>;
            /** Priority of the message when it was enqueued. */
            priority: number;
        };

    /**
     * @see https://oracle.github.io/node-oracledb/doc/api.html#objects
     * @since 4.0
     */
    interface DBObjectClass<T> {
        new(data?: T): DBObject_IN<T>;
    }

    /**
     * @see https://oracle.github.io/node-oracledb/doc/api.html#objects
     * @since 4.0
     */
    type DBObject_IN<T> =
        & {
            [P in keyof T]: T[P];
        }
        & BaseDBObject<T>;

    /**
     * @see https://oracle.github.io/node-oracledb/doc/api.html#objects
     * @since 4.0
     */
    type DBObject_OUT<T> =
        & {
            [P in keyof T]: DBObject_OUT<T[P]>;
        }
        & BaseDBObject<T>;

    /**
     * @see https://oracle.github.io/node-oracledb/doc/api.html#objects
     * @since 4.0
     */
    interface BaseDBObject<T> {
        /**
         * When dbObject.isCollection is false, this will be an object containing attributes corresponding to the Oracle Database object attributes.
         */
        attributes: Record<
            string,
            {
                /** The maximum size (in bytes) of the attribute when theattribute's type is one of
                 * 'oracledb.DB_TYPE_CHAR', 'oracledb.DB_TYPE_NCHAR', 'oracledb.DB_TYPE_NVARCHAR',
                 * 'oracledb.DB_TYPE_RAW', or 'oracledb.DB_TYPE_VARCHAR'.
                 * For all other types, the value returned is undefined.
                 */
                maxSize?: number | undefined;
                /**
                 * The precision of the attribute when the attribute's type is 'oracledb.DB_TYPE_NUMBER'.
                 * For all other types, the value returned is undefined.
                 */
                precision?: number | undefined;
                /**
                 * The scale of the attribute when the attribute's type is 'oracledb.DB_TYPE_NUMBER'.
                 * For all other types, the value returned is undefined.
                 */
                scale?: number | undefined;
                /** One of the DB_TYPE constants. */
                type: DbType | number;
                /** Type, such as 'VARCHAR2' or 'NUMBER'. */
                typeName: string;
                /** Set if the value of type is a DBObject. */
                typeClass?: DBObjectClass<T> | undefined;
            }
        >;
        /** When dbObject.isCollection is true, this will be one of the DB_TYPE constants. */
        readonly elementType: DbType | number;
        readonly elementTypeClass: DBObjectClass<T>;
        /** When dbObject.isCollection is true, this will have the name of the element type, such as “VARCHAR2” or “NUMBER”. */
        readonly elementTypeName: string;
        /** The fully qualified name of the Oracle Database object or collection. */
        readonly fqn: string;
        /** True if the object is a collection, false otherwise. */
        readonly isCollection: boolean;
        /** When dbObject.isCollection is true, this will have the number of elements in the collection. It is undefined for non-collections. */
        readonly length?: number | undefined;
        /** Name of the Oracle Database object or collection. */
        readonly name: string;
        /** Schema owning the Oracle Database object or collection. */
        readonly schema: string;
        /** This read-only property is a string which identifies the name of the package, if the type refers to a PL/SQL type. Otherwise, it returns undefined.
         * @since 6.2
         */
        readonly packageName: string | undefined;

        /**
         * Add the given value to the end of the collection.
         */
        append(value: T): void;
        /**
         * Creates a copy of the object and returns it.
         * For node-oracledb Thick mode, this method requires Oracle Client libraries 12.2 or higher, if you are copying PL/SQL collection VARRAY types.
         *
         * @since 6.8
         */
        copy(): T;
        /**
         * Deletes the value from collection at the given index.
         */
        deleteElement(index: number): void;
        /**
         * Return the value associated with the given index.
         */
        getElement(index: number): any;
        /**
         * Returns the first index for later use to obtain the value.
         */
        getFirstIndex(): number;
        /**
         * Returns a JavaScript array containing the ‘index’ keys.
         */
        getKeys(): T extends string | number ? number[] : Array<keyof T>;
        /**
         * To obtain the last index for later use to obtain a value.
         */
        getLastIndex(): number;
        /**
         * Returns the next index value for later use to obtain a value.
         */
        getNextIndex(): number;
        /**
         * Returns the previous index for later use to obtain the value.
         */
        getPrevIndex(): number;
        /**
         * Returns true if an element exists in the collection at the given index. Returns false otherwise.
         */
        hasElement(): boolean;
        /**
         * To set the given value at the position of the given index.
         */
        setElement(index: number, value: T): void;
        /**
         * Returns an array of element values as a JavaScript array in key order.
         */
        getValues(): T[];
        /**
         * Returns a map object for the collection types indexed by PLS_INTEGER where the collection’s indexes are the keys and the elements are its values. See Associative Array Indexed By PLS_INTEGER for example.
         *
         * @since 6.4
         */
        toMap<V>(): Map<T, V>;
        /**
         * Trims the specified number of elements from the end of the collection.
         */
        trim(count: number): void;
    }

    /**
     * Message dequeued from an advanced queue.
     *
     * @since 4.0
     */
    interface AdvancedQueueMessage<T> {
        /** Correlation that was used during enqueue. */
        correlation: string;
        /** Number of seconds the message was delayed before it could be dequeued. */
        delay: number;
        /** Delivery mode the messages was enqueued with. */
        deliveryMode: number;
        /** A readonly JavaScript Date object with a precision of seconds containing
         * the timestamp of when the message was enqueued.
         */
        readonly enqTime: Date;
        /** Name of the exception queue defined when the message was enqueued. */
        exceptionQueue: string;
        /** Number of seconds until expiration defined when the message was enqueued. */
        expiration: number;
        /** Contains the unique identifier of the message. */
        msgId: Buffer;
        /** Number of attempts that were made to dequeue the message. */
        numAttempts: number;
        /** Contains the unique identifier of the message in the last queue that generated it. */
        originalMsgId: Buffer;
        /** Contains the payload of the message, with type depending on the value of queue.payloadType.
         * Note that enqueued Strings are returned as UTF-8 encoded Buffers.
         */
        payload: Buffer | DBObject_OUT<T>;
        /** Priority of the message when it was enqueued. */
        priority: number;
        /** State of the message. It can be any one of the AQ_MSG_STATE constants. */
        state: number;
    }

    /**
     * Options to use when dequeuing messages. Attributes can be set before each queue.deqOne() or queue.deqMany().
     *
     * @see https://oracle.github.io/node-oracledb/doc/api.html#aqoptions
     * @since 4.0
     */
    interface DequeueOptions {
        /** Condition that must be satisfied in order for a message to be dequeued. */
        condition: string;
        /** Name of the consumer that is dequeuing messages. */
        consumerName: string;
        /** Correlation to use when dequeuing. */
        correlation: string;
        /** Mode to use for dequeuing messages. It can be any one of the AQ_DEQ_MODE constants. */
        mode: number;
        /** Unique identifier specifying the message to be dequeued. */
        msgId: Buffer;
        /** Position in the queue of the message that is to be dequeued. It can be any one of the AQ_DEQ_NAV constants. */
        navigation: number;
        /** Transformation that will take place on messages when they are dequeued. */
        transformation: string;
        /** Defines whether the dequeue occurs in the current transaction or as a separate transaction. It can be any one of the AQ_VISIBILITY constants. */
        visibility: number;
        /** Number of seconds to wait for a message matching the search criteria to become available. It can be any one of the AQ_DEQ wait constants. */
        wait: number;
    }

    /**
     * Options to use when enqueuing messages. Attributes can be set before each queue.enqOne() or queue.enqMany().
     */
    interface EnqueueOptions {
        /** Celivery mode when enqueuing messages. It can be any one of the AQ_MSG_DELIV constants. */
        deliveryMode: number;
        /** Transformation that will take place on messages when they are enqueued. */
        transformation: string;
        /** Defines whether the enqueue occurs in the current transaction or as a separate transaction. It can be any one of the AQ_VISIBILITY constants. */
        visibility: number;
    }

    /**
     * Extends Readable and provides access to data and metadata of the query. The end event indicates the end of the query results.
     * After the end event has been received, the Stream destroy() function should be called to clean up resources properly.
     * Any further end-of-fetch logic, in particular the connection release, should be in the close event.
     */
    type QueryStream<T> = Readable & QueryStreamEvents<T>;

    interface QueryStreamEvents<T> {
        addListener(event: "metadata", listener: (metadata: Array<Metadata<T>>) => void): this;

        emit(event: "metadata", metadata: Array<Metadata<T>>): boolean;

        on(event: "metadata", listener: (metadata: Array<Metadata<T>>) => void): this;

        once(event: "metadata", listener: (metadata: Array<Metadata<T>>) => void): this;

        prependListener(event: "metadata", listener: (metadata: Array<Metadata<T>>) => void): this;

        prependOnceListener(event: "metadata", listener: (metadata: Array<Metadata<T>>) => void): this;

        removeListener(event: "metadata", listener: (metadata: Array<Metadata<T>>) => void): this;
    }

    /**
     * Contains information regarding the outcome of a successful connection.execute().
     */
    interface Result<T> {
        /**
         * This property will be defined if the executed statement returned Implicit Results. Depending on the value of resultSet it will either be an array,
         * each element containing an array of rows from one query, or an array of ResultSets each corresponding to a query.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#implicitresults
         * @since 4.0
         */
        implicitResults?: Array<T[] | ResultSet<T>> | undefined;
        /**
         * ROWID of a row affected by an INSERT, UPDATE, DELETE or MERGE statement. For other statements,
         * or if no row was affected, it is not set. If more than one row was affected, only the ROWID of the last row is returned.
         *
         * @since 4.2
         */
        readonly lastRowid?: string | undefined;
        /**
         * For SELECT statements, this contains an array of objects describing details of columns for the select list.
         * For non queries, this property is undefined.
         *
         * Each column’s name is always given.
         */
        metaData?: Array<Metadata<T>> | undefined;
        /**
         * This contains the output values of OUT and IN OUT binds. If bindParams is passed as an array,
         * then outBinds is returned as an array. If bindParams is passed as an object,
         * then outBinds is returned as an object. If there are no OUT or IN OUT binds, the value is undefined.
         */
        outBinds?: T | undefined;
        /**
         * For SELECT statements when the resultSet option is true, use the resultSet object to fetch rows.
         *
         * When using this option, resultSet.close() must be called when the ResultSet is no longer needed.
         * This is true whether or not rows have been fetched from the ResultSet.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#resultsetclass
         * @see https://oracle.github.io/node-oracledb/doc/api.html#resultsethandling
         */
        resultSet?: ResultSet<T> | undefined;
        /**
         * For SELECT statements using direct fetches, rows contains an array of fetched rows.
         * It will be NULL if there is an error or the SQL statement was not a SELECT statement.
         * By default, the rows are in an array of column value arrays, but this can be changed to arrays
         * of objects by setting outFormat to oracledb.OBJECT. If a single row is fetched,
         * then rows is an array that contains one single row.
         *
         * The number of rows returned is limited by oracledb.maxRows or the maxRows option in an execute() call.
         * If maxRows is 0, then the number of rows is limited by Node.js memory constraints.
         */
        rows?: T[] | undefined;
        /**
         * For DML statements (including SELECT FOR UPDATE) this contains the number of rows affected,
         * for example the number of rows inserted. For non-DML statements such as queries and PL/SQL statements,
         * rowsAffected is undefined.
         */
        rowsAffected?: number | undefined;
        /**
         * This property provides an error object that gives information about any database warnings (such as PL/SQL compilation warnings) that were generated during the last call to connection.execute().
         * See PL/SQL Compilation Warnings for more information.
         *
         * @since 6.3
         */
        warning?: DBError | undefined;
    }

    /**
     * Contains information regarding the outcome of a successful connection.executeMany().
     */
    interface Results<T> {
        /**
         * An array of error objects that were reported during execution.
         *
         * The offset property of each error object corresponds to the 0-based index of the executeMany()
         * binds parameter array, indicating which record could not be processed.
         *
         * It will be present only if batchErrors was true in the executeMany() options parameter and there are
         * data errors to report. Some classes of execution error will always return via the executeMany()
         * callback error object, not in batchErrors.
         */
        batchErrors?: DBError[] | undefined;
        /**
         * An array of integers identifying the number of rows affected by each record of the binds parameter.
         *
         * It is present only if dmlRowCounts was true in the executeMany() options parameter and a DML statement
         * was executed.
         */
        dmlRowCounts?: number[] | undefined;
        /**
         * Contains the value of any returned IN OUT or OUT binds. It is an array of arrays, or an array of objects,
         * depending on the binds parameters structure. The length of the array will correspond to the length of
         * the array passed as the binds parameter. It will be present only if there is at least one OUT bind
         * variable identified.
         */
        outBinds?: T[] | undefined;
        /**
         * An integer identifying the total number of database rows affected by the processing of all records
         * of the binds parameter. It is only present if a DML statement was executed.
         */
        rowsAffected?: number | undefined;
        /**
         * This property provides an error object that gives information about any database warnings (such as PL/SQL compilation warnings) that were generated during the last call to connection.executeMany().
         *
         * @see https://node-oracledb.readthedocs.io/en/latest/user_guide/plsql_execution.html#plsqlcompwarnings
         *
         * @since 6.4
         */
        warning: {
            message: string;
            code: string;
        };
    }

    /**
     * ResultSets allow query results to fetched from the database one at a time, or in groups of rows.
     * They can also be converted to Readable Streams. ResultSets enable applications to process very large data sets.
     *
     * ResultSets should also be used where the number of query rows cannot be predicted and may be larger than
     * Node.js can handle in a single array.
     *
     * A ResultSet object is obtained by setting resultSet: true in the options parameter of the
     * Connection execute() method when executing a query. A ResultSet is also returned to node-oracledb when
     * binding as type oracledb.CURSOR to a PL/SQL REF CURSOR bind parameter.
     *
     * @see https://oracle.github.io/node-oracledb/doc/api.html#resultsethandling
     */
    interface ResultSet<T> {
        /**
         * Contains an array of objects with metadata about the query or REF CURSOR columns.
         *
         * Each column’s name is always given.
         */
        readonly metaData: Array<Metadata<T>>;

        /**
         * Closes a ResultSet. Applications should always call this at the end of fetch or when no more rows are needed.
         * It should also be called if no rows are ever going to be fetched from the ResultSet.
         */
        close(): Promise<void>;
        close(callback: (error: DBError) => void): void;

        /**
         * This call fetches one row of the ResultSet as an object or an array of column values,
         * depending on the value of outFormat.
         *
         * At the end of fetching, the ResultSet should be freed by calling close().
         *
         * Performance of getRow() can be tuned by adjusting the value of oracledb.fetchArraySize or
         * the execute() option fetchArraySize.
         */
        getRow(): Promise<T>;
        getRow(callback: (error: DBError, row: T) => void): void;

        /**
         * This call fetches numRows rows of the ResultSet as an object or an array of column values,
         * depending on the value of outFormat. If no argument is passed, or numRows is zero, then all rows are fetched.
         *
         * At the end of fetching, the ResultSet should be freed by calling close().
         *
         * Different values of numRows may alter the time needed for fetching data from Oracle Database.
         * The value of fetchArraySize has no effect on getRows() performance or internal buffering.
         *
         * @param numRows The number of rows to fetch
         */
        getRows(numRows?: number): Promise<T[]>;
        getRows(callback: (error: DBError, rows: T[]) => void): void;
        getRows(numRows: number, callback: (error: DBError, rows: T[]) => void): void;

        /**
         * This synchronous method converts a ResultSet into a stream.
         *
         * It can be used to make ResultSets from top-level queries or from REF CURSOR bind variables streamable.
         * To make top-level queries streamable, the alternative connection.queryStream() method may be easier to use.
         *
         * To change the behavior of toQueryStream(), such as setting the query output Format or the internal
         * buffer size for performance, adjust global attributes such as oracledb.outFormat and oracledb.fetchArraySize
         * before calling execute().
         *
         * @since 1.9
         * @see https://oracle.github.io/node-oracledb/doc/api.html#streamingresults
         */
        toQueryStream(): Readable;
    }

    /**
     * The SodaDatabase class is the top level object for node-oracledb SODA operations.
     * A ‘SODA database’ is an abstraction, allowing access to SODA collections in that ‘SODA database’,
     * which then allow access to documents in those collections.
     *
     * A SODA database object is created by calling connection.getSodaDatabase().
     *
     * @see https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-BE42F8D3-B86B-43B4-B2A3-5760A4DF79FB
     * @see https://oracle.github.io/node-oracledb/doc/api.html#sodaoverview
     */
    interface SodaDatabase {
        /**
         * Creates a SODA collection of the given name. If you try to create a collection, and a collection with the
         * same name already exists, then that existing collection is opened without error.
         *
         * Optional metadata allows collection customization. If metadata is not supplied, a default collection
         * will be created.
         *
         * Most users will allow createCollection() to create the Oracle Database table used internally to store
         * SODA documents. However the option mode can be used to indicate the collection should be stored in a
         * table that was previously manually created.
         *
         * By default, createCollection() first attempts to create the Oracle Database table used internally to store
         * the collection. If the table exists already, it will attempt to use it as the table underlying the collection.
         *
         * If the optional mode parameter is oracledb.SODA_COLL_MAP_MODE, SODA will attempt to use a pre-existing
         * table as the table underlying the collection.
         *
         * If oracledb.autoCommit is true, and createCollection() succeeds, then any open transaction on the connection
         * is committed. Note SODA operations do not commit an open transaction the way that SQL always does for DDL
         * statements.
         *
         * @param collectionName Name of the collection to be created.
         * @param options
         *
         * @since 3.0
         */
        createCollection(collectionName: string, options?: SodaCollectionOptions): Promise<SodaCollection>;
        createCollection(
            collectionName: string,
            options: SodaCollectionOptions,
            callback: (error: DBError, collection: SodaCollection) => void,
        ): void;
        createCollection(collectionName: string, callback: (error: DBError, collection: SodaCollection) => void): void;

        /**
         * A synchronous method that constructs a proto SodaDocument object usable for SODA insert and replace methods.
         * SodaDocument attributes like createdOn will not be defined, and neither will attributes valid in options but not specified.
         * The document will not be stored in the database until an insert or replace method is called.
         *
         * You only need to call createDocument() if your collection requires client-assigned keys or has non-JSON content,
         * otherwise you can pass your JSON content directly to the SODA insert and replace methods.
         *
         * @param content The document content.
         * @param options Optional properties for the document to be created.
         */
        createDocument(content: string | Buffer | Record<string, any>, options?: SodaDocumentOptions): SodaDocument;

        /**
         * Gets an array of collection names in alphabetical order.
         *
         * If oracledb.autoCommit is true, and getCollectionNames() succeeds, then any open transaction on the connection is committed.
         *
         * @param options If options is undefined, then all collection names will be returned.
         *
         * @since 3.0
         */
        getCollectionNames(options?: SodaCollectionNamesOptions): string[];
        getCollectionNames(
            options: SodaCollectionNamesOptions,
            callback: (error: DBError, names: string[]) => void,
        ): void;
        getCollectionNames(callback: (error: DBError, names: string[]) => void): void;

        /**
         * Opens an existing SodaCollection of the given name. The collection can then be used to access documents.
         *
         * If the requested collection does not exist, it is not an error. Instead, the returned collection value
         * will be undefined.
         *
         * If oracledb.autoCommit is true, and openCollection() succeeds, then any open transaction on the
         * connection is committed.
         *
         * @param collectionName Name of the collection to open.
         *
         * @since 3.0
         */
        openCollection(collectionName: string): Promise<SodaCollection | undefined>;
        openCollection(collectionName: string, callback: (error: DBError, collection?: SodaCollection) => void): void;
    }

    /**
     * Options which may be used when getting SODA collection names.
     */
    interface SodaCollectionNamesOptions {
        /** Limits the number of names returned. If limit is 0 or undefined, then all collection names are returned. */
        limit?: number | undefined;
        /**
         * Returns names that start with the given string, and all subsequent names, in alphabetic order.
         * For example, if collections with names “cat”, “dog”, and “zebra” exist, then using startsWith of “d” will return
         * “dog” and “zebra”. If startsWith is an empty string or undefined, all collection names are returned, subject to the value of limit.
         */
        startsWith?: string | undefined;
    }

    /**
     * Used when creating a new SODA document.
     */
    interface SodaDocumentOptions {
        /**
         * Must be supplied if the document in intended to be inserted into a collection with client-assigned keys. It should be undefined, otherwise.
         */
        key?: string | undefined;
        /**
         * If the document has non-JSON content, then mediaType should be set to the desired media type. Using a MIME type is recommended.
         *
         * @default application/json
         */
        mediaType?: string | undefined;
    }

    /**
     * SODA can be used with Oracle Client 18.5 and Oracle Client 19.3, or later.
     */
    interface SodaCollection {
        /**
         * Metadata of the current collection.
         *
         * @since 3.0
         * @see https://oracle.github.io/node-oracledb/doc/api.html#sodaclientkeys
         */
        readonly metaData: SodaMetadata;
        /**
         * Name of the current collection.
         *
         * @since 3.0
         */
        readonly name: string;

        /**
         * Creates an index on a SODA collection, to improve the performance of SODA query-by-examples (QBE) or
         * enable text searches. An index is defined by a specification, which is a JSON object that specifies
         * how particular QBE patterns are to be indexed for quicker matching.
         *
         * Note that a commit should be performed before attempting to create an index.
         *
         * @param indexSpec
         *
         * @since 3.0
         * @see https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-4848E6A0-58A7-44FD-8D6D-A033D0CCF9CB
         */
        createIndex(indexSpec: BTreeIndex | SpatialIndex | SearchIndex): Promise<void>;
        createIndex(indexSpec: BTreeIndex | SpatialIndex | SearchIndex, callback: (error: DBError) => void): void;

        /**
         * Drops the current collection.
         *
         * An error such as ORA-40626 will be returned and the collection will not be dropped if there are
         * uncommitted writes to the collection in the current transaction.
         *
         * If the collection was created with mode oracledb.SODA_COLL_MAP_MODE, then drop() will not physically
         * delete the database storage containing the collection, and won’t drop SODA indexes. Instead it will simply
         * unmap the collection, making it inaccessible to SODA operations.
         *
         * If oracledb.autoCommit is true, and drop() succeeds, then any open user transaction is committed.
         * Note SODA operations do not commit an open transaction the way that SQL always does for DDL statements.
         *
         * If the collection was created with custom metadata changing the key assignment method to SEQUENCE,
         * the drop() method will not delete the underlying Oracle sequence. This is in case it was created outside SODA.
         * To drop the sequence, use the SQL command DROP SEQUENCE after drop() has completed.
         *
         * Note you should never use SQL DROP TABLE command on the database table underlying a collection. This will
         * not clean up SODA’s metadata. If you do accidentally execute DROP SQL, you should cleanup the metadata with
         * drop() or execute the SQL statement: SELECT DBMS_SODA.DROP_COLLECTION('myCollection') FROM DUAL;.
         *
         * @since 3.0
         */
        drop(): Promise<DropCollectionResult>;
        drop(callback: (error: DBError, result: DropCollectionResult) => void): void;

        /**
         * Drops the specified index.
         *
         * If oracledb.autoCommit is true, and dropIndex() succeeds, then any open user transaction is committed.
         * Note SODA operations do not commit an open transaction the way that SQL always does for DDL statements.
         *
         * @param indexName Name of the index to be dropped.
         * @param options
         *
         * @since 3.0
         */
        dropIndex(indexName: string, options?: DropIndexOptions): Promise<DropCollectionResult>;
        dropIndex(
            indexName: string,
            options: DropIndexOptions,
            callback: (error: DBError, result: DropCollectionResult) => void,
        ): void;

        /**
         * The synchronous find() method is used to locate and order a set of SODA documents for retrieval,
         * replacement, or removal. It creates and returns a SodaOperation object which is used via method
         * chaining with non-terminal and terminal methods described below. Note that SodaOperation is an
         * internal object whose attributes should not be accessed directly.
         *
         * @since 3.0
         */
        find(): SodaOperation;

        /**
         * Infers the schema of a collection of JSON documents at the current time. A JSON data guide shows details
         * like the JSON property names, data types and lengths. It is useful for exploring the schema of a collection.
         * The data guide is represented as JSON content in a SodaDocument.
         *
         * This method is supported for JSON-only collections which have a JSON Search index where the “dataguide”
         * option is “on”. An error will be returned if a data guide cannot be created.
         *
         * A data guide is a best effort heuristic and should not be used as a schema to validate new JSON documents.
         * The data guide is always additive, and does not update itself when documents are deleted.
         * There are some limits such as the maximum number of children under one node, and the maximum length of a path.
         *
         * If oracledb.autoCommit is true, and getDataGuide() succeeds, then any open user transaction is committed.
         *
         * @since 3.0
         */
        getDataGuide(): Promise<SodaDocument>;
        getDataGuide(callback: (error: DBError, document: SodaDocument) => void): void;

        /**
         * Inserts a given document to the collection. The input document can be either a JavaScript object representing
         * the data content, or it can be an existing SodaDocument.
         *
         * Note SodaDocuments returned from sodaCollection.insertOneAndGet() or from sodaOperation.replaceOneAndGet()
         * cannot be passed to insertOne(), since these do not contain any document content. Instead, create a
         * JavaScript object using the desired attribute values, or use sodaDatabase.createDocument(), or use a
         * SodaDocument returned by a sodaCollection.find() query.
         *
         * If oracledb.autoCommit is true, and insertOne() succeeds, then the new document and any open transaction
         * on the connection is committed.
         *
         * @param newDocument The document to insert.
         *
         * @since 3.0
         */
        insertOne(newDocument: SodaDocument | Record<string, any>): Promise<void>;
        insertOne(newDocument: SodaDocument | Record<string, any>, callback: (error: DBError) => void): void;

        /**
         * Similar to sodaCollection.insertOne() but also returns the inserted document so system managed properties,
         * such as the key (in default collections), can be found.
         *
         * Inserts a document in a collection. This is similar to sodaCollection.insertOne(), but also returns the
         * result document, which contains all SodaDocument components (key, version, etc.) except for content.
         * Content is not returned for performance reasons. The result document has new values for components that
         * are updated as part of the replace operation (such as version, last-modified timestamp, and media type)
         *
         * If you want to insert the returned document again, use the original newDocumentContent or newDocument.
         * Alternatively construct a new object from the returned document and add content.
         *
         * If oracledb.autoCommit is true, and insertOneAndGet() succeeds, then any open transaction on the connection
         * is committed.
         *
         * @param newDocument The document to insert.
         *
         * @since 3.0
         */
        insertOneAndGet(
            newDocument: SodaDocument | Record<string, any>,
            options?: { hint: string },
        ): Promise<SodaDocument>;

        insertOneAndGet(
            newDocument: SodaDocument | Record<string, any>,
            callback: (error: DBError, document: SodaDocument) => void,
            options?: { hint: string },
        ): void;

        /**
         * This is similar to insertOne() however it accepts an array of the Objects or SodaDocuments that insertOne() accepts.
         * When inserting multiple documents, using insertMany() is recommended in preference to insertOne().
         *
         * If an error occurs, the offset attribute on the Error objects will contain the number of documents that were successfully inserted.
         * Subsequent documents in the input array will not be inserted
         *
         * This method is in Preview status and should not be used in production.
         *
         * @param documents The documents to insert.
         *
         * @requires Oracle Client 18.5 or higher
         * @since 4.0
         */
        insertMany(documents: Array<SodaDocument | Record<string, any>>): Promise<void>;
        insertMany(documents: Array<SodaDocument | Record<string, any>>, callback: (error: DBError) => void): void;

        /**
         * Similar to sodaCollection.insertMany() but also returns an array of the inserted documents so system managed properties,
         * such as the keys (in default collections), can be found. Content itself is not returned for performance reasons.
         *
         * When inserting multiple documents, using insertManyAndGet() is recommended in preference to insertOneAndGet().
         *
         * This method is in Preview status and should not be used in production.
         *
         * @param documents
         *
         * @required Oracle Client 18.5 or higher
         * @since 4.0
         */
        insertManyAndGet(
            documents: Array<SodaDocument | Record<string, any>>,
            options?: { hint: string },
        ): Promise<SodaDocument[]>;
        insertManyAndGet(
            documents: Array<SodaDocument | Record<string, any>>,
            callback: (error: DBError, documents: SodaDocument[]) => void,
            options?: { hint: string },
        ): void;

        /**
         * This method behaves like sodaCollection.insertOne() with the exception that if a document with the same key already exists, then it is updated instead.
         *
         * The collection must use client-assigned keys keys, which is why save() accepts only a SodaDocument, unlike insertOne(). If the collection is not configured
         * with client-assigned keys, then the behavior is exactly the same as sodaCollection.insertOne().
         *
         * @since 5.0
         */
        save(document: SodaDocument): Promise<SodaDocument>;
        save(document: SodaDocument, cb: (err: DBError, doc: SodaDocument) => void): void;

        /**
         * This method behaves like sodaCollection.insertOneAndGet() with the exception that if a document with the same key already exists, then it is updated instead.
         *
         * The collection must use client-assigned keys keys, which is why saveAndGet() accepts only a SodaDocument, unlike insertOneAndGet(). If the collection is not
         * configured with client-assigned keys, then the behavior is exactly the same as sodaCollection.insertOneAndGet().
         *
         * @since 5.0
         */
        saveAndGet(document: SodaDocument, options?: { hint: string }): Promise<SodaDocument>;
        saveAndGet(
            document: SodaDocument,
            cb: (err: DBError, doc: SodaDocument) => void,
            options?: { hint: string },
        ): void;

        /**
         * This method truncates a collection, removing all documents. The collection will not be deleted.
         *
         * @since 5.0
         */
        truncate(): Promise<void>;
        truncate(cb: (err: DBError) => void): void;

        /**
         * Retrieves all the indexes from a SODA collection. This method returns an array of objects that contains the index specifications.
         * This method requires Oracle Client 21.3 or later (or Oracle Client 19 from 19.13).
         * @since 6.2
         */
        listIndexes(): Promise<Array<BTreeIndex | SpatialIndex | SearchIndex>>;
        listIndexes(cb: (err: DBError, listIndexes: Array<BTreeIndex | SpatialIndex | SearchIndex>) => void): void;
    }

    /**
     * SodaDocuments represents the document for SODA read and write operations.
     */
    interface SodaDocument {
        /** Creation time of the document as a string in the UTC time zone using an ISO8601 format. */
        readonly createdOn?: string | undefined;
        /** Unique key value for this document. */
        readonly key?: string | undefined;
        /** Last modified time of the document as a string in the UTC time zone using an ISO8601 format. */
        readonly lastModified: string;
        /**
         * An arbitrary string value designating the content media type. The recommendation when creating documents is to use a MIME type for the media type.
         * By default, collections store only JSON document content and this property will be ‘application/json’. This property will be null if the media type
         * is unknown, which will only be in the rare case when a collection was created to store mixed or non-JSON content on top of a pre-existing database table,
         * and that table has NULLs in its mediaType column.
         *
         * @default 'application/json'
         */
        readonly mediaType?: string | undefined;
        /** Version of the document. */
        readonly version: string;

        /**
         * A synchronous method that returns the document content as an object.
         *
         * An exception will occur if the document content is not JSON and cannot be converted to an object.
         *
         * @since 3.0
         */
        getContent(): Record<string, any>;
        /**
         * A synchronous method that returns the document content as a Buffer.
         *
         * If the documents were originally created with sodaDatabase.createDocument(), then documents are returned as they were created.
         *
         * For documents fetched from the database where the collection storage is BLOB (which is the default), and whose mediaType is ‘application/json’,
         * then the buffer returned is identical to that which was stored. If the storage is not BLOB, it is UTF-8 encoded.
         *
         * @since 3.0
         */
        getContentAsBuffer(): Buffer;
        /**
         * A synchronous method that returns JSON document content as a String.
         *
         * An exception will occur if the document content cannot be converted to a string.
         *
         * If the document encoding is not known, UTF8 will be used.
         *
         * @since 3.0
         */
        getContentAsString(): string;
    }

    /**
     * Used to walk through a set of SODA documents returned from a find() getCursor() method.
     */
    interface SodaDocumentCursor {
        /**
         * This method closes a SodaDocumentCursor. It must be called when the cursor is no longer required.
         *
         * It releases resources in node-oracledb and Oracle Database.
         *
         * @since 3.0
         */
        close(): Promise<void>;
        close(callback: (error: DBError) => void): void;

        /**
         * This method returns the next SodaDocument in the cursor returned by a find() terminal method read operation.
         *
         * If there are no more documents, the returned document parameter will be undefined.
         *
         * @since 3.0
         */
        getNext(): Promise<SodaDocument | undefined>;
        getNext(callback: (error: DBError, document?: SodaDocument) => void): void;
    }

    /**
     * You can chain together SodaOperation methods, to specify read or write operations against a collection.
     *
     * Non-terminal SodaOperation methods return the same object on which they are invoked, allowing them to
     * be chained together.
     *
     * A terminal SodaOperation method always appears at the end of a method chain to execute the operation.
     *
     * A SodaOperation object is an internal object. You should not directly modify its properties.
     */
    interface SodaOperation {
        /**
         * This property sets the size of an internal buffer used for fetching documents from a collection
         * with the terminal SodaOperation methods getCursor() and getDocuments(). Changing size may affect
         * performance but does not affect how many documents are returned.
         *
         * If fetchArraySize() is not used, the size defaults to the current value of oracledb.fetchArraySize.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#sodaqbesearches
         * @since 5.0
         */
        fetchArraySize(size: number): SodaOperation;
        /**
         * Sets a filter specification for the operation, allowing for complex document queries and ordering
         * of JSON documents. Filter specifications can include comparisons, regular expressions, logical,
         * and spatial operators, among others.
         *
         * @param filterSpec
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#sodaqbesearches
         * @since 3.0
         */
        filter(filterSpec: Record<string, any>): SodaOperation;
        /**
         * The hint() value can be used to pass an Oracle hint to terminal SodaOperation Methods.
         * It is string in the same format as a SQL hint but without any comment characters, for example hint("MONITOR").
         * Pass only the hint "MONITOR" (turn on monitoring) or "NO_MONITOR" (turn off monitoring).
         * See the Oracle Database SQL Tuning Guide documentation MONITOR and NO_MONITOR Hints and Monitoring Database Operations for more information.
         */
        hint(value: string): SodaOperation;
        /**
         * Sets the key value to be used to match a document for the operation. Any previous calls made to this
         * method or keys() will be ignored.
         *
         * SODA document keys are unique.
         *
         * @param value The value to be set.
         *
         * @since 3.0
         */
        key(value: string): SodaOperation;
        /**
         * Sets the keys to be used to match multiple documents for the operation.
         * Any previous calls made to this method or key() will be ignored.
         *
         * SODA document keys are unique.
         *
         * A maximum of 1000 keys can be used.
         *
         * @param values An array of values to be set.
         *
         * @since 3.0
         */
        keys(values: string[]): SodaOperation;
        /**
         * Sets the maximum number of documents that a terminal method will apply to. The value of n must be
         * greater than 0. The limit is applied to documents that match the other SodaOperation criteria.
         * The limit() method only applies to SodaOperation read operations like getCursor() and getDocuments().
         * If a filter $orderby is not used, the document order is internally defined.
         *
         * The limit() method cannot be used in conjunction with count().
         *
         * @param limit Maximum number of documents that a terminal method will apply to.
         *
         * @since 3.0
         */
        limit(limit: number): SodaOperation;
        /**
         * Locks the documents fetched from the collection.
         *
         * Using lock() allows for pessimistic locking, that is, only the current user that performed the lock can modify the documents in the collection. Other users can only perform operations on these documents once they are unlocked. The functionality of this method is equivalent to the SELECT FOR UPDATE clause.
         *
         * The documents can be unlocked with an explicit call to commit() or rollback() on the connection. Ensure that the oracledb.autoCommit is set to false for the connection. Otherwise, the documents will be unlocked immediately after the operation is complete.
         *
         * This method should only be used with read operations (other than count()), and should not be used in conjunction with non-terminal methods skip() and limit().
         *
         * If this method is specified in conjunction with a write operation, then this method is ignored.
         *
         * This method requires Oracle Client 21.3 or later (or Oracle Client 19 from 19.11).
         * @since 6.2
         */
        lock(): SodaOperation;
        /**
         * Sets the number of documents that will be skipped before the terminal method is applied.
         * The value of n must be greater or equal to 0. The skip applies to documents that match the other
         * SodaOperation criteria.
         *
         * If a filter $orderby is not used, the document order (and hence which documents are skipped) is
         * internally defined.
         *
         * The skip() method only applies to SodaOperation read operations like getDocuments().
         * It cannot be used with count().
         *
         * @param skip The number of documents that will be skipped.
         *
         * @since 3.0
         */
        skip(skip: number): SodaOperation;
        /**
         * Sets the document version that documents must have.
         *
         * This is typically used in conjunction with a key, for example
         *
         *      collection.find().key("k").version("v").replaceOne(doc)
         *
         * Using version() allows for optimistic locking, so that the subsequent SodaOperation terminal method
         * does not affect a document that someone else has already modified.
         * If the requested document version is not matched, then your terminal operation will not impact any document.
         * The application can then query to find the latest document version and apply any desired change.
         *
         * @param version Version that documents must have.
         *
         * @since 3.0
         */
        version(version: string): SodaOperation;
        /**
         * Finds the number of documents matching the given SodaOperation query criteria.
         *
         * If skip() or limit() are set, then count() will return an error.
         *
         * If oracledb.autoCommit is true, and count() succeeds, then any open transaction on the
         * connection is committed.
         */
        count(): Promise<SodaCountResult>;
        count(callback: (error: DBError, result: SodaCountResult) => void): void;
        /**
         * Returns a SodaDocumentCursor for documents that match the SodaOperation query criteria.
         * The cursor can be iterated over with sodaDocumentCursor.getNext() to access each SodaDocument.
         *
         * When the application has completed using the cursor it must be closed with sodaDocumentCursor.close().
         *
         * If the number of documents is known to be small, it is recommended to use sodaOperation.getDocuments() instead.
         *
         * If oracledb.autoCommit is true, and getCursor() succeeds, then any open transaction on the connection is committed.
         *
         * @since 3.0
         */
        getCursor(): Promise<SodaDocumentCursor>;
        getCursor(callback: (error: DBError, cursor: SodaDocumentCursor) => void): void;
        /**
         * Gets an array of SodaDocuments matching the SodaOperation query criteria. An empty array will be
         * returned when no documents match.
         *
         * Where the number of matching documents is known to be small, this API should be used in preference
         * to sodaOperation.getCursor().
         *
         * If oracledb.autoCommit is true, and getDocuments() succeeds, then any open transaction on the
         * connection is committed.
         *
         * @since 3.0
         */
        getDocuments(): Promise<SodaDocument[]>;
        getDocuments(callback: (error: DBError, documents: SodaDocument[]) => void): void;
        /**
         * Obtains one document matching the SodaOperation query criteria. If the criteria match more
         * than one document, then only the first is returned.
         *
         * Typically getone() should be used with key(k) or key(k).version(v) to ensure only one document is matched.
         *
         * If oracledb.autoCommit is true, and getOne() succeeds, then any open transaction on the connection
         * is committed.
         *
         * @since 3.0
         */
        getOne(): Promise<SodaDocument | undefined>;
        getOne(callback: (error: DBError, document?: SodaDocument) => void): void;
        /**
         * Removes a set of documents matching the SodaOperation query criteria.
         *
         * Note settings from skip() and limit() non-terminals are ignored because they only apply to read operations.
         *
         * If oracledb.autoCommit is true, and remove() succeeds, then removal and any open transaction on the
         * connection is committed.
         *
         * @since 3.0
         */
        remove(): Promise<SodaRemoveResult>;
        remove(callback: (error: DBError, result: SodaRemoveResult) => void): void;
        /**
         * Replaces a document in a collection. The input document can be either a JavaScript object representing the
         * data content, or it can be an existing SodaDocument.
         *
         * The mediaType document component and content of the document that matches the SodaOperation query criteria
         * will be replaced by the content and any mediaType document component of the new document.
         * Any other document components will not be affected. The lastModified and version document components
         * of the replaced document will be updated.
         *
         * The key() non-terminal must be used when using replaceOne().
         *
         * No error is reported if the operation criteria do not match any document.
         *
         * Note settings from skip() and limit() non-terminals are ignored because they only apply to read operations.
         *
         * If oracledb.autoCommit is true, and replaceOne() succeeds, then any open transaction on the connection
         * is committed.
         *
         * @param newDocument New document to create.
         *
         * @since 3.0
         */
        replaceOne(newDocument: SodaDocument): Promise<SodaReplaceOneResult>;
        replaceOne(newDocument: SodaDocument, callback: (error: DBError, result: SodaReplaceOneResult) => void): void;
        /**
         * Replaces a document in a collection. The input document can be either a JavaScript object representing the
         * data content, or it can be an existing SodaDocument.
         *
         * The mediaType document component and content of the document that matches the SodaOperation query criteria
         * will be replaced by the content and any mediaType document component of the new document.
         * Any other document components will not be affected. The lastModified and version document components
         * of the replaced document will be updated.
         *
         * The key() non-terminal must be used when using replaceOne().
         *
         * No error is reported if the operation criteria do not match any document.
         *
         * Note settings from skip() and limit() non-terminals are ignored because they only apply to read operations.
         *
         * If oracledb.autoCommit is true, and replaceOne() succeeds, then any open transaction on the connection
         * is committed.
         *
         * @param newDocumentContent New document to create.
         *
         * @since 3.0
         */
        replaceOne(newDocumentContent: Record<string, any>): Promise<SodaReplaceOneResult>;
        replaceOne(
            newDocumentContent: Record<string, any>,
            callback: (error: DBError, result: SodaReplaceOneResult) => void,
        ): void;
        /**
         * Replaces a document in a collection. This is similar to replaceOne(), but also returns the result document,
         * which contains all SodaDocument components (key, version, etc.) except for content.
         * Content is not returned for performance reasons. The result document has new values for components that
         * are updated as part of the replace operation (such as version, last-modified timestamp, and media type)
         *
         * If oracledb.autoCommit is true, and replaceOneAndGet() succeeds, then any open transaction on the connection
         * is committed.
         *
         * @param newDocument New document to create.
         *
         * @since 3.0
         */
        replaceOneAndGet(newDocument: SodaDocument): Promise<SodaDocument | undefined>;
        replaceOneAndGet(newDocument: SodaDocument, callback: (error: DBError, document?: SodaDocument) => void): void;
        /**
         * Replaces a document in a collection. This is similar to replaceOne(), but also returns the result document,
         * which contains all SodaDocument components (key, version, etc.) except for content.
         * Content is not returned for performance reasons. The result document has new values for components that
         * are updated as part of the replace operation (such as version, last-modified timestamp, and media type)
         *
         * If oracledb.autoCommit is true, and replaceOneAndGet() succeeds, then any open transaction on the connection
         * is committed.
         *
         * @param newDocument New document to create.
         *
         * @since 3.0
         */
        replaceOneAndGet(newDocumentContent: Record<string, any>): Promise<SodaDocument>;
        replaceOneAndGet(
            newDocumentContent: Record<string, any>,
            callback: (error: DBError, document: SodaDocument) => void,
        ): void;
    }

    /**
     * Result of SODA operation.replaceOne();
     */
    interface SodaReplaceOneResult {
        /** This attribute will be true if the document was successfully replaced, false otherwise. */
        replaced: boolean;
    }

    /**
     * Result of SODA operation.remove();
     */
    interface SodaRemoveResult {
        /** The number of documents matching the SodaOperation criteria. */
        count: number;
    }

    /**
     * Result of SODA operation.count();
     */
    interface SodaCountResult {
        /** The number of documents matching the SodaOperation criteria. */
        count: number;
    }

    /**
     * Options which may be passed to SODA collection.dropIndex().
     */
    interface DropIndexOptions {
        /**
         * Setting force to true forces dropping of a JSON Search index or Spatial index if the
         * underlying Oracle Database domain index does not permit normal dropping.
         *
         * @see https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-F60F75DF-2866-4F93-BB7F-8FCE64BF67B6
         */
        force?: boolean | undefined;
    }

    /**
     * Returned from SODA collection.drop().
     */
    interface DropCollectionResult {
        /** If the drop operation succeeded, dropped will be true. If no collection was found, dropped will be false. */
        dropped: boolean;
    }

    /**
     * Structure to configure the properties of a B-Tree Index.
     *
     * @see https://docs.oracle.com/en/database/oracle/simple-oracle-document-access/adsdi/soda-index-specifications-reference.html#GUID-00C06941-6FFD-4CEB-81B6-9A7FBD577A2C
     */
    interface BTreeIndex {
        /** Name of the index. */
        name: string;
        /** Each object targets a field in the indexed documents that has a scalar JSON value. */
        fields: BTreeIndexField[];
        /**
         * Specifies whether or not the index is unique.
         *
         * @default false
         */
        unique?: boolean | undefined;
        /**
         * Specifies whether or not to index NULL values for the selected columns (by appending the numeric value 1 to the list of columns to index).
         *
         * @default false
         */
        indexNulls?: boolean | undefined;
    }

    /**
     * Used to configure fields when creating a B-Tree Index.
     */
    interface BTreeIndexField {
        /** Path to the targeted field, whose value is expected to be a scalar. */
        path: string;
        /** Name of the data type of the targeted-field value, for indexing purposes. */
        datatype?: string | undefined;
        /** Specifies the maximum length of the value to index. */
        maxlength?: number | undefined;
        /** Index sorting order, for datatype varchar2 (or one of its synonyms) or number. */
        order?: string | number | undefined;
    }

    /**
     * Structure to configure the properties of a Spatial Index.
     *
     * @see https://docs.oracle.com/en/database/oracle/simple-oracle-document-access/adsdi/soda-index-specifications-reference.html#GUID-00C06941-6FFD-4CEB-81B6-9A7FBD577A2C
     */
    interface SpatialIndex {
        /** Name of the index. */
        name: string;
        /** Specifies the path to the JSON field to be indexed. */
        spatial: string;
        /** Specifies that the targeted field must be present and have a GeoJSON geometry object as its value. */
        scalarRequired?: boolean | undefined;
        /** Specifies that the targeted field need not be present or have a GeoJSON geometry object as its value. */
        lax?: boolean | undefined;
    }

    /**
     * Structure to configure the properties of a Search Index.
     *
     * @see https://docs.oracle.com/en/database/oracle/simple-oracle-document-access/adsdi/soda-index-specifications-reference.html#GUID-00C06941-6FFD-4CEB-81B6-9A7FBD577A2C
     */
    interface SearchIndex {
        /** Name of the index. */
        name: string;
    }

    interface SodaCollectionOptions {
        /**
         * Metadata specifying various details about the collection, such as its database storage, whether it should
         * track version and time stamp document components, how such components are generated, and what document
         * types are.
         *
         * If undefined or null, then a default collection metadata description will be used. The default
         * metadata specifies that the collection contains only JSON documents, and is recommend for most SODA users.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#sodaclientkeys
         * @see https://www.oracle.com/pls/topic/lookup?ctx=dblatest&id=GUID-49EFF3D3-9FAB-4DA6-BDE2-2650383566A3
         */
        metaData?: SodaMetadata | undefined;
        /**
         * If mode is SODA_COLL_MAP_MODE, the collection will be stored in an externally,
         * previously created table. A future sodaCollection.drop() will not drop the collection table.
         * It will simply unmap it, making it inaccessible to SODA operations.
         *
         * Most users will leave mode undefined.
         */
        mode?: number | undefined;
    }

    /**
     * Metadata specifying various details about the collection, such as its database storage, whether it should
     * track version and time stamp document components, how such components are generated, and what document
     * types are.
     *
     * @see https://docs.oracle.com/en/database/oracle/simple-oracle-document-access/adsdi/soda-collection-metadata-components-reference.html#GUID-46E36926-7E6C-4561-A19F-01C09428C56D
     */
    interface SodaMetadata {
        /** Name of the Oracle Database schema that owns the table or view to which the collection is mapped. */
        schemaName?: string | undefined;
        /** Name of the table to which the collection is mapped. */
        tableName?: string | undefined;
        /** Name of the view to which the collection is mapped. */
        viewName?: string | undefined;
        /** Object containing information related to the key column. */
        keyColumn?: {
            /**
             * Name of the column that stores the document key.
             *
             * @default ID
             */
            name?: string | undefined;
            /**
             * SQL data type of the column that stores the document key.
             *
             * @default VARCHAR2
             */
            sqlType?: string | undefined;
            /**
             * Maximum length of the key column in bytes. This component applies only to keys of type VARCHAR2.
             *
             * @default 255
             */
            maxLength?: number | undefined;
            /**
             * Method used to assign keys to objects that are inserted into the collection.
             *
             * @default UUID
             */
            assignmentMethod?: string | undefined;
            /**
             * Name of the database sequence that generates keys for documents that are inserted into a collection if
             * the key assignment method is SEQUENCE.
             *
             * If you specify the key assignment method as SEQUENCE then you must also specify the name of that sequence.
             * If the specified sequence does not exist then SODA creates it.
             */
            sequenceName?: string | undefined;
        } | undefined;
        /** Object containing information related to the content column. */
        contentColumn?: {
            /**
             * Name of the column that stores the database content.
             *
             * @default JSON_DOCUMENT
             */
            name?: string | undefined;
            /**
             * SQL data type of the column that stores the document content.
             *
             * @default BLOB
             */
            sqlType?: string | undefined;
            /**
             * Maximum length of the content column in bytes. This component applies only to content of type VARCHAR2.
             *
             * @default 4000
             */
            maxLength?: number | undefined;
            /**
             * SecureFiles LOB compression setting.
             *
             * @default NONE
             */
            compress?: string | undefined;
            /**
             * SecureFiles LOB cache setting.
             *
             * @default true
             */
            cache?: boolean | undefined;
            /**
             * SecureFiles LOB encryption setting.
             *
             * Before you create a collection that uses SecureFiles LOB encryption you must set up an encryption wallet.
             *
             * @default NONE
             */
            encrypt?: string | undefined;
            /**
             * Syntax to which JavaScript Object Notation (JSON) content must conform—strict or lax.
             *
             * @default STANDARD
             */
            validation?: string | undefined;
        } | undefined;
        /** Object containing information related to the version column. */
        versionColumn?: {
            /**
             * Name of the column that stores the document version.
             *
             * @default VERSION
             */
            name?: string | undefined;
            /**
             * Method used to compute version values for objects when they are inserted into a collection or replaced.
             *
             * @default SHA256
             */
            method?: string | undefined;
        } | undefined;
        /** Object containing information related to the last modified column. */
        lastModifiedColumn?: {
            /**
             * Name of the column that stores the last-modified time stamp of the document.
             *
             * @default LAST_MODIFIED
             */
            name?: string | undefined;
            /**
             * Name of the index on the last-modified column.
             *
             * The value of this component is the name of a nonunique index on the last-modified time-stamp column.
             * The index is created if a name is specified. This index can improve the performance of read and write
             * operations that are driven by last-modified time stamps.
             *
             * Only SODA for REST provides such an operation (operation GET collection with time-stamp parameters since
             * and until). Other implementations do not use this component, since they do not provide any read or write
             * operations that are driven by last-modified time stamps. Even for SODA for REST, it is typically better
             * not to set this component if you are sure that your application does not use any read or write operations
             * that are driven by time stamps, because creating and maintaining an index carries a cost.
             */
            index?: string | undefined;
        } | undefined;
        /** Object containing information related to the creation time column. */
        creationTimeColumn?: {
            /**
             * Name of the column that stores the creation time stamp of the document. This time stamp is
             * generated during the insert, insertAndGet, save, or saveAndGet operation.
             *
             * @default CREATED_ON
             */
            name?: string | undefined;
        } | undefined;
        /** Object containing information related to the media type column. */
        mediaTypeColumn?: {
            /**
             * Name of the column that stores the media type of the document. A media type column is needed if
             * the collection is to be heterogeneous, that is, it can store documents other than
             * JavaScript Object Notation (JSON).
             */
            name?: string | undefined;
        } | undefined;
        /** Specifies whether or not the collection is read-only. */
        readOnly?: boolean | undefined;
    }

    /**
     * This method creates a pool of connections with the specified user name, password and connection string.
     * A pool is typically created once during application initialization.
     *
     * Internally, createPool() creates an Oracle Call Interface Session Pool for each Pool object.
     *
     * The default properties may be overridden by specifying new properties in the poolAttrs parameter.
     *
     * It is possible to add pools to the pool cache when calling createPool().
     * This allows pools to later be accessed by name, removing the need to pass the pool object through code.
     *
     * A pool should be terminated with the pool.close() call.
     *
     * From node-oracledb 3.1.0, the createPool() error callback will return a DPI-1047 error if node-oracledb cannot load Oracle Client libraries.
     * Previous versions threw this error from require('oracledb').
     *
     * @param poolAttributes Provides connection credentials and pool-specific configuration properties, overriding the defualt pooling properties of the Oracledb object.
     */
    function createPool(poolAttributes: PoolAttributes): Promise<Pool>;
    function createPool(poolAttributes: PoolAttributes, callback: (error: DBError, pool: Pool) => void): void;

    /**
     * Obtains a connection from a pool in the connection pool cache.
     *
     * For situations where connections are used infrequently, creating a standalone connection may be more efficient than creating and managing a connection pool.
     * However, in most cases, Oracle recommends getting connections from a connection pool.
     *
     * @param poolAlias Specifies which previously created pool in the connection pool cache to use to obtain the connection.
     */
    function getConnection(poolAlias: string): Promise<Connection>;
    function getConnection(poolAlias: string, callback: (error: DBError, connection: Connection) => void): void;

    /**
     * Obtains a connection from the default pool.
     *
     * For situations where connections are used infrequently, creating a standalone connection may be more efficient than creating and managing a connection pool.
     * However, in most cases, Oracle recommends getting connections from a connection pool.
     */
    function getConnection(): Promise<Connection>;
    function getConnection(callback: (error: DBError, connection: Connection) => void): void;

    /**
     * Creates a new, standalone, non-pooled connection.
     *
     * For situations where connections are used infrequently, creating a standalone connection may be more efficient than creating and managing a connection pool.
     * However, in most cases, Oracle recommends getting connections from a connection pool.
     *
     * @param connectionAttributes Connection credentials and connection-specific configuration properties.
     */
    function getConnection(connectionAttributes: ConnectionAttributes): Promise<Connection>;
    function getConnection(
        connectionAttributes: ConnectionAttributes,
        callback: (error: DBError, connection: Connection) => void,
    ): void;

    /**
     * A special object that contains properties which control the behavior of node-oracledb, allowing use of new features.
     *
     * @since 6.3
     */
    interface future {
        /**
         * This property is a boolean which when set to true while using Oracle Database 12c (or later), fetches VARCHAR2 and LOB columns that were created with the IS JSON constraint in the same way that columns of type JSON are fetched when using Oracle Database 21c (or later). The IS JSON constraint that is specified when creating VARCHAR2 and LOB columns ensures that only JSON data is stored in these columns.
         * The default value is false.
         * In a future version of node-oracledb, the setting of this attribute will no longer be required since this will be the default behavior.
         *
         * @since 6.3
         */
        oldJsonColumnAsObj?: boolean | undefined;
    }

    /**
     * Retrieves a previously created pool from the connection pool cache. Note that this is a synchronous method.
     *
     * @param poolAlias
     *
     * The pool alias of the pool to retrieve from the connection pool cache.
     *
     * @default default
     */
    function getPool(poolAlias?: string): Pool;

    interface InitialiseOptions {
        /**
         * This directory is added to the start of the default search path used by initOracleClient() to load the node-oracledb Thick mode binary module.
         * The default search path includes node_modules/oracledb/build/Release and node_modules/oracledb/build/Debug.
         * @since 6.2
         */
        binaryDir?: string | undefined;
        /**
         * This specifies the directory in which the Optional Oracle Net Configuration and Optional Oracle Client Configuration files reside. It is equivalent to setting the Oracle environment variable TNS_ADMIN to this value. Any value in that environment variable prior to the call to oracledb.initOracleClient() is ignored. If this attribute is not set, Oracle’s default configuration file search heuristics are used.
         */
        configDir?: string | undefined;
        /**
         * This specifies the driver name value shown in database views, such as V$SESSION_CONNECT_INFO. It can be used by applications to identify themselves for tracing and monitoring purposes. The convention is to separate the product name from the product version by a colon and single space characters. If this attribute is not specified, the value “node-oracledb : version” is used.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#otherinit
         */
        driverName?: string | undefined;
        /**
         * This specifies the URL that is included in the node-oracledb exception message if the Oracle Client libraries cannot be loaded. This allows applications that use node-oracledb to refer users to application-specific installation instructions. If this attribute is not specified, then the node-oracledb installation instructions URL is used.
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#otherinit
         */
        errorUrl?: string | undefined;
        /**
         * This specifies the directory containing the Oracle Client libraries. If libDir is not specified, the default library search mechanism is used. If your client libraries are in a full Oracle Client or Oracle Database installation, such as Oracle Database “XE” Express Edition, then you must have previously set environment variables like ORACLE_HOME before calling initOracleClient().
         *
         * @see https://oracle.github.io/node-oracledb/doc/api.html#oracleclientloading
         */
        libDir?: string | undefined;
    }

    /**
     * This synchronous function loads and initializes the Oracle Client libraries that are necessary
     * for node-oracledb to communicate with Oracle Database. This function is optional. If used, it
     * should be the first node-oracledb call made by an application.
     *
     * If initOracleClient() is not called, then the Oracle Client libraries are loaded at the time of
     * first use in the application, such as when creating a connection pool. The default values described
     * for options will be used in this case.
     *
     * If the Oracle Client libraries cannot be loaded, or they have already been initialized, either by a
     * previous call to this function or because another function call already required the Oracle Client libraries,
     * then initOracleClient() raises an exception.
     *
     * On Linux, ensure a libclntsh.so file exists. On macOS ensure a libclntsh.dylib file exists.
     * Node-oracledb will not directly load libclntsh.*.XX.1 files in libDir. Note other libraries used by libclntsh* are also required.
     *
     * On Linux, using libDir is only useful for forcing initOracleClient() to immediately load the Oracle Client libraries because
     * those libraries still need to be in the operating system search path, such as from running ldconfig or set in the environment
     * variable LD_LIBRARY_PATH.
     *
     * @see https://oracle.github.io/node-oracledb/doc/api.html#initnodeoracledb
     * @since 5.0
     */
    function initOracleClient(opts?: InitialiseOptions): void;

    /**
     * Registers extension modules. These registered modules will be called and executed during standalone and pooled connection creation.
     * The parameter of the registerProcessConfigurationHook() method is a user hook function that needs to be registered.
     * This hook function will be invoked when oracledb.getConnection() or oracledb.createPool() are called.
     * The user hook function is expected to return an accessToken that needs to be registered.
     *
     * @since 6.8
     */
    type HookFn = (opts: AccessTokenConfigAzure | AccessTokenConfigOCI) => void;
    function registerProcessConfigurationHook(fn: HookFn): void;

    type DBCredentials =
        | {
            user: string;
            password: string;
            connectionString: string;
            externalAuth?: boolean | undefined;
        }
        | {
            user: string;
            password: string;
            connectString: string;
            externalAuth?: boolean | undefined;
        };

    /**
     * This is the simplified form of connection.shutdown() used for shutting down a database instance. It accepts connection
     * credentials and shuts the database instance completely down.
     *
     * Internally it creates, and closes, a standalone connection using the oracledb.SYSOPER privilege.
     *
     * @see https://oracle.github.io/node-oracledb/doc/api.html#startupshutdown
     * @since 5.0
     */
    function shutdown(creds: DBCredentials, mode?: number): Promise<void>;
    function shutdown(creds: DBCredentials, mode: number, cb: (err: Error) => void): void;
    function shutdown(creds: DBCredentials, cb: (err: Error) => void): void;

    interface StartupOptions {
        /**
         * Shuts down a running database using oracledb.SHUTDOWN_MODE_ABORT before restarting the database. The database start up may require instance recovery. The default for force is false.
         *
         * @default false
         */
        force?: boolean | undefined;
        /**
         * After the database is started, access is restricted to users who have the CREATE_SESSION and RESTRICTED SESSION privileges. The default is false.
         *
         * @default false
         */
        restrict?: boolean | undefined;
        /**
         * The path and filename for a text file containing Oracle Database initialization parameters. If pfile is not set, then the database server-side parameter file is used.
         */
        pfile?: string | undefined;
    }

    /**
     * This is the simplified form of connection.startup() used for starting a database instance up.
     * It accepts connection credentials and starts the database instance completely.
     *
     * As part of the start up process, a standalone connection using the oracledb.SYSOPER privilege is internally created and closed.
     *
     * @see https://oracle.github.io/node-oracledb/doc/api.html#startupshutdown
     * @since 5.0
     */
    function startup(creds: DBCredentials, opts?: StartupOptions): Promise<void>;
    function startup(creds: DBCredentials, opts: StartupOptions, cb: (err: Error) => void): void;
    function startup(creds: DBCredentials, cb: (err: Error) => void): void;

    /**
     * Type representing the trace context object.
     *
     * @since 6.7.0
     */
    type TraceContext = Record<string, any>;

    /**
     * Base class for handling tracing.
     *
     * @since 6.7.0
     */
    class TraceHandlerBase {
        constructor();

        /**
         * Checks if sending traces is enabled.
         */
        isEnabled(): boolean;

        /**
         * Enables sending traces.
         */
        enable(): void;

        /**
         * Disables sending traces.
         */
        disable(): void;

        /**
         * Called before invoking a public async method.
         * @param traceContext  input/output trace context object.
         */
        onEnterFn(traceContext: TraceContext): void;

        /**
         * Called after invoking a public async method.
         * @param traceContext input/output trace context object.
         */
        onExitFn(traceContext: TraceContext): void;

        /**
         * Called when a round trip is begun.
         * @param traceContext input/output trace context object.
         */
        onBeginRoundTrip(traceContext: TraceContext): void;

        /**
         * Called when a round trip has ended.
         * @param traceContext input/output trace context object.
         */
        onEndRoundTrip(traceContext: TraceContext): void;
    }

    /*
     * Assigns a derived object that implements the hooks in the TraceHandlerBase class.
     * If no argument is provided, it clears the previously assigned instance.
     *
     * @since 6.7.0
     */
    function setTraceInstance(obj?: TraceHandlerBase): void;

    /*
     * Retrieves the derived object that implements the hooks in the TraceHandlerBase class.
     *
     * @since 6.7.0
     */
    function getTraceInstance(): TraceHandlerBase | undefined;

    /*
     * Verify if Tracing is enabled.
     *
     * @since 6.7.0
     */
    function isEnabled(): boolean | undefined;

    /**
     * traceHandler property containing the TraceHandlerBase class.
     *
     * @since 6.7.0
     */
    interface traceHandler {
        TraceHandlerBase: typeof TraceHandlerBase;
        setTraceInstance(obj?: TraceHandlerBase): void;
        getTraceInstance(): TraceHandlerBase | undefined;
        isEnabled(): boolean | undefined;
    }
    const traceHandler: traceHandler;

    /**
     * This property is a string that specifies the name of the driver used by the client to connect to Oracle Database.
     * This is equivalent to the value in the `CLIENT_DRIVER` column of the `V$SESSION_CONNECT_INFO` view.
     * This property may be overridden in the `oracledb.createPool()` call and when getting a standalone connection from `o`racledb.getConnection()`.
     * This property can only be used in the node-oracledb Thin mode.
     * @since 6.7.0
     * @see https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.driverName
     */
    let driverName: string | undefined;

    /**
     * This property is a string that specifies the name of the host machine where the connection originates.
     * This is equivalent to the value in the `MACHINE` column of the `V$SESSION` view.
     * This property may be overridden in the `oracledb.createPool()` call and when getting a standalone connection from `oracledb.getConnection()`.
     * This property can only be used in the node-oracledb Thin mode.
     *
     * @since 6.7.0
     * @see https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.machine
     */
    let machine: string | undefined;

    /**
     * This property is a string that specifies the name of the operating system user that initiates the database connection.
     * This is equivalent to the value in the `OSUSER` column of the `V$SESSION` view.
     * This property may be overridden in the `oracledb.createPool()` call and when getting a standalone connection from `oracledb.getConnection()`.
     * This property can only be used in the node-oracledb Thin mode.
     *
     * @since 6.7.0
     * @see https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.osUser
     */
    let osUser: string | undefined;

    /**
     * This property is a string that specifies the name of the program connecting to the database.
     * This is equivalent to the value in the `PROGRAM` column of the `V$SESSION` view.
     * This property may be overridden in the `oracledb.createPool()` call and when getting a standalone connection from `oracledb.getConnection()`.
     * This property can only be used in the node-oracledb Thin mode.
     *
     * @since 6.7.0
     * @see https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.program
     */
    let program: string | undefined;

    /**
     * This property is a string that specifies the name of the terminal from where the connection originates.
     * This is equivalent to the value in the `TERMINAL` column of the `V$SESSION` view.
     * This property may be overridden in the `oracledb.createPool()` call and when getting a standalone connection from `oracledb.getConnection()`.
     * This property can only be used in the node-oracledb Thin mode.
     *
     * @since 6.7.0
     * @see https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.terminal
     */
    let terminal: string | undefined;

    /**
     * Returns a list of TNS Aliases, also known as Network Service Names, defined in the `tnsnames.ora` file which is inside the directory that is specified in the `configDir` property or the `TNS_ADMIN` environment variable if `configDir` is not specified.
     * If a `tnsnames.ora` file does not exist, then an exception is raised.
     *
     * @since 6.7.0
     * @see https://node-oracledb.readthedocs.io/en/latest/api_manual/oracledb.html#oracledb.getNetworkServiceNames
     */
    function getNetworkServiceNames(configDir?: string): Promise<string[]>;
}

export = OracleDB;
