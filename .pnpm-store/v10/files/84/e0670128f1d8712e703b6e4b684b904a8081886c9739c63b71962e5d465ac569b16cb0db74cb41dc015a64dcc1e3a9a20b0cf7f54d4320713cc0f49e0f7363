#ifndef NODE_SQLITE3_SRC_MACROS_H
#define NODE_SQLITE3_SRC_MACROS_H

const char* sqlite_code_string(int code);
const char* sqlite_authorizer_string(int type);
#include <vector>

// TODO: better way to work around StringConcat?
#include <napi.h>
inline Napi::String StringConcat(Napi::Value str1, Napi::Value str2) {
  return Napi::String::New(str1.Env(), str1.As<Napi::String>().Utf8Value() +
                    str2.As<Napi::String>().Utf8Value() );
}

// A Napi substitute IsInt32()
inline bool OtherIsInt(Napi::Number source) {
    double orig_val = source.DoubleValue();
    double int_val = static_cast<double>(source.Int32Value());
    if (orig_val == int_val) {
        return true;
    } else {
        return false;
    }
}

#define IS_FUNCTION(cb) \
    !cb.IsUndefined() && cb.IsFunction()

#define REQUIRE_ARGUMENTS(n)                                                   \
    if (info.Length() < (n)) {                                                 \
        Napi::TypeError::New(env, "Expected " #n "arguments").ThrowAsJavaScriptException(); \
        return env.Null(); \
    }


#define REQUIRE_ARGUMENT_EXTERNAL(i, var)                                      \
    if (info.Length() <= (i) || !info[i].IsExternal()) {                       \
        Napi::TypeError::New(env, "Argument " #i " invalid").ThrowAsJavaScriptException(); \
        return env.Null(); \
    }                                                                          \
    Napi::External var = info[i].As<Napi::External>();


#define REQUIRE_ARGUMENT_FUNCTION(i, var)                                      \
    if (info.Length() <= (i) || !info[i].IsFunction()) {                        \
        Napi::TypeError::New(env, "Argument " #i " must be a function").ThrowAsJavaScriptException(); \
        return env.Null(); \
    }                                                                          \
    Napi::Function var = info[i].As<Napi::Function>();


#define REQUIRE_ARGUMENT_STRING(i, var)                                        \
    if (info.Length() <= (i) || !info[i].IsString()) {                         \
        Napi::TypeError::New(env, "Argument " #i " must be a string").ThrowAsJavaScriptException(); \
        return env.Null(); \
    }                                                                          \
    std::string var = info[i].As<Napi::String>();

#define REQUIRE_ARGUMENT_INTEGER(i, var)                                        \
    if (info.Length() <= (i) || !info[i].IsNumber()) {                        \
        Napi::TypeError::New(env, "Argument " #i " must be an integer").ThrowAsJavaScriptException(); \
        return env.Null();        \
    }                                                                          \
    int var(info[i].As<Napi::Number>().Int32Value());

#define OPTIONAL_ARGUMENT_FUNCTION(i, var)                                     \
    Napi::Function var;                                                        \
    if (info.Length() > i && !info[i].IsUndefined()) {                         \
        if (!info[i].IsFunction()) {                                           \
            Napi::TypeError::New(env, "Argument " #i " must be a function").ThrowAsJavaScriptException(); \
            return env.Null(); \
        }                                                                      \
        var = info[i].As<Napi::Function>();                                    \
    }


#define OPTIONAL_ARGUMENT_INTEGER(i, var, default)                             \
    int var;                                                                   \
    if (info.Length() <= (i)) {                                                \
        var = (default);                                                       \
    }                                                                          \
    else if (info[i].IsNumber()) {                                             \
        if (OtherIsInt(info[i].As<Number>())) {                                \
            var = info[i].As<Napi::Number>().Int32Value();                     \
        }                                                                      \
    }                                                                          \
    else {                                                                     \
        Napi::TypeError::New(env, "Argument " #i " must be an integer").ThrowAsJavaScriptException(); \
        return env.Null(); \
    }


#define DEFINE_CONSTANT_INTEGER(target, constant, name)                        \
    Napi::PropertyDescriptor::Value(#name, Napi::Number::New(env, constant),   \
        static_cast<napi_property_attributes>(napi_enumerable | napi_configurable)),

#define DEFINE_CONSTANT_STRING(target, constant, name)                         \
    Napi::PropertyDescriptor::Value(#name, Napi::String::New(env, constant),   \
        static_cast<napi_property_attributes>(napi_enumerable | napi_configurable)),

#define EXCEPTION(msg, errno, name)                                            \
    Napi::Value name = Napi::Error::New(env,                                   \
        StringConcat(                                                          \
            StringConcat(                                                      \
                Napi::String::New(env, sqlite_code_string(errno)),             \
                Napi::String::New(env, ": ")                                   \
            ),                                                                 \
            (msg)                                                              \
        ).Utf8Value()                                                          \
    ).Value();                                                                 \
    Napi::Object name ##_obj = name.As<Napi::Object>();                        \
    (name ##_obj).Set( Napi::String::New(env, "errno"), Napi::Number::New(env, errno)); \
    (name ##_obj).Set( Napi::String::New(env, "code"),                         \
        Napi::String::New(env, sqlite_code_string(errno)));


#define EMIT_EVENT(obj, argc, argv)                                            \
    TRY_CATCH_CALL((obj),                                                      \
        (obj).Get("emit").As<Napi::Function>(),\
        argc, argv                                                             \
    );

// The Mac OS compiler complains when argv is NULL unless we
// first assign it to a locally defined variable.
#define TRY_CATCH_CALL(context, callback, argc, argv, ...)                     \
    Napi::Value* passed_argv = argv;\
    std::vector<napi_value> args;\
    if ((argc != 0) && (passed_argv != NULL)) {\
      args.assign(passed_argv, passed_argv + argc);\
    }\
    Napi::Value res = (callback).Call(Napi::Value(context), args);             \
    if (res.IsEmpty()) return __VA_ARGS__;

#define WORK_DEFINITION(name)                                                  \
    Napi::Value name(const Napi::CallbackInfo& info);                          \
    static void Work_Begin##name(Baton* baton);                                \
    static void Work_##name(napi_env env, void* data);                         \
    static void Work_After##name(napi_env env, napi_status status, void* data);

#ifdef DEBUG
    #define ASSERT_STATUS() assert(status == 0);
#else
    #define ASSERT_STATUS() (void)status;
#endif

#define CREATE_WORK(name, workerFn, afterFn)                                    \
    int status = napi_create_async_work(env, NULL, Napi::String::New(env, name),\
                             workerFn, afterFn, baton, &baton->request);        \
                                                                                \
    ASSERT_STATUS();                                                            \
    napi_queue_async_work(env, baton->request);

#define STATEMENT_BEGIN(type)                                                  \
    assert(baton);                                                             \
    assert(baton->stmt);                                                       \
    assert(!baton->stmt->locked);                                              \
    assert(!baton->stmt->finalized);                                           \
    assert(baton->stmt->prepared);                                             \
    baton->stmt->locked = true;                                                \
    baton->stmt->db->pending++;                                                \
    auto env = baton->stmt->Env();                                             \
    CREATE_WORK("sqlite3.Statement."#type, Work_##type, Work_After##type);

#define STATEMENT_INIT(type)                                                   \
    type* baton = static_cast<type*>(data);                                    \
    Statement* stmt = baton->stmt;

#define STATEMENT_MUTEX(name) \
    if (!stmt->db->_handle) { \
        stmt->status = SQLITE_MISUSE; \
        stmt->message = "Database handle is closed"; \
        return; \
    } \
    sqlite3_mutex* name = sqlite3_db_mutex(stmt->db->_handle);

#define STATEMENT_END()                                                        \
    assert(stmt->locked);                                                      \
    assert(stmt->db->pending);                                                 \
    stmt->locked = false;                                                      \
    stmt->db->pending--;                                                       \
    stmt->Process();                                                           \
    stmt->db->Process();

#define BACKUP_BEGIN(type)                                                     \
    assert(baton);                                                             \
    assert(baton->backup);                                                     \
    assert(!baton->backup->locked);                                            \
    assert(!baton->backup->finished);                                          \
    assert(baton->backup->inited);                                             \
    baton->backup->locked = true;                                              \
    baton->backup->db->pending++;                                              \
    auto env = baton->backup->Env();                                           \
    CREATE_WORK("sqlite3.Backup."#type, Work_##type, Work_After##type);

#define BACKUP_INIT(type)                                                      \
    type* baton = static_cast<type*>(data);                                    \
    Backup* backup = baton->backup;

#define BACKUP_END()                                                           \
    assert(backup->locked);                                                    \
    assert(backup->db->pending);                                               \
    backup->locked = false;                                                    \
    backup->db->pending--;                                                     \
    backup->Process();                                                         \
    backup->db->Process();

#endif