#include <cstring>
#include <napi.h>
#include <uv.h>

#include "macros.h"
#include "database.h"
#include "statement.h"

using namespace node_sqlite3;

Napi::Object Statement::Init(Napi::Env env, Napi::Object exports) {
    Napi::HandleScope scope(env);

    // declare napi_default_method here as it is only available in Node v14.12.0+
    auto napi_default_method = static_cast<napi_property_attributes>(napi_writable | napi_configurable);

    auto t = DefineClass(env, "Statement", {
      InstanceMethod("bind", &Statement::Bind, napi_default_method),
      InstanceMethod("get", &Statement::Get, napi_default_method),
      InstanceMethod("run", &Statement::Run, napi_default_method),
      InstanceMethod("all", &Statement::All, napi_default_method),
      InstanceMethod("each", &Statement::Each, napi_default_method),
      InstanceMethod("reset", &Statement::Reset, napi_default_method),
      InstanceMethod("finalize", &Statement::Finalize_, napi_default_method),
    });

    exports.Set("Statement", t);
    return exports;
}

// A Napi InstanceOf for Javascript Objects "Date" and "RegExp"
bool OtherInstanceOf(Napi::Object source, const char* object_type) {
    if (strncmp(object_type, "Date", 4) == 0) {
        return source.InstanceOf(source.Env().Global().Get("Date").As<Function>());
    } else if (strncmp(object_type, "RegExp", 6) == 0) {
        return source.InstanceOf(source.Env().Global().Get("RegExp").As<Function>());
    }

    return false;
}

void Statement::Process() {
    if (finalized && !queue.empty()) {
        return CleanQueue();
    }

    while (prepared && !locked && !queue.empty()) {
        auto call = std::unique_ptr<Call>(queue.front());
        queue.pop();

        call->callback(call->baton);
    }
}

void Statement::Schedule(Work_Callback callback, Baton* baton) {
    if (finalized) {
        queue.emplace(new Call(callback, baton));
        CleanQueue();
    }
    else if (!prepared || locked) {
        queue.emplace(new Call(callback, baton));
    }
    else {
        callback(baton);
    }
}

template <class T> void Statement::Error(T* baton) {
    Statement* stmt = baton->stmt;

    auto env = stmt->Env();
    Napi::HandleScope scope(env);

    // Fail hard on logic errors.
    assert(stmt->status != 0);
    EXCEPTION(Napi::String::New(env, stmt->message.c_str()), stmt->status, exception);

    Napi::Function cb = baton->callback.Value();

    if (IS_FUNCTION(cb)) {
        Napi::Value argv[] = { exception };
        TRY_CATCH_CALL(stmt->Value(), cb, 1, argv);
    }
    else {
        Napi::Value argv[] = { Napi::String::New(env, "error"), exception };
        EMIT_EVENT(stmt->Value(), 2, argv);
    }
}

// { Database db, String sql, Array params, Function callback }
Statement::Statement(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Statement>(info) {
    auto env = info.Env();
    int length = info.Length();

    if (length <= 0 || !Database::HasInstance(info[0])) {
        Napi::TypeError::New(env, "Database object expected").ThrowAsJavaScriptException();
        return;
    }
    else if (length <= 1 || !info[1].IsString()) {
        Napi::TypeError::New(env, "SQL query expected").ThrowAsJavaScriptException();
        return;
    }
    else if (length > 2 && !info[2].IsUndefined() && !info[2].IsFunction()) {
        Napi::TypeError::New(env, "Callback expected").ThrowAsJavaScriptException();
        return;
    }

    this->db = Napi::ObjectWrap<Database>::Unwrap(info[0].As<Napi::Object>());
    this->db->Ref();

    auto sql = info[1].As<Napi::String>();

    info.This().As<Napi::Object>().DefineProperty(Napi::PropertyDescriptor::Value("sql", sql, napi_default));


    Statement* stmt = this;

    auto* baton = new PrepareBaton(this->db, info[2].As<Napi::Function>(), stmt);
    baton->sql = std::string(sql.As<Napi::String>().Utf8Value().c_str());
    this->db->Schedule(Work_BeginPrepare, baton);
}

void Statement::Work_BeginPrepare(Database::Baton* baton) {
    assert(baton->db->open);
    baton->db->pending++;

    auto env = baton->db->Env();
    CREATE_WORK("sqlite3.Statement.Prepare", Work_Prepare, Work_AfterPrepare);
}

void Statement::Work_Prepare(napi_env e, void* data) {
    STATEMENT_INIT(PrepareBaton);

    // In case preparing fails, we use a mutex to make sure we get the associated
    // error message.
    STATEMENT_MUTEX(mtx);
    sqlite3_mutex_enter(mtx);

    stmt->status = sqlite3_prepare_v2(
        baton->db->_handle,
        baton->sql.c_str(),
        baton->sql.size(),
        &stmt->_handle,
        NULL
    );

    if (stmt->status != SQLITE_OK) {
        stmt->message = std::string(sqlite3_errmsg(baton->db->_handle));
        stmt->_handle = NULL;
    }

    sqlite3_mutex_leave(mtx);
}

void Statement::Work_AfterPrepare(napi_env e, napi_status status, void* data) {
    std::unique_ptr<PrepareBaton> baton(static_cast<PrepareBaton*>(data));
    auto* stmt = baton->stmt;

    auto env = stmt->Env();
    Napi::HandleScope scope(env);

    if (stmt->status != SQLITE_OK) {
        Error(baton.get());
        stmt->Finalize_();
    }
    else {
        stmt->prepared = true;
        if (!baton->callback.IsEmpty() && baton->callback.Value().IsFunction()) {
            Napi::Function cb = baton->callback.Value();
            Napi::Value argv[] = { env.Null() };
            TRY_CATCH_CALL(stmt->Value(), cb, 1, argv);
        }
    }

    STATEMENT_END();
}

template <class T> std::unique_ptr<Values::Field>
                   Statement::BindParameter(const Napi::Value source, T pos) {
    if (source.IsString()) {
        std::string val = source.As<Napi::String>().Utf8Value();
        return std::make_unique<Values::Text>(pos, val.length(), val.c_str());
    }
    else if (OtherInstanceOf(source.As<Object>(), "RegExp")) {
        std::string val = source.ToString().Utf8Value();
        return std::make_unique<Values::Text>(pos, val.length(), val.c_str());
    }
    else if (source.IsNumber()) {
        if (OtherIsInt(source.As<Napi::Number>())) {
            return std::make_unique<Values::Integer>(pos, source.As<Napi::Number>().Int32Value());
        } else {
            return std::make_unique<Values::Float>(pos, source.As<Napi::Number>().DoubleValue());
        }
    }
    else if (source.IsBoolean()) {
        return std::make_unique<Values::Integer>(pos, source.As<Napi::Boolean>().Value() ? 1 : 0);
    }
    else if (source.IsNull()) {
        return std::make_unique<Values::Null>(pos);
    }
    else if (source.IsBuffer()) {
        Napi::Buffer<char> buffer = source.As<Napi::Buffer<char>>();
        return std::make_unique<Values::Blob>(pos, buffer.Length(), buffer.Data());
    }
    else if (OtherInstanceOf(source.As<Object>(), "Date")) {
        return std::make_unique<Values::Float>(pos, source.ToNumber().DoubleValue());
    }
    else if (source.IsObject()) {
        auto napiVal = Napi::String::New(source.Env(), "[object Object]");
        // Check whether toString returned a value that is not undefined.
        if(napiVal.Type() == 0) {
            return NULL;
        }

        std::string val = napiVal.Utf8Value();
        return std::make_unique<Values::Text>(pos, val.length(), val.c_str());
    }
    else {
        return NULL;
    }
}

template <class T> T* Statement::Bind(const Napi::CallbackInfo& info, int start, int last) {
    auto env = info.Env();
    Napi::HandleScope scope(env);

    if (last < 0) last = info.Length();
    Napi::Function callback;
    if (last > start && info[last - 1].IsFunction()) {
        callback = info[last - 1].As<Napi::Function>();
        last--;
    }

    auto *baton = new T(this, callback);

    if (start < last) {
        if (info[start].IsArray()) {
            auto array = info[start].As<Napi::Array>();
            int length = array.Length();
            // Note: bind parameters start with 1.
            for (int i = 0, pos = 1; i < length; i++, pos++) {
                baton->parameters.emplace_back(BindParameter((array).Get(i), i + 1));
            }
        }
        else if (!info[start].IsObject() || OtherInstanceOf(info[start].As<Object>(), "RegExp") 
                || OtherInstanceOf(info[start].As<Object>(), "Date") || info[start].IsBuffer()) {
            // Parameters directly in array.
            // Note: bind parameters start with 1.
            for (int i = start, pos = 1; i < last; i++, pos++) {
                baton->parameters.emplace_back(BindParameter(info[i], pos));
            }
        }
        else if (info[start].IsObject()) {
            auto object = info[start].As<Napi::Object>();
            auto array = object.GetPropertyNames();
            int length = array.Length();
            for (int i = 0; i < length; i++) {
                Napi::Value name = (array).Get(i);
                Napi::Number num = name.ToNumber();

                if (num.Int32Value() == num.DoubleValue()) {
                    baton->parameters.emplace_back(
                        BindParameter((object).Get(name), num.Int32Value()));
                }
                else {
                    baton->parameters.emplace_back(BindParameter((object).Get(name),
                        name.As<Napi::String>().Utf8Value().c_str()));
                }
            }
        }
        else {
            return NULL;
        }
    }

    return baton;
}

bool Statement::Bind(const Parameters & parameters) {
    if (parameters.empty()) {
        return true;
    }

    sqlite3_reset(_handle);
    sqlite3_clear_bindings(_handle);

    for (auto& field : parameters) {
        if (field == NULL)
            continue;

        unsigned int pos;
        if (field->index > 0) {
            pos = field->index;
        }
        else {
            pos = sqlite3_bind_parameter_index(_handle, field->name.c_str());
        }

        switch (field->type) {
            case SQLITE_INTEGER: {
                status = sqlite3_bind_int(_handle, pos,
                    (static_cast<Values::Integer*>(field.get()))->value);
            } break;
            case SQLITE_FLOAT: {
                status = sqlite3_bind_double(_handle, pos,
                    (static_cast<Values::Float*>(field.get()))->value);
            } break;
            case SQLITE_TEXT: {
                status = sqlite3_bind_text(_handle, pos,
                    (static_cast<Values::Text*>(field.get()))->value.c_str(),
                    (static_cast<Values::Text*>(field.get()))->value.size(), SQLITE_TRANSIENT);
            } break;
            case SQLITE_BLOB: {
                status = sqlite3_bind_blob(_handle, pos,
                    (static_cast<Values::Blob*>(field.get()))->value,
                    (static_cast<Values::Blob*>(field.get()))->length, SQLITE_TRANSIENT);
            } break;
            case SQLITE_NULL: {
                status = sqlite3_bind_null(_handle, pos);
            } break;
        }

            if (status != SQLITE_OK) {
                message = std::string(sqlite3_errmsg(db->_handle));
                return false;
            }
        }

    return true;
}

Napi::Value Statement::Bind(const Napi::CallbackInfo& info) {
    auto env = info.Env();
    Statement* stmt = this;

    auto baton = stmt->Bind<Baton>(info);
    if (baton == NULL) {
        Napi::TypeError::New(env, "Data type is not supported").ThrowAsJavaScriptException();
        return env.Null();
    }
    else {
        stmt->Schedule(Work_BeginBind, baton);
        return info.This();
    }
}

void Statement::Work_BeginBind(Baton* baton) {
    STATEMENT_BEGIN(Bind);
}

void Statement::Work_Bind(napi_env e, void* data) {
    STATEMENT_INIT(Baton);

    STATEMENT_MUTEX(mtx);
    sqlite3_mutex_enter(mtx);
    stmt->Bind(baton->parameters);
    sqlite3_mutex_leave(mtx);
}

void Statement::Work_AfterBind(napi_env e, napi_status status, void* data) {
    std::unique_ptr<Baton> baton(static_cast<Baton*>(data));
    auto* stmt = baton->stmt;

    auto env = stmt->Env();
    Napi::HandleScope scope(env);

    if (stmt->status != SQLITE_OK) {
        Error(baton.get());
    }
    else {
        // Fire callbacks.
        Napi::Function cb = baton->callback.Value();
        if (IS_FUNCTION(cb)) {
            Napi::Value argv[] = { env.Null() };
            TRY_CATCH_CALL(stmt->Value(), cb, 1, argv);
        }
    }

    STATEMENT_END();
}



Napi::Value Statement::Get(const Napi::CallbackInfo& info) {
    auto env = info.Env();
    Statement* stmt = this;

    Baton* baton = stmt->Bind<RowBaton>(info);
    if (baton == NULL) {
        Napi::Error::New(env, "Data type is not supported").ThrowAsJavaScriptException();
        return env.Null();
    }
    else {
        stmt->Schedule(Work_BeginGet, baton);
        return info.This();
    }
}

void Statement::Work_BeginGet(Baton* baton) {
    STATEMENT_BEGIN(Get);
}

void Statement::Work_Get(napi_env e, void* data) {
    STATEMENT_INIT(RowBaton);

    if (stmt->status != SQLITE_DONE || baton->parameters.size()) {
        STATEMENT_MUTEX(mtx);
        sqlite3_mutex_enter(mtx);

        if (stmt->Bind(baton->parameters)) {
            stmt->status = sqlite3_step(stmt->_handle);

            if (!(stmt->status == SQLITE_ROW || stmt->status == SQLITE_DONE)) {
                stmt->message = std::string(sqlite3_errmsg(stmt->db->_handle));
            }
        }

        sqlite3_mutex_leave(mtx);

        if (stmt->status == SQLITE_ROW) {
            // Acquire one result row before returning.
            GetRow(&baton->row, stmt->_handle);
        }
    }
}

void Statement::Work_AfterGet(napi_env e, napi_status status, void* data) {
    std::unique_ptr<RowBaton> baton(static_cast<RowBaton*>(data));
    auto* stmt = baton->stmt;

    auto env = stmt->Env();
    Napi::HandleScope scope(env);

    if (stmt->status != SQLITE_ROW && stmt->status != SQLITE_DONE) {
        Error(baton.get());
    }
    else {
        // Fire callbacks.
        Napi::Function cb = baton->callback.Value();
        if (IS_FUNCTION(cb)) {
            if (stmt->status == SQLITE_ROW) {
                // Create the result array from the data we acquired.
                Napi::Value argv[] = { env.Null(), RowToJS(env, &baton->row) };
                TRY_CATCH_CALL(stmt->Value(), cb, 2, argv);
            }
            else {
                Napi::Value argv[] = { env.Null() };
                TRY_CATCH_CALL(stmt->Value(), cb, 1, argv);
            }
        }
    }

    STATEMENT_END();
}

Napi::Value Statement::Run(const Napi::CallbackInfo& info) {
    auto env = info.Env();
    Statement* stmt = this;

    Baton* baton = stmt->Bind<RunBaton>(info);
    if (baton == NULL) {
        Napi::Error::New(env, "Data type is not supported").ThrowAsJavaScriptException();
        return env.Null();
    }
    else {
        stmt->Schedule(Work_BeginRun, baton);
        return info.This();
    }
}

void Statement::Work_BeginRun(Baton* baton) {
    STATEMENT_BEGIN(Run);
}

void Statement::Work_Run(napi_env e, void* data) {
    STATEMENT_INIT(RunBaton);

    STATEMENT_MUTEX(mtx);
    sqlite3_mutex_enter(mtx);

    // Make sure that we also reset when there are no parameters.
    if (!baton->parameters.size()) {
        sqlite3_reset(stmt->_handle);
    }

    if (stmt->Bind(baton->parameters)) {
        stmt->status = sqlite3_step(stmt->_handle);

        if (!(stmt->status == SQLITE_ROW || stmt->status == SQLITE_DONE)) {
            stmt->message = std::string(sqlite3_errmsg(stmt->db->_handle));
        }
        else {
            baton->inserted_id = sqlite3_last_insert_rowid(stmt->db->_handle);
            baton->changes = sqlite3_changes(stmt->db->_handle);
        }
    }

    sqlite3_mutex_leave(mtx);
}

void Statement::Work_AfterRun(napi_env e, napi_status status, void* data) {
    std::unique_ptr<RunBaton> baton(static_cast<RunBaton*>(data));
    auto* stmt = baton->stmt;

    auto env = stmt->Env();
    Napi::HandleScope scope(env);

    if (stmt->status != SQLITE_ROW && stmt->status != SQLITE_DONE) {
        Error(baton.get());
    }
    else {
        // Fire callbacks.
        Napi::Function cb = baton->callback.Value();
        if (IS_FUNCTION(cb)) {
            (stmt->Value()).Set(Napi::String::New(env, "lastID"), Napi::Number::New(env, baton->inserted_id));
            (stmt->Value()).Set( Napi::String::New(env, "changes"), Napi::Number::New(env, baton->changes));

            Napi::Value argv[] = { env.Null() };
            TRY_CATCH_CALL(stmt->Value(), cb, 1, argv);
        }
    }

    STATEMENT_END();
}

Napi::Value Statement::All(const Napi::CallbackInfo& info) {
    auto env = info.Env();
    Statement* stmt = this;

    Baton* baton = stmt->Bind<RowsBaton>(info);
    if (baton == NULL) {
        Napi::Error::New(env, "Data type is not supported").ThrowAsJavaScriptException();
        return env.Null();
    }
    else {
        stmt->Schedule(Work_BeginAll, baton);
        return info.This();
    }
}

void Statement::Work_BeginAll(Baton* baton) {
    STATEMENT_BEGIN(All);
}

void Statement::Work_All(napi_env e, void* data) {
    STATEMENT_INIT(RowsBaton);

    STATEMENT_MUTEX(mtx);
    sqlite3_mutex_enter(mtx);

    // Make sure that we also reset when there are no parameters.
    if (!baton->parameters.size()) {
        sqlite3_reset(stmt->_handle);
    }

    if (stmt->Bind(baton->parameters)) {
        while ((stmt->status = sqlite3_step(stmt->_handle)) == SQLITE_ROW) {
            auto row = std::make_unique<Row>();
            GetRow(row.get(), stmt->_handle);
            baton->rows.emplace_back(std::move(row));
        }

        if (stmt->status != SQLITE_DONE) {
            stmt->message = std::string(sqlite3_errmsg(stmt->db->_handle));
        }
    }

    sqlite3_mutex_leave(mtx);
}

void Statement::Work_AfterAll(napi_env e, napi_status status, void* data) {
    std::unique_ptr<RowsBaton> baton(static_cast<RowsBaton*>(data));
    auto* stmt = baton->stmt;

    auto env = stmt->Env();
    Napi::HandleScope scope(env);

    if (stmt->status != SQLITE_DONE) {
        Error(baton.get());
    }
    else {
        // Fire callbacks.
        Napi::Function cb = baton->callback.Value();
        if (IS_FUNCTION(cb)) {
            if (baton->rows.size()) {
                // Create the result array from the data we acquired.
                Napi::Array result(Napi::Array::New(env, baton->rows.size()));
                auto it = static_cast<Rows::const_iterator>(baton->rows.begin());
                decltype(it) end = baton->rows.end();
                for (int i = 0; it < end; ++it, i++) {
                    (result).Set(i, RowToJS(env, it->get()));
                }

                Napi::Value argv[] = { env.Null(), result };
                TRY_CATCH_CALL(stmt->Value(), cb, 2, argv);
            }
            else {
                // There were no result rows.
                Napi::Value argv[] = {
                    env.Null(),
                    Napi::Array::New(env, 0)
                };
                TRY_CATCH_CALL(stmt->Value(), cb, 2, argv);
            }
        }
    }

    STATEMENT_END();
}

Napi::Value Statement::Each(const Napi::CallbackInfo& info) {
    auto env = info.Env();
    Statement* stmt = this;

    int last = info.Length();

    Napi::Function completed;
    if (last >= 2 && info[last - 1].IsFunction() && info[last - 2].IsFunction()) {
        completed = info[--last].As<Napi::Function>();
    }

    auto baton = stmt->Bind<EachBaton>(info, 0, last);
    if (baton == NULL) {
        Napi::Error::New(env, "Data type is not supported").ThrowAsJavaScriptException();
        return env.Null();
    }
    else {
        baton->completed.Reset(completed, 1);
        stmt->Schedule(Work_BeginEach, baton);
        return info.This();
    }
}

void Statement::Work_BeginEach(Baton* baton) {
    // Only create the Async object when we're actually going into
    // the event loop. This prevents dangling events.
    auto* each_baton = static_cast<EachBaton*>(baton);
    each_baton->async = new Async(each_baton->stmt, reinterpret_cast<uv_async_cb>(AsyncEach));
    each_baton->async->item_cb.Reset(each_baton->callback.Value(), 1);
    each_baton->async->completed_cb.Reset(each_baton->completed.Value(), 1);

    STATEMENT_BEGIN(Each);
}

void Statement::Work_Each(napi_env e, void* data) {
    STATEMENT_INIT(EachBaton);

    auto* async = baton->async;

    STATEMENT_MUTEX(mtx);

    // Make sure that we also reset when there are no parameters.
    if (!baton->parameters.size()) {
        sqlite3_reset(stmt->_handle);
    }

    if (stmt->Bind(baton->parameters)) {
        while (true) {
            sqlite3_mutex_enter(mtx);
            stmt->status = sqlite3_step(stmt->_handle);
            if (stmt->status == SQLITE_ROW) {
                sqlite3_mutex_leave(mtx);
                auto row = std::make_unique<Row>();
                GetRow(row.get(), stmt->_handle);
                NODE_SQLITE3_MUTEX_LOCK(&async->mutex)
                async->data.emplace_back(std::move(row));
                NODE_SQLITE3_MUTEX_UNLOCK(&async->mutex)

                uv_async_send(&async->watcher);
            }
            else {
                if (stmt->status != SQLITE_DONE) {
                    stmt->message = std::string(sqlite3_errmsg(stmt->db->_handle));
                }
                sqlite3_mutex_leave(mtx);
                break;
            }
        }
    }

    async->completed = true;
    uv_async_send(&async->watcher);
}

void Statement::CloseCallback(uv_handle_t* handle) {
    assert(handle != NULL);
    assert(handle->data != NULL);
    auto* async = static_cast<Async*>(handle->data);
    delete async;
}

void Statement::AsyncEach(uv_async_t* handle) {
    auto* async = static_cast<Async*>(handle->data);

    auto env = async->stmt->Env();
    Napi::HandleScope scope(env);

    while (true) {
        // Get the contents out of the data cache for us to process in the JS callback.
        Rows rows;
        NODE_SQLITE3_MUTEX_LOCK(&async->mutex)
        rows.swap(async->data);
        NODE_SQLITE3_MUTEX_UNLOCK(&async->mutex)

        if (rows.empty()) {
            break;
        }

        Napi::Function cb = async->item_cb.Value();
        if (IS_FUNCTION(cb)) {
            Napi::Value argv[2];
            argv[0] = env.Null();

            for(auto& row : rows) {
                argv[1] = RowToJS(env,row.get());
                async->retrieved++;
                TRY_CATCH_CALL(async->stmt->Value(), cb, 2, argv);
            }
        }
    }

    Napi::Function cb = async->completed_cb.Value();
    if (async->completed) {
        if (!cb.IsEmpty() &&
                cb.IsFunction()) {
            Napi::Value argv[] = {
                env.Null(),
                Napi::Number::New(env, async->retrieved)
            };
            TRY_CATCH_CALL(async->stmt->Value(), cb, 2, argv);
        }
        uv_close(reinterpret_cast<uv_handle_t*>(handle), CloseCallback);
    }
}

void Statement::Work_AfterEach(napi_env e, napi_status status, void* data) {
    std::unique_ptr<EachBaton> baton(static_cast<EachBaton*>(data));
    auto* stmt = baton->stmt;

    auto env = stmt->Env();
    Napi::HandleScope scope(env);

    if (stmt->status != SQLITE_DONE) {
        Error(baton.get());
    }

    STATEMENT_END();
}

Napi::Value Statement::Reset(const Napi::CallbackInfo& info) {
    auto env = info.Env();
    Statement* stmt = this;

    OPTIONAL_ARGUMENT_FUNCTION(0, callback);

    auto* baton = new Baton(stmt, callback);
    stmt->Schedule(Work_BeginReset, baton);

    return info.This();
}

void Statement::Work_BeginReset(Baton* baton) {
    STATEMENT_BEGIN(Reset);
}

void Statement::Work_Reset(napi_env e, void* data) {
    STATEMENT_INIT(Baton);

    sqlite3_reset(stmt->_handle);
    stmt->status = SQLITE_OK;
}

void Statement::Work_AfterReset(napi_env e, napi_status status, void* data) {
    std::unique_ptr<Baton> baton(static_cast<Baton*>(data));
    auto* stmt = baton->stmt;

    auto env = stmt->Env();
    Napi::HandleScope scope(env);

    // Fire callbacks.
    Napi::Function cb = baton->callback.Value();
    if (IS_FUNCTION(cb)) {
        Napi::Value argv[] = { env.Null() };
        TRY_CATCH_CALL(stmt->Value(), cb, 1, argv);
    }

    STATEMENT_END();
}

Napi::Value Statement::RowToJS(Napi::Env env, Row* row) {
    Napi::EscapableHandleScope scope(env);

    auto result = Napi::Object::New(env);

    for (auto& field : *row) {

        Napi::Value value;

        switch (field->type) {
            case SQLITE_INTEGER: {
                value = Napi::Number::New(env, (static_cast<Values::Integer*>(field.get()))->value);
            } break;
            case SQLITE_FLOAT: {
                value = Napi::Number::New(env, (static_cast<Values::Float*>(field.get()))->value);
            } break;
            case SQLITE_TEXT: {
                value = Napi::String::New(env, (static_cast<Values::Text*>(field.get()))->value.c_str(), 
                                               (static_cast<Values::Text*>(field.get()))->value.size());
            } break;
            case SQLITE_BLOB: {
                value = Napi::Buffer<char>::Copy(env, (static_cast<Values::Blob*>(field.get()))->value, 
                                                      (static_cast<Values::Blob*>(field.get()))->length);
            } break;
            case SQLITE_NULL: {
                value = env.Null();
            } break;
        }

        result.Set(field->name, value);
    }

    return scope.Escape(result);
}

void Statement::GetRow(Row* row, sqlite3_stmt* stmt) {
    int cols = sqlite3_column_count(stmt);

    for (int i = 0; i < cols; i++) {
        int type = sqlite3_column_type(stmt, i);
        const char* name = sqlite3_column_name(stmt, i);
        if (name == NULL) {
            assert(false);
        }

        switch (type) {
            case SQLITE_INTEGER: {
                row->emplace_back(std::make_unique<Values::Integer>(name, sqlite3_column_int64(stmt, i)));
            }   break;
            case SQLITE_FLOAT: {
                row->emplace_back(std::make_unique<Values::Float>(name, sqlite3_column_double(stmt, i)));
            }   break;
            case SQLITE_TEXT: {
                const char* text = (const char*)sqlite3_column_text(stmt, i);
                int length = sqlite3_column_bytes(stmt, i);
                row->emplace_back(std::make_unique<Values::Text>(name, length, text));
            } break;
            case SQLITE_BLOB: {
                const void* blob = sqlite3_column_blob(stmt, i);
                int length = sqlite3_column_bytes(stmt, i);
                row->emplace_back(std::make_unique<Values::Blob>(name, length, blob));
            }   break;
            case SQLITE_NULL: {
                row->emplace_back(std::make_unique<Values::Null>(name));
            }   break;
            default:
                assert(false);
        }
    }
}

Napi::Value Statement::Finalize_(const Napi::CallbackInfo& info) {
    auto env = info.Env();
    Statement* stmt = this;
    OPTIONAL_ARGUMENT_FUNCTION(0, callback);

    auto *baton = new Baton(stmt, callback);
    stmt->Schedule(Finalize_, baton);

    return stmt->db->Value();
}

void Statement::Finalize_(Baton* b) {
    auto baton = std::unique_ptr<Baton>(b);
    auto env = baton->stmt->Env();
    Napi::HandleScope scope(env);

    baton->stmt->Finalize_();

    // Fire callback in case there was one.
    Napi::Function cb = baton->callback.Value();
    if (IS_FUNCTION(cb)) {
        TRY_CATCH_CALL(baton->stmt->Value(), cb, 0, NULL);
    }
}

void Statement::Finalize_() {
    assert(!finalized);
    finalized = true;
    CleanQueue();
    // Finalize returns the status code of the last operation. We already fired
    // error events in case those failed.
    sqlite3_finalize(_handle);
    _handle = NULL;
    db->Unref();
}

void Statement::CleanQueue() {
    auto env = this->Env();
    Napi::HandleScope scope(env);

    if (prepared && !queue.empty()) {
        // This statement has already been prepared and is now finalized.
        // Fire error for all remaining items in the queue.
        EXCEPTION(Napi::String::New(env, "Statement is already finalized"), SQLITE_MISUSE, exception);
        Napi::Value argv[] = { exception };
        bool called = false;

        // Clear out the queue so that this object can get GC'ed.
        while (!queue.empty()) {
            auto call = std::unique_ptr<Call>(queue.front());
            queue.pop();

            auto baton = std::unique_ptr<Baton>(call->baton);
            Napi::Function cb = baton->callback.Value();

            if (prepared && !cb.IsEmpty() &&
                cb.IsFunction()) {
                TRY_CATCH_CALL(Value(), cb, 1, argv);
                called = true;
            }
        }

        // When we couldn't call a callback function, emit an error on the
        // Statement object.
        if (!called) {
            Napi::Value info[] = { Napi::String::New(env, "error"), exception };
            EMIT_EVENT(Value(), 2, info);
        }
    }
    else while (!queue.empty()) {
        // Just delete all items in the queue; we already fired an event when
        // preparing the statement failed.
        auto call = std::unique_ptr<Call>(queue.front());
        queue.pop();
        // We don't call the actual callback, so we have to make sure that
        // the baton gets destroyed.
        delete call->baton;
    }
}
