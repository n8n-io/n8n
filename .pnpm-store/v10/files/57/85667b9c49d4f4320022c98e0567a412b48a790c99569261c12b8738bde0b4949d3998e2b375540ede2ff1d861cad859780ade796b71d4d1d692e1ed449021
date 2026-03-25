#ifndef NODE_SQLITE3_SRC_BACKUP_H
#define NODE_SQLITE3_SRC_BACKUP_H

#include "database.h"

#include <string>
#include <queue>
#include <set>

#include <sqlite3.h>
#include <napi.h>

using namespace Napi;

namespace node_sqlite3 {

/**
 *
 * A class for managing an sqlite3_backup object.  For consistency
 * with other node-sqlite3 classes, it maintains an internal queue
 * of calls.
 *
 * Intended usage from node:
 *
 *   var db = new sqlite3.Database('live.db');
 *   var backup = db.backup('backup.db');
 *   ...
 *   // in event loop, move backup forward when we have time.
 *   if (backup.idle) { backup.step(NPAGES); }
 *   if (backup.completed) { ... success ... }
 *   if (backup.failed)    { ... sadness ... }
 *   // do other work in event loop - fine to modify live.db
 *   ...
 *
 * Here is how sqlite's backup api is exposed:
 *
 *   - `sqlite3_backup_init`: This is implemented as
 *     `db.backup(filename, [callback])` or
 *     `db.backup(filename, destDbName, sourceDbName, filenameIsDest, [callback])`.
 *   - `sqlite3_backup_step`: `backup.step(pages, [callback])`.
 *   - `sqlite3_backup_finish`: `backup.finish([callback])`.
 *   - `sqlite3_backup_remaining`: `backup.remaining`.
 *   - `sqlite3_backup_pagecount`: `backup.pageCount`.
 *
 * There are the following read-only properties:
 *
 *   - `backup.completed` is set to `true` when the backup
 *     succeeeds.
 *   - `backup.failed` is set to `true` when the backup
 *     has a fatal error.
 *   - `backup.idle` is set to `true` when no operation
 *     is currently in progress or queued for the backup.
 *   - `backup.remaining` is an integer with the remaining
 *     number of pages after the last call to `backup.step`
 *     (-1 if `step` not yet called).
 *   - `backup.pageCount` is an integer with the total number
 *     of pages measured during the last call to `backup.step`
 *     (-1 if `step` not yet called).
 *
 * There is the following writable property:
 *
 *   - `backup.retryErrors`: an array of sqlite3 error codes
 *     that are treated as non-fatal - meaning, if they occur,
 *     backup.failed is not set, and the backup may continue.
 *     By default, this is `[sqlite3.BUSY, sqlite3.LOCKED]`.
 *
 * The `db.backup(filename, [callback])` shorthand is sufficient
 * for making a backup of a database opened by node-sqlite3.  If
 * using attached or temporary databases, or moving data in the
 * opposite direction, the more complete (but daunting)
 * `db.backup(filename, destDbName, sourceDbName, filenameIsDest, [callback])`
 * signature is provided.
 *
 * A backup will finish automatically when it succeeds or a fatal
 * error occurs, meaning it is not necessary to call `db.finish()`.
 * By default, SQLITE_LOCKED and SQLITE_BUSY errors are not
 * treated as failures, and the backup will continue if they
 * occur.  The set of errors that are tolerated can be controlled
 * by setting `backup.retryErrors`. To disable automatic
 * finishing and stick strictly to sqlite's raw api, set
 * `backup.retryErrors` to `[]`.  In that case, it is necessary
 * to call `backup.finish()`.
 *
 * In the same way as node-sqlite3 databases and statements,
 * backup methods can be called safely without callbacks, due
 * to an internal call queue.  So for example this naive code
 * will correctly back up a db, if there are no errors:
 *
 *   var backup = db.backup('backup.db');
 *   backup.step(-1);
 *   backup.finish();
 *
 */
class Backup : public Napi::ObjectWrap<Backup> {
public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);

    struct Baton {
        napi_async_work request = NULL;
        Backup* backup;
        Napi::FunctionReference callback;

        Baton(Backup* backup_, Napi::Function cb_) : backup(backup_) {
            backup->Ref();
            callback.Reset(cb_, 1);
        }
        virtual ~Baton() {
            if (request) napi_delete_async_work(backup->Env(), request);
            backup->Unref();
            callback.Reset();
        }
    };

    struct InitializeBaton : Database::Baton {
        Backup* backup;
        std::string filename;
        std::string sourceName;
        std::string destName;
        bool filenameIsDest;
        InitializeBaton(Database* db_, Napi::Function cb_, Backup* backup_) :
            Baton(db_, cb_), backup(backup_), filenameIsDest(true) {
            backup->Ref();
        }
        virtual ~InitializeBaton() override {
            backup->Unref();
            if (!db->IsOpen() && db->IsLocked()) {
                // The database handle was closed before the backup could be opened.
                backup->FinishAll();
            }
        }
    };

    struct StepBaton : Baton {
        int pages;
        std::set<int> retryErrorsSet;
        StepBaton(Backup* backup_, Napi::Function cb_, int pages_) :
            Baton(backup_, cb_), pages(pages_) {}
        virtual ~StepBaton() override = default;
    };

    typedef void (*Work_Callback)(Baton* baton);

    struct Call {
        Call(Work_Callback cb_, Baton* baton_) : callback(cb_), baton(baton_) {};
        Work_Callback callback;
        Baton* baton;
    };

    Backup(const Napi::CallbackInfo& info);

    ~Backup() {
        if (!finished) {
            FinishAll();
        }
        retryErrors.Reset();
    }

    WORK_DEFINITION(Step)
    WORK_DEFINITION(Finish)

    Napi::Value IdleGetter(const Napi::CallbackInfo& info);
    Napi::Value CompletedGetter(const Napi::CallbackInfo& info);
    Napi::Value FailedGetter(const Napi::CallbackInfo& info);
    Napi::Value PageCountGetter(const Napi::CallbackInfo& info);
    Napi::Value RemainingGetter(const Napi::CallbackInfo& info);
    Napi::Value FatalErrorGetter(const Napi::CallbackInfo& info);
    Napi::Value RetryErrorGetter(const Napi::CallbackInfo& info);

    void FatalErrorSetter(const Napi::CallbackInfo& info, const Napi::Value& value);
    void RetryErrorSetter(const Napi::CallbackInfo& info, const Napi::Value& value);

protected:
    static void Work_BeginInitialize(Database::Baton* baton);
    static void Work_Initialize(napi_env env, void* data);
    static void Work_AfterInitialize(napi_env env, napi_status status, void* data);

    void Schedule(Work_Callback callback, Baton* baton);
    void Process();
    void CleanQueue();
    template <class T> static void Error(T* baton);

    void FinishAll();
    void FinishSqlite();
    void GetRetryErrors(std::set<int>& retryErrorsSet);

    Database* db;

    sqlite3_backup* _handle = NULL;
    sqlite3* _otherDb = NULL;
    sqlite3* _destDb = NULL;

    bool inited = false;
    bool locked = true;
    bool completed = false;
    bool failed = false;
    int remaining = -1;
    int pageCount = -1;
    bool finished = false;

    int status;
    std::string message;
    std::queue<std::unique_ptr<Call>> queue;

    Napi::Reference<Array> retryErrors;
};

}

#endif
