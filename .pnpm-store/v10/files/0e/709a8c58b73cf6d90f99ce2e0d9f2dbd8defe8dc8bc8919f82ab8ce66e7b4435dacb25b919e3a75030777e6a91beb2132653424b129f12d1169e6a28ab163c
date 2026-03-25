#include <stdint.h>
#include <sstream>
#include <cstring>
#include <string>
#include <sqlite3.h>

#include "macros.h"
#include "database.h"
#include "statement.h"
#include "backup.h"

using namespace node_sqlite3;

namespace {

Napi::Object RegisterModule(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);

    Database::Init(env, exports);
    Statement::Init(env, exports);
    Backup::Init(env, exports);

    exports.DefineProperties({
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_OPEN_READONLY, OPEN_READONLY)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_OPEN_READWRITE, OPEN_READWRITE)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_OPEN_CREATE, OPEN_CREATE)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_OPEN_FULLMUTEX, OPEN_FULLMUTEX)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_OPEN_URI, OPEN_URI)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_OPEN_SHAREDCACHE, OPEN_SHAREDCACHE)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_OPEN_PRIVATECACHE, OPEN_PRIVATECACHE)
        DEFINE_CONSTANT_STRING(exports, SQLITE_VERSION, VERSION)
#ifdef SQLITE_SOURCE_ID
        DEFINE_CONSTANT_STRING(exports, SQLITE_SOURCE_ID, SOURCE_ID)
#endif
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_VERSION_NUMBER, VERSION_NUMBER)

        DEFINE_CONSTANT_INTEGER(exports, SQLITE_OK, OK)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_ERROR, ERROR)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_INTERNAL, INTERNAL)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_PERM, PERM)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_ABORT, ABORT)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_BUSY, BUSY)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_LOCKED, LOCKED)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_NOMEM, NOMEM)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_READONLY, READONLY)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_INTERRUPT, INTERRUPT)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_IOERR, IOERR)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_CORRUPT, CORRUPT)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_NOTFOUND, NOTFOUND)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_FULL, FULL)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_CANTOPEN, CANTOPEN)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_PROTOCOL, PROTOCOL)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_EMPTY, EMPTY)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_SCHEMA, SCHEMA)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_TOOBIG, TOOBIG)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_CONSTRAINT, CONSTRAINT)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_MISMATCH, MISMATCH)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_MISUSE, MISUSE)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_NOLFS, NOLFS)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_AUTH, AUTH)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_FORMAT, FORMAT)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_RANGE, RANGE)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_NOTADB, NOTADB)

        DEFINE_CONSTANT_INTEGER(exports, SQLITE_LIMIT_LENGTH, LIMIT_LENGTH)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_LIMIT_SQL_LENGTH, LIMIT_SQL_LENGTH)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_LIMIT_COLUMN, LIMIT_COLUMN)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_LIMIT_EXPR_DEPTH, LIMIT_EXPR_DEPTH)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_LIMIT_COMPOUND_SELECT, LIMIT_COMPOUND_SELECT)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_LIMIT_VDBE_OP, LIMIT_VDBE_OP)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_LIMIT_FUNCTION_ARG, LIMIT_FUNCTION_ARG)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_LIMIT_ATTACHED, LIMIT_ATTACHED)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_LIMIT_LIKE_PATTERN_LENGTH, LIMIT_LIKE_PATTERN_LENGTH)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_LIMIT_VARIABLE_NUMBER, LIMIT_VARIABLE_NUMBER)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_LIMIT_TRIGGER_DEPTH, LIMIT_TRIGGER_DEPTH)
        DEFINE_CONSTANT_INTEGER(exports, SQLITE_LIMIT_WORKER_THREADS, LIMIT_WORKER_THREADS)
    });

    return exports;
}

}

const char* sqlite_code_string(int code) {
    switch (code) {
        case SQLITE_OK:         return "SQLITE_OK";
        case SQLITE_ERROR:      return "SQLITE_ERROR";
        case SQLITE_INTERNAL:   return "SQLITE_INTERNAL";
        case SQLITE_PERM:       return "SQLITE_PERM";
        case SQLITE_ABORT:      return "SQLITE_ABORT";
        case SQLITE_BUSY:       return "SQLITE_BUSY";
        case SQLITE_LOCKED:     return "SQLITE_LOCKED";
        case SQLITE_NOMEM:      return "SQLITE_NOMEM";
        case SQLITE_READONLY:   return "SQLITE_READONLY";
        case SQLITE_INTERRUPT:  return "SQLITE_INTERRUPT";
        case SQLITE_IOERR:      return "SQLITE_IOERR";
        case SQLITE_CORRUPT:    return "SQLITE_CORRUPT";
        case SQLITE_NOTFOUND:   return "SQLITE_NOTFOUND";
        case SQLITE_FULL:       return "SQLITE_FULL";
        case SQLITE_CANTOPEN:   return "SQLITE_CANTOPEN";
        case SQLITE_PROTOCOL:   return "SQLITE_PROTOCOL";
        case SQLITE_EMPTY:      return "SQLITE_EMPTY";
        case SQLITE_SCHEMA:     return "SQLITE_SCHEMA";
        case SQLITE_TOOBIG:     return "SQLITE_TOOBIG";
        case SQLITE_CONSTRAINT: return "SQLITE_CONSTRAINT";
        case SQLITE_MISMATCH:   return "SQLITE_MISMATCH";
        case SQLITE_MISUSE:     return "SQLITE_MISUSE";
        case SQLITE_NOLFS:      return "SQLITE_NOLFS";
        case SQLITE_AUTH:       return "SQLITE_AUTH";
        case SQLITE_FORMAT:     return "SQLITE_FORMAT";
        case SQLITE_RANGE:      return "SQLITE_RANGE";
        case SQLITE_NOTADB:     return "SQLITE_NOTADB";
        case SQLITE_ROW:        return "SQLITE_ROW";
        case SQLITE_DONE:       return "SQLITE_DONE";
        default:                return "UNKNOWN";
    }
}

const char* sqlite_authorizer_string(int type) {
    switch (type) {
        case SQLITE_INSERT:     return "insert";
        case SQLITE_UPDATE:     return "update";
        case SQLITE_DELETE:     return "delete";
        default:                return "";
    }
}

NODE_API_MODULE(node_sqlite3, RegisterModule)
