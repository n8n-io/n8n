#include <cstring>
#include <napi.h>

#include "macros.h"
#include "database.h"
#include "statement.h"

using namespace node_sqlite3;

#if NAPI_VERSION < 6
Napi::FunctionReference Database::constructor;
#endif

Napi::Object Database::Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);
    // declare napi_default_method here as it is only available in Node v14.12.0+
    auto napi_default_method = static_cast<napi_property_attributes>(napi_writable | napi_configurable); 

    auto t = DefineClass(env, "Database", {
        InstanceMethod("close", &Database::Close, napi_default_method),
        InstanceMethod("exec", &Database::Exec, napi_default_method),
        InstanceMethod("wait", &Database::Wait, napi_default_method),
        InstanceMethod("loadExtension", &Database::LoadExtension, napi_default_method),
        InstanceMethod("serialize", &Database::Serialize, napi_default_method),
        InstanceMethod("parallelize", &Database::Parallelize, napi_default_method),
        InstanceMethod("configure", &Database::Configure, napi_default_method),
        InstanceMethod("interrupt", &Database::Interrupt, napi_default_method),
        InstanceAccessor("open", &Database::Open, nullptr)
    });

#if NAPI_VERSION < 6
    constructor = Napi::Persistent(t);
    constructor.SuppressDestruct();
#else
    Napi::FunctionReference* constructor = new Napi::FunctionReference();
    *constructor = Napi::Persistent(t);
    env.SetInstanceData<Napi::FunctionReference>(constructor);
#endif

    exports.Set("Database", t);
    return exports;
}

void Database::Process() {
    auto env = this->Env();
    Napi::HandleScope scope(env);

    if (!open && locked && !queue.empty()) {
        EXCEPTION(Napi::String::New(env, "Database handle is closed"), SQLITE_MISUSE, exception);
        Napi::Value argv[] = { exception };
        bool called = false;

        // Call all callbacks with the error object.
        while (!queue.empty()) {
            auto call = std::unique_ptr<Call>(queue.front());
            queue.pop();
            auto baton = std::unique_ptr<Baton>(call->baton);
            Napi::Function cb = baton->callback.Value();
            if (IS_FUNCTION(cb)) {
                TRY_CATCH_CALL(this->Value(), cb, 1, argv);
                called = true;
            }
        }

        // When we couldn't call a callback function, emit an error on the
        // Database object.
        if (!called) {
            Napi::Value info[] = { Napi::String::New(env, "error"), exception };
            EMIT_EVENT(Value(), 2, info);
        }
        return;
    }

    while (open && (!locked || pending == 0) && !queue.empty()) {
        Call *c = queue.front();

        if (c->exclusive && pending > 0) {
            break;
        }

        queue.pop();
        std::unique_ptr<Call> call(c);
        locked = call->exclusive;
        call->callback(call->baton);

        if (locked) break;
    }
}

void Database::Schedule(Work_Callback callback, Baton* baton, bool exclusive) {
    auto env = this->Env();
    Napi::HandleScope scope(env);

    if (!open && locked) {
        EXCEPTION(Napi::String::New(env, "Database is closed"), SQLITE_MISUSE, exception);
        Napi::Function cb = baton->callback.Value();
        // We don't call the actual callback, so we have to make sure that
        // the baton gets destroyed.
        delete baton;
        if (IS_FUNCTION(cb)) {
            Napi::Value argv[] = { exception };
            TRY_CATCH_CALL(Value(), cb, 1, argv);
        }
        else {
            Napi::Value argv[] = { Napi::String::New(env, "error"), exception };
            EMIT_EVENT(Value(), 2, argv);
        }
        return;
    }

    if (!open || ((locked || exclusive || serialize) && pending > 0)) {
        queue.emplace(new Call(callback, baton, exclusive || serialize));
    }
    else {
        locked = exclusive;
        callback(baton);
    }
}

Database::Database(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Database>(info) {
    auto env = info.Env();

    if (info.Length() <= 0 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected").ThrowAsJavaScriptException();
        return;
    }
    auto filename = info[0].As<Napi::String>().Utf8Value();

    unsigned int pos = 1;

    int mode;
    if (info.Length() >= pos && info[pos].IsNumber() && OtherIsInt(info[pos].As<Napi::Number>())) {
        mode = info[pos++].As<Napi::Number>().Int32Value();
    }
    else {
        mode = SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX;
    }

    Napi::Function callback;
    if (info.Length() >= pos && info[pos].IsFunction()) {
        callback = info[pos++].As<Napi::Function>();
    }

    info.This().As<Napi::Object>().DefineProperty(Napi::PropertyDescriptor::Value("filename", info[0].As<Napi::String>(), napi_default));
    info.This().As<Napi::Object>().DefineProperty(Napi::PropertyDescriptor::Value("mode", Napi::Number::New(env, mode), napi_default));

    // Start opening the database.
    auto* baton = new OpenBaton(this, callback, filename.c_str(), mode);
    Work_BeginOpen(baton);
}

void Database::Work_BeginOpen(Baton* baton) {
    auto env = baton->db->Env();
    CREATE_WORK("sqlite3.Database.Open", Work_Open, Work_AfterOpen);
}

void Database::Work_Open(napi_env e, void* data) {
    auto* baton = static_cast<OpenBaton*>(data);
    auto* db = baton->db;

    baton->status = sqlite3_open_v2(
        baton->filename.c_str(),
        &db->_handle,
        baton->mode,
        NULL
    );

    if (baton->status != SQLITE_OK) {
        baton->message = std::string(sqlite3_errmsg(db->_handle));
        sqlite3_close(db->_handle);
        db->_handle = NULL;
    }
    else {
        // Set default database handle values.
        sqlite3_busy_timeout(db->_handle, 1000);
    }
}

void Database::Work_AfterOpen(napi_env e, napi_status status, void* data) {
    std::unique_ptr<OpenBaton> baton(static_cast<OpenBaton*>(data));

    auto* db = baton->db;

    auto env = db->Env();
    Napi::HandleScope scope(env);

    Napi::Value argv[1];
    if (baton->status != SQLITE_OK) {
        EXCEPTION(Napi::String::New(env, baton->message.c_str()), baton->status, exception);
        argv[0] = exception;
    }
    else {
        db->open = true;
        argv[0] = env.Null();
    }

    Napi::Function cb = baton->callback.Value();

    if (IS_FUNCTION(cb)) {
        TRY_CATCH_CALL(db->Value(), cb, 1, argv);
    }
    else if (!db->open) {
        Napi::Value info[] = { Napi::String::New(env, "error"), argv[0] };
        EMIT_EVENT(db->Value(), 2, info);
    }

    if (db->open) {
        Napi::Value info[] = { Napi::String::New(env, "open") };
        EMIT_EVENT(db->Value(), 1, info);
        db->Process();
    }
}

Napi::Value Database::Open(const Napi::CallbackInfo& info) {
    auto env = this->Env();
    auto* db = this;
    return Napi::Boolean::New(env, db->open);
}

Napi::Value Database::Close(const Napi::CallbackInfo& info) {
    auto env = info.Env();
    auto* db = this;
    OPTIONAL_ARGUMENT_FUNCTION(0, callback);

   auto* baton = new Baton(db, callback);
    db->Schedule(Work_BeginClose, baton, true);

    return info.This();
}

void Database::Work_BeginClose(Baton* baton) {
    assert(baton->db->locked);
    assert(baton->db->open);
    assert(baton->db->_handle);
    assert(baton->db->pending == 0);

    baton->db->pending++;
    baton->db->RemoveCallbacks();
    baton->db->closing = true;

    auto env = baton->db->Env();
    CREATE_WORK("sqlite3.Database.Close", Work_Close, Work_AfterClose);
}

void Database::Work_Close(napi_env e, void* data) {
    auto* baton = static_cast<Baton*>(data);
    auto* db = baton->db;

    baton->status = sqlite3_close(db->_handle);

    if (baton->status != SQLITE_OK) {
        baton->message = std::string(sqlite3_errmsg(db->_handle));
    }
    else {
        db->_handle = NULL;
    }
}

void Database::Work_AfterClose(napi_env e, napi_status status, void* data) {
    std::unique_ptr<Baton> baton(static_cast<Baton*>(data));

    auto* db = baton->db;

    auto env = db->Env();
    Napi::HandleScope scope(env);

    db->pending--;
    db->closing = false;

    Napi::Value argv[1];
    if (baton->status != SQLITE_OK) {
        EXCEPTION(Napi::String::New(env, baton->message.c_str()), baton->status, exception);
        argv[0] = exception;
    }
    else {
        db->open = false;
        // Leave db->locked to indicate that this db object has reached
        // the end of its life.
        argv[0] = env.Null();
    }

    Napi::Function cb = baton->callback.Value();

    // Fire callbacks.
    if (IS_FUNCTION(cb)) {
        TRY_CATCH_CALL(db->Value(), cb, 1, argv);
    }
    else if (db->open) {
        Napi::Value info[] = { Napi::String::New(env, "error"), argv[0] };
        EMIT_EVENT(db->Value(), 2, info);
    }

    if (!db->open) {
        Napi::Value info[] = { Napi::String::New(env, "close") };
        EMIT_EVENT(db->Value(), 1, info);
        db->Process();
    }
}

Napi::Value Database::Serialize(const Napi::CallbackInfo& info) {
    auto env = this->Env();
    auto* db = this;
    OPTIONAL_ARGUMENT_FUNCTION(0, callback);

    bool before = db->serialize;
    db->serialize = true;

    if (!callback.IsEmpty() && callback.IsFunction()) {
        TRY_CATCH_CALL(info.This(), callback, 0, NULL, info.This());
        db->serialize = before;
    }

    db->Process();

    return info.This();
}

Napi::Value Database::Parallelize(const Napi::CallbackInfo& info) {
    auto env = this->Env();
    auto* db = this;
    OPTIONAL_ARGUMENT_FUNCTION(0, callback);

    auto before = db->serialize;
    db->serialize = false;

    if (!callback.IsEmpty() && callback.IsFunction()) {
        TRY_CATCH_CALL(info.This(), callback, 0, NULL, info.This());
        db->serialize = before;
    }

    db->Process();

    return info.This();
}

Napi::Value Database::Configure(const Napi::CallbackInfo& info) {
    auto env = this->Env();
    auto* db = this;

    REQUIRE_ARGUMENTS(2);

    Napi::Function handle;
    if (info[0].StrictEquals( Napi::String::New(env, "trace"))) {    
       auto* baton = new Baton(db, handle);
        db->Schedule(RegisterTraceCallback, baton);
    }
    else if (info[0].StrictEquals( Napi::String::New(env, "profile"))) {
       auto* baton = new Baton(db, handle);
        db->Schedule(RegisterProfileCallback, baton);
    }
    else if (info[0].StrictEquals( Napi::String::New(env, "busyTimeout"))) {
        if (!info[1].IsNumber()) {
            Napi::TypeError::New(env, "Value must be an integer").ThrowAsJavaScriptException();
            return env.Null();
        }
       auto* baton = new Baton(db, handle);
        baton->status = info[1].As<Napi::Number>().Int32Value();
        db->Schedule(SetBusyTimeout, baton);
    }
    else if (info[0].StrictEquals( Napi::String::New(env, "limit"))) {
        REQUIRE_ARGUMENTS(3);
        if (!info[1].IsNumber()) {
            Napi::TypeError::New(env, "limit id must be an integer").ThrowAsJavaScriptException();
            return env.Null();
        }
        if (!info[2].IsNumber()) {
            Napi::TypeError::New(env, "limit value must be an integer").ThrowAsJavaScriptException();
            return env.Null();
        }
        int id = info[1].As<Napi::Number>().Int32Value();
        int value = info[2].As<Napi::Number>().Int32Value();
        Baton* baton = new LimitBaton(db, handle, id, value);
        db->Schedule(SetLimit, baton);
    }
    else if (info[0].StrictEquals(Napi::String::New(env, "change"))) {
       auto* baton = new Baton(db, handle);
        db->Schedule(RegisterUpdateCallback, baton);
    }
    else {
        Napi::TypeError::New(env, (StringConcat(
#if V8_MAJOR_VERSION > 6
            info.GetIsolate(),
#endif
            info[0].As<Napi::String>(),
            Napi::String::New(env, " is not a valid configuration option")
        )).Utf8Value().c_str()).ThrowAsJavaScriptException();
        return env.Null();
    }

    db->Process();

    return info.This();
}

Napi::Value Database::Interrupt(const Napi::CallbackInfo& info) {
    auto env = this->Env();
    auto* db = this;

    if (!db->open) {
        Napi::Error::New(env, "Database is not open").ThrowAsJavaScriptException();
        return env.Null();
    }

    if (db->closing) {
        Napi::Error::New(env, "Database is closing").ThrowAsJavaScriptException();
        return env.Null();
    }

    sqlite3_interrupt(db->_handle);
    return info.This();
}

void Database::SetBusyTimeout(Baton* b) {
    auto baton = std::unique_ptr<Baton>(b);

    assert(baton->db->open);
    assert(baton->db->_handle);

    // Abuse the status field for passing the timeout.
    sqlite3_busy_timeout(baton->db->_handle, baton->status);
}

void Database::SetLimit(Baton* b) {
    std::unique_ptr<LimitBaton> baton(static_cast<LimitBaton*>(b));

    assert(baton->db->open);
    assert(baton->db->_handle);

    sqlite3_limit(baton->db->_handle, baton->id, baton->value);
}

void Database::RegisterTraceCallback(Baton* b) {
    auto baton = std::unique_ptr<Baton>(b);
    assert(baton->db->open);
    assert(baton->db->_handle);
    auto* db = baton->db;

    if (db->debug_trace == NULL) {
        // Add it.
        db->debug_trace = new AsyncTrace(db, TraceCallback);
        sqlite3_trace(db->_handle, TraceCallback, db);
    }
    else {
        // Remove it.
        sqlite3_trace(db->_handle, NULL, NULL);
        db->debug_trace->finish();
        db->debug_trace = NULL;
    }
}

void Database::TraceCallback(void* db, const char* sql) {
    // Note: This function is called in the thread pool.
    // Note: Some queries, such as "EXPLAIN" queries, are not sent through this.
    static_cast<Database*>(db)->debug_trace->send(new std::string(sql));
}

void Database::TraceCallback(Database* db, std::string* s) {
    std::unique_ptr<std::string> sql(s);
    // Note: This function is called in the main V8 thread.
    auto env = db->Env();
    Napi::HandleScope scope(env);

    Napi::Value argv[] = {
        Napi::String::New(env, "trace"),
        Napi::String::New(env, sql->c_str())
    };
    EMIT_EVENT(db->Value(), 2, argv);
}

void Database::RegisterProfileCallback(Baton* b) {
    auto baton = std::unique_ptr<Baton>(b);
    assert(baton->db->open);
    assert(baton->db->_handle);
    auto* db = baton->db;

    if (db->debug_profile == NULL) {
        // Add it.
        db->debug_profile = new AsyncProfile(db, ProfileCallback);
        sqlite3_profile(db->_handle, ProfileCallback, db);
    }
    else {
        // Remove it.
        sqlite3_profile(db->_handle, NULL, NULL);
        db->debug_profile->finish();
        db->debug_profile = NULL;
    }
}

void Database::ProfileCallback(void* db, const char* sql, sqlite3_uint64 nsecs) {
    // Note: This function is called in the thread pool.
    // Note: Some queries, such as "EXPLAIN" queries, are not sent through this.
    auto* info = new ProfileInfo();
    info->sql = std::string(sql);
    info->nsecs = nsecs;
    static_cast<Database*>(db)->debug_profile->send(info);
}

void Database::ProfileCallback(Database *db, ProfileInfo* i) {
    auto info = std::unique_ptr<ProfileInfo>(i);
    auto env = db->Env();
    Napi::HandleScope scope(env);

    Napi::Value argv[] = {
        Napi::String::New(env, "profile"),
        Napi::String::New(env, info->sql.c_str()),
        Napi::Number::New(env, (double)info->nsecs / 1000000.0)
    };
    EMIT_EVENT(db->Value(), 3, argv);
}

void Database::RegisterUpdateCallback(Baton* b) {
    auto baton = std::unique_ptr<Baton>(b);
    assert(baton->db->open);
    assert(baton->db->_handle);
    auto* db = baton->db;

    if (db->update_event == NULL) {
        // Add it.
        db->update_event = new AsyncUpdate(db, UpdateCallback);
        sqlite3_update_hook(db->_handle, UpdateCallback, db);
    }
    else {
        // Remove it.
        sqlite3_update_hook(db->_handle, NULL, NULL);
        db->update_event->finish();
        db->update_event = NULL;
    }
}

void Database::UpdateCallback(void* db, int type, const char* database,
        const char* table, sqlite3_int64 rowid) {
    // Note: This function is called in the thread pool.
    // Note: Some queries, such as "EXPLAIN" queries, are not sent through this.
    auto* info = new UpdateInfo();
    info->type = type;
    info->database = std::string(database);
    info->table = std::string(table);
    info->rowid = rowid;
    static_cast<Database*>(db)->update_event->send(info);
}

void Database::UpdateCallback(Database *db, UpdateInfo* i) {
    auto info = std::unique_ptr<UpdateInfo>(i);
    auto env = db->Env();
    Napi::HandleScope scope(env);

    Napi::Value argv[] = {
        Napi::String::New(env, "change"),
        Napi::String::New(env, sqlite_authorizer_string(info->type)),
        Napi::String::New(env, info->database.c_str()),
        Napi::String::New(env, info->table.c_str()),
        Napi::Number::New(env, info->rowid),
    };
    EMIT_EVENT(db->Value(), 5, argv);
}

Napi::Value Database::Exec(const Napi::CallbackInfo& info) {
    auto env = this->Env();
    auto* db = this;

    REQUIRE_ARGUMENT_STRING(0, sql);
    OPTIONAL_ARGUMENT_FUNCTION(1, callback);

    Baton* baton = new ExecBaton(db, callback, sql.c_str());
    db->Schedule(Work_BeginExec, baton, true);

    return info.This();
}

void Database::Work_BeginExec(Baton* baton) {
    assert(baton->db->locked);
    assert(baton->db->open);
    assert(baton->db->_handle);
    assert(baton->db->pending == 0);
    baton->db->pending++;

    auto env = baton->db->Env();
    CREATE_WORK("sqlite3.Database.Exec", Work_Exec, Work_AfterExec);
}

void Database::Work_Exec(napi_env e, void* data) {
    auto* baton = static_cast<ExecBaton*>(data);

    char* message = NULL;
    baton->status = sqlite3_exec(
        baton->db->_handle,
        baton->sql.c_str(),
        NULL,
        NULL,
        &message
    );

    if (baton->status != SQLITE_OK && message != NULL) {
        baton->message = std::string(message);
        sqlite3_free(message);
    }
}

void Database::Work_AfterExec(napi_env e, napi_status status, void* data) {
    std::unique_ptr<ExecBaton> baton(static_cast<ExecBaton*>(data));

    auto* db = baton->db;
    db->pending--;

    auto env = db->Env();
    Napi::HandleScope scope(env);

    Napi::Function cb = baton->callback.Value();

    if (baton->status != SQLITE_OK) {
        EXCEPTION(Napi::String::New(env, baton->message.c_str()), baton->status, exception);

        if (IS_FUNCTION(cb)) {
            Napi::Value argv[] = { exception };
            TRY_CATCH_CALL(db->Value(), cb, 1, argv);
        }
        else {
            Napi::Value info[] = { Napi::String::New(env, "error"), exception };
            EMIT_EVENT(db->Value(), 2, info);
        }
    }
    else if (IS_FUNCTION(cb)) {
        Napi::Value argv[] = { env.Null() };
        TRY_CATCH_CALL(db->Value(), cb, 1, argv);
    }

    db->Process();
}

Napi::Value Database::Wait(const Napi::CallbackInfo& info) {
    auto env = info.Env();
    auto* db = this;

    OPTIONAL_ARGUMENT_FUNCTION(0, callback);

   auto* baton = new Baton(db, callback);
    db->Schedule(Work_Wait, baton, true);

    return info.This();
}

void Database::Work_Wait(Baton* b) {
    auto baton = std::unique_ptr<Baton>(b);

    auto env = baton->db->Env();
    Napi::HandleScope scope(env);

    assert(baton->db->locked);
    assert(baton->db->open);
    assert(baton->db->_handle);
    assert(baton->db->pending == 0);

    Napi::Function cb = baton->callback.Value();
    if (IS_FUNCTION(cb)) {
        Napi::Value argv[] = { env.Null() };
        TRY_CATCH_CALL(baton->db->Value(), cb, 1, argv);
    }

    baton->db->Process();
}

Napi::Value Database::LoadExtension(const Napi::CallbackInfo& info) {
    auto env = this->Env();
    auto* db = this;

    REQUIRE_ARGUMENT_STRING(0, filename);
    OPTIONAL_ARGUMENT_FUNCTION(1, callback);

    Baton* baton = new LoadExtensionBaton(db, callback, filename.c_str());
    db->Schedule(Work_BeginLoadExtension, baton, true);

    return info.This();
}

void Database::Work_BeginLoadExtension(Baton* baton) {
    assert(baton->db->locked);
    assert(baton->db->open);
    assert(baton->db->_handle);
    assert(baton->db->pending == 0);
    baton->db->pending++;

    auto env = baton->db->Env();
    CREATE_WORK("sqlite3.Database.LoadExtension", Work_LoadExtension, Work_AfterLoadExtension);
}

void Database::Work_LoadExtension(napi_env e, void* data) {
    auto* baton = static_cast<LoadExtensionBaton*>(data);

    sqlite3_enable_load_extension(baton->db->_handle, 1);

    char* message = NULL;
    baton->status = sqlite3_load_extension(
        baton->db->_handle,
        baton->filename.c_str(),
        0,
        &message
    );

    sqlite3_enable_load_extension(baton->db->_handle, 0);

    if (baton->status != SQLITE_OK && message != NULL) {
        baton->message = std::string(message);
        sqlite3_free(message);
    }
}

void Database::Work_AfterLoadExtension(napi_env e, napi_status status, void* data) {
    std::unique_ptr<LoadExtensionBaton> baton(static_cast<LoadExtensionBaton*>(data));

    auto* db = baton->db;
    db->pending--;

    auto env = db->Env();
    Napi::HandleScope scope(env);

    Napi::Function cb = baton->callback.Value();

    if (baton->status != SQLITE_OK) {
        EXCEPTION(Napi::String::New(env, baton->message.c_str()), baton->status, exception);

        if (IS_FUNCTION(cb)) {
            Napi::Value argv[] = { exception };
            TRY_CATCH_CALL(db->Value(), cb, 1, argv);
        }
        else {
            Napi::Value info[] = { Napi::String::New(env, "error"), exception };
            EMIT_EVENT(db->Value(), 2, info);
        }
    }
    else if (IS_FUNCTION(cb)) {
        Napi::Value argv[] = { env.Null() };
        TRY_CATCH_CALL(db->Value(), cb, 1, argv);
    }

    db->Process();
}

void Database::RemoveCallbacks() {
    if (debug_trace) {
        debug_trace->finish();
        debug_trace = NULL;
    }
    if (debug_profile) {
        debug_profile->finish();
        debug_profile = NULL;
    }
    if (update_event) {
        update_event->finish();
        update_event = NULL;
    }
}
