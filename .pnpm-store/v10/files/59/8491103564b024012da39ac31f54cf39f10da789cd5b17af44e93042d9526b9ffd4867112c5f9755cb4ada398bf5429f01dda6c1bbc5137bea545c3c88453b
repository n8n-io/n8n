
#ifndef NODE_SQLITE3_SRC_DATABASE_H
#define NODE_SQLITE3_SRC_DATABASE_H


#include <assert.h>
#include <string>
#include <queue>

#include <sqlite3.h>
#include <napi.h>

#include "async.h"

using namespace Napi;

namespace node_sqlite3 {

class Database;


class Database : public Napi::ObjectWrap<Database> {
public:
#if NAPI_VERSION < 6
    static Napi::FunctionReference constructor;
#endif
    static Napi::Object Init(Napi::Env env, Napi::Object exports);

    static inline bool HasInstance(Napi::Value val) {
        auto env = val.Env();
        Napi::HandleScope scope(env);
        if (!val.IsObject()) return false;
        auto obj = val.As<Napi::Object>();
#if NAPI_VERSION < 6
        return obj.InstanceOf(constructor.Value());
#else
        auto constructor =
            env.GetInstanceData<Napi::FunctionReference>();
        return obj.InstanceOf(constructor->Value());
#endif
    }

    struct Baton {
        napi_async_work request = NULL;
        Database* db;
        Napi::FunctionReference callback;
        int status;
        std::string message;

        Baton(Database* db_, Napi::Function cb_) :
                db(db_), status(SQLITE_OK) {
            db->Ref();
            if (!cb_.IsUndefined() && cb_.IsFunction()) {
                callback.Reset(cb_, 1);
            }
        }
        virtual ~Baton() {
            if (request) napi_delete_async_work(db->Env(), request);
            db->Unref();
            callback.Reset();
        }
    };

    struct OpenBaton : Baton {
        std::string filename;
        int mode;
        OpenBaton(Database* db_, Napi::Function cb_, const char* filename_, int mode_) :
            Baton(db_, cb_), filename(filename_), mode(mode_) {}
        virtual ~OpenBaton() override = default;
    };

    struct ExecBaton : Baton {
        std::string sql;
        ExecBaton(Database* db_, Napi::Function cb_, const char* sql_) :
            Baton(db_, cb_), sql(sql_) {}
        virtual ~ExecBaton() override = default;
    };

    struct LoadExtensionBaton : Baton {
        std::string filename;
        LoadExtensionBaton(Database* db_, Napi::Function cb_, const char* filename_) :
            Baton(db_, cb_), filename(filename_) {}
        virtual ~LoadExtensionBaton() override = default;
    };

    struct LimitBaton : Baton {
        int id;
        int value;
        LimitBaton(Database* db_, Napi::Function cb_, int id_, int value_) :
            Baton(db_, cb_), id(id_), value(value_) {}
        virtual ~LimitBaton() override = default;
    };

    typedef void (*Work_Callback)(Baton* baton);

    struct Call {
        Call(Work_Callback cb_, Baton* baton_, bool exclusive_ = false) :
            callback(cb_), exclusive(exclusive_), baton(baton_) {};
        Work_Callback callback;
        bool exclusive;
        Baton* baton;
    };

    struct ProfileInfo {
        std::string sql;
        sqlite3_int64 nsecs;
    };

    struct UpdateInfo {
        int type;
        std::string database;
        std::string table;
        sqlite3_int64 rowid;
    };

    bool IsOpen() { return open; }
    bool IsLocked() { return locked; }

    typedef Async<std::string, Database> AsyncTrace;
    typedef Async<ProfileInfo, Database> AsyncProfile;
    typedef Async<UpdateInfo, Database> AsyncUpdate;

    friend class Statement;
    friend class Backup;

    Database(const Napi::CallbackInfo& info);

    ~Database() {
        RemoveCallbacks();
        sqlite3_close(_handle);
        _handle = NULL;
        open = false;
    }

protected:
    WORK_DEFINITION(Open);
    WORK_DEFINITION(Exec);
    WORK_DEFINITION(Close);
    WORK_DEFINITION(LoadExtension);

    void Schedule(Work_Callback callback, Baton* baton, bool exclusive = false);
    void Process();

    Napi::Value Wait(const Napi::CallbackInfo& info);
    static void Work_Wait(Baton* baton);

    Napi::Value Serialize(const Napi::CallbackInfo& info);
    Napi::Value Parallelize(const Napi::CallbackInfo& info);
    Napi::Value Configure(const Napi::CallbackInfo& info);
    Napi::Value Interrupt(const Napi::CallbackInfo& info);

    static void SetBusyTimeout(Baton* baton);
    static void SetLimit(Baton* baton);

    static void RegisterTraceCallback(Baton* baton);
    static void TraceCallback(void* db, const char* sql);
    static void TraceCallback(Database* db, std::string* sql);

    static void RegisterProfileCallback(Baton* baton);
    static void ProfileCallback(void* db, const char* sql, sqlite3_uint64 nsecs);
    static void ProfileCallback(Database* db, ProfileInfo* info);

    static void RegisterUpdateCallback(Baton* baton);
    static void UpdateCallback(void* db, int type, const char* database, const char* table, sqlite3_int64 rowid);
    static void UpdateCallback(Database* db, UpdateInfo* info);

    void RemoveCallbacks();

protected:
    sqlite3* _handle = NULL;

    bool open = false;
    bool closing = false;
    bool locked = false;
    unsigned int pending = 0;

    bool serialize = false;

    std::queue<Call*> queue;

    AsyncTrace* debug_trace = NULL;
    AsyncProfile* debug_profile = NULL;
    AsyncUpdate* update_event = NULL;
};

}

#endif
