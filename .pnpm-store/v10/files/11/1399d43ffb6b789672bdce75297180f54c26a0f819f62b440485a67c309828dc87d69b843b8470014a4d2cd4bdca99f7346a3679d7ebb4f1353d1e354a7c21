#include "reference_handle.h"
#include "external_copy/external_copy.h"
#include "isolate/run_with_timeout.h"
#include "isolate/three_phase_task.h"
#include "transferable.h"
#include <array>

using namespace v8;
using std::shared_ptr;
using std::unique_ptr;

namespace ivm {
namespace {

using TypeOf = detail::ReferenceData::TypeOf;
auto InferTypeOf(Local<Value> value) -> TypeOf {
	if (value->IsNull()) {
		return TypeOf::Null;
	} else if (value->IsUndefined()) {
		return TypeOf::Undefined;
	} else if (value->IsNumber()) {
		return TypeOf::Number;
	} else if (value->IsString()) {
		return TypeOf::String;
	} else if (value->IsBoolean()) {
		return TypeOf::Boolean;
	} else if (value->IsFunction()) {
		return TypeOf::Function;
	} else {
		return TypeOf::Object;
	}
}

/**
 * The return value for .derefInto()
 */
class DereferenceHandleTransferable : public Transferable {
	public:
		DereferenceHandleTransferable(shared_ptr<IsolateHolder> isolate, RemoteHandle<v8::Value> reference) :
			isolate{std::move(isolate)}, reference{std::move(reference)} {}

		auto TransferIn() -> v8::Local<v8::Value> final {
			if (isolate == IsolateEnvironment::GetCurrentHolder()) {
				return Deref(reference);
			} else {
				throw RuntimeTypeError("Cannot dereference this into target isolate");
			}
		}

	private:
		shared_ptr<IsolateHolder> isolate;
		RemoteHandle<v8::Value> reference;
};

class DereferenceHandle : public TransferableHandle {
	public:
		DereferenceHandle(shared_ptr<IsolateHolder> isolate, RemoteHandle<v8::Value> reference) :
			isolate{std::move(isolate)}, reference{std::move(reference)} {}

		static auto Definition() -> v8::Local<v8::FunctionTemplate> {
			return Inherit<TransferableHandle>(MakeClass("Dereference", nullptr));
		}

		auto TransferOut() -> std::unique_ptr<Transferable> final {
			if (!reference) {
				throw RuntimeGenericError("The return value of `derefInto()` should only be used once");
			}
			return std::make_unique<DereferenceHandleTransferable>(std::move(isolate), std::move(reference));
		}

	private:
		shared_ptr<IsolateHolder> isolate;
		RemoteHandle<v8::Value> reference;
};

} // anonymous namespace

namespace detail {

ReferenceData::ReferenceData(Local<Value> value, bool inherit) : ReferenceData{
		IsolateEnvironment::GetCurrentHolder(),
		RemoteHandle<Value>(value),
		RemoteHandle<Context>(Isolate::GetCurrent()->GetCurrentContext()),
		InferTypeOf(value),
		false,
		inherit} {}

ReferenceData::ReferenceData(
	shared_ptr<IsolateHolder> isolate,
	RemoteHandle<Value> reference,
	RemoteHandle<Context> context,
	TypeOf type_of,
	bool accessors,
	bool inherit
) :
	isolate{std::move(isolate)},
	reference{std::move(reference)},
	context{std::move(context)},
	type_of{type_of},
	accessors{accessors},
	inherit{inherit} {}

} // namespace detail

/**
 * ReferenceHandle implementation
 */
static std::unique_ptr<ReferenceHandle> ReferenceHandle_New_Wrapper(v8::Local<v8::Value> value, v8::MaybeLocal<v8::Object> options) {
    return ReferenceHandle::New(value, options);
}

auto ReferenceHandle::Definition() -> Local<FunctionTemplate> {
	return Inherit<TransferableHandle>(MakeClass(
		"Reference", ConstructorFunction<decltype(&ReferenceHandle_New_Wrapper), &ReferenceHandle_New_Wrapper>{},
		"deref", MemberFunction<decltype(&ReferenceHandle::Deref), &ReferenceHandle::Deref>{},
		"derefInto", MemberFunction<decltype(&ReferenceHandle::DerefInto), &ReferenceHandle::DerefInto>{},
		"release", MemberFunction<decltype(&ReferenceHandle::Release), &ReferenceHandle::Release>{},
		"copy", MemberFunction<decltype(&ReferenceHandle::Copy<1>), &ReferenceHandle::Copy<1>>{},
		"copySync", MemberFunction<decltype(&ReferenceHandle::Copy<0>), &ReferenceHandle::Copy<0>>{},
		"delete", MemberFunction<decltype(&ReferenceHandle::Delete<1>), &ReferenceHandle::Delete<1>>{},
		"deleteIgnored", MemberFunction<decltype(&ReferenceHandle::Delete<2>), &ReferenceHandle::Delete<2>>{},
		"deleteSync", MemberFunction<decltype(&ReferenceHandle::Delete<0>), &ReferenceHandle::Delete<0>>{},
		"get", MemberFunction<decltype(&ReferenceHandle::Get<1>), &ReferenceHandle::Get<1>>{},
		"getSync", MemberFunction<decltype(&ReferenceHandle::Get<0>), &ReferenceHandle::Get<0>>{},
		"set", MemberFunction<decltype(&ReferenceHandle::Set<1>), &ReferenceHandle::Set<1>>{},
		"setIgnored", MemberFunction<decltype(&ReferenceHandle::Set<2>), &ReferenceHandle::Set<2>>{},
		"setSync", MemberFunction<decltype(&ReferenceHandle::Set<0>), &ReferenceHandle::Set<0>>{},
		"apply", MemberFunction<decltype(&ReferenceHandle::Apply<1>), &ReferenceHandle::Apply<1>>{},
		"applyIgnored", MemberFunction<decltype(&ReferenceHandle::Apply<2>), &ReferenceHandle::Apply<2>>{},
		"applySync", MemberFunction<decltype(&ReferenceHandle::Apply<0>), &ReferenceHandle::Apply<0>>{},
		"applySyncPromise", MemberFunction<decltype(&ReferenceHandle::Apply<4>), &ReferenceHandle::Apply<4>>{},
		"typeof", MemberAccessor<decltype(&ReferenceHandle::TypeOfGetter), &ReferenceHandle::TypeOfGetter>{}
	));
}

auto ReferenceHandle::New(Local<Value> value, MaybeLocal<Object> options) -> unique_ptr<ReferenceHandle> {
	auto inherit = ReadOption<bool>(options, StringTable::Get().unsafeInherit, false);
	return std::make_unique<ReferenceHandle>(value, inherit);
}

auto ReferenceHandle::TransferOut() -> unique_ptr<Transferable> {
	return std::make_unique<ReferenceHandleTransferable>(*this);
}

/**
 * Getter for typeof property.
 */
auto ReferenceHandle::TypeOfGetter() -> Local<Value> {
	CheckDisposed();
	switch (type_of) {
		case TypeOf::Null:
			return StringTable::Get().null;
		case TypeOf::Undefined:
			return StringTable::Get().undefined;
		case TypeOf::Number:
			return StringTable::Get().number;
		case TypeOf::String:
			return StringTable::Get().string;
		case TypeOf::Boolean:
			return StringTable::Get().boolean;
		case TypeOf::Object:
			return StringTable::Get().object;
		case TypeOf::Function:
			return StringTable::Get().function;
	}
	std::terminate();
}

/**
 * Attempt to return this handle to the current context.
 */
auto ReferenceHandle::Deref(MaybeLocal<Object> maybe_options) -> Local<Value> {
	CheckDisposed();
	if (isolate.get() != IsolateEnvironment::GetCurrentHolder().get()) {
		throw RuntimeTypeError("Cannot dereference this from current isolate");
	}
	bool release = ReadOption<bool>(maybe_options, StringTable::Get().release, false);
	Local<Value> ret = ivm::Deref(reference);
	if (release) {
		Release();
	}
	return ret;
}

/**
 * Return a handle which will dereference itself when passing into another isolate.
 */
auto ReferenceHandle::DerefInto(MaybeLocal<Object> maybe_options) -> Local<Value> {
	CheckDisposed();
	bool release = ReadOption<bool>(maybe_options, StringTable::Get().release, false);
	Local<Value> ret = ClassHandle::NewInstance<DereferenceHandle>(isolate, reference);
	if (release) {
		Release();
	}
	return ret;
}

/**
 * Release this reference.
 */
auto ReferenceHandle::Release() -> Local<Value> {
	CheckDisposed();
	isolate.reset();
	reference = {};
	context = {};
	return Undefined(Isolate::GetCurrent());
}

/**
 * Call a function, like Function.prototype.apply
 */
class ApplyRunner : public ThreePhaseTask {
	public:
		ApplyRunner(
			ReferenceHandle& that,
			MaybeLocal<Value> recv_handle,
			Maybe<ArrayRange> maybe_arguments,
			MaybeLocal<Object> maybe_options
		) :	context{that.context}, reference{that.reference}
		{
			that.CheckDisposed();

			// Get receiver, holder, this, whatever
			Local<Value> recv_local;
			if (recv_handle.ToLocal(&recv_local)) {
				recv = TransferOut(recv_local);
			}

			// Get run options
			TransferOptions arguments_transfer_options;
			Local<Object> options;
			if (maybe_options.ToLocal(&options)) {
				timeout = ReadOption<int32_t>(options, StringTable::Get().timeout, 0);
				arguments_transfer_options = TransferOptions{
					ReadOption<MaybeLocal<Object>>(options, StringTable::Get().arguments, {})};
				return_transfer_options = TransferOptions{
					ReadOption<MaybeLocal<Object>>(options, StringTable::Get().result, {}),
					TransferOptions::Type::Reference};
			}

			// Externalize all arguments
			ArrayRange arguments;
			if (maybe_arguments.To(&arguments)) {
				argv.reserve(std::distance(arguments.begin(), arguments.end()));
				for (auto argument : arguments) {
					argv.push_back(TransferOut(argument, arguments_transfer_options));
				}
			}
		}

		ApplyRunner(const ApplyRunner&) = delete;
		auto operator=(const ApplyRunner&) = delete;

		~ApplyRunner() final {
			if (did_finish) {
				*did_finish = 1;
			}
		}

		void Phase2() final {
			// Invoke in the isolate
			Local<Context> context_handle = Deref(context);
			Context::Scope context_scope{context_handle};
			Local<Value> fn = Deref(reference);
			if (!fn->IsFunction()) {
				throw RuntimeTypeError("Reference is not a function");
			}
			std::vector<Local<Value>> argv_inner = TransferArguments();
			Local<Value> recv_inner = recv->TransferIn();
			Local<Value> result = RunWithTimeout(timeout,
				[&fn, &context_handle, &recv_inner, &argv_inner]() {
					return fn.As<Function>()->Call(context_handle, recv_inner, argv_inner.size(), argv_inner.empty() ? nullptr : &argv_inner[0]);
				}
			);
			ret = TransferOut(result, return_transfer_options);
		}

		auto Phase2Async(Scheduler::AsyncWait& wait) -> bool final {
			// Same as regular `Phase2()` but if it returns a promise we will wait on it
			if (!(return_transfer_options == TransferOptions{TransferOptions::Type::Reference})) {
				throw RuntimeTypeError("`result` options are not available for `applySyncPromise`");
			}
			Local<Context> context_handle = Deref(context);
			Context::Scope context_scope{context_handle};
			Local<Value> fn = Deref(reference);
			if (!fn->IsFunction()) {
				throw RuntimeTypeError("Reference is not a function");
			}
			Local<Value> recv_inner = recv->TransferIn();
			std::vector<Local<Value>> argv_inner = TransferArguments();
			Local<Value> value = RunWithTimeout(
				timeout,
				[&fn, &context_handle, &recv_inner, &argv_inner]() {
					return fn.As<Function>()->Call(context_handle, recv_inner, argv_inner.size(), argv_inner.empty() ? nullptr : &argv_inner[0]);
				}
			);
			if (value->IsPromise()) {
				Isolate* isolate = Isolate::GetCurrent();
				// This is only called from the default isolate, so we don't need an IsolateSpecific
				static Persistent<Function> callback_persistent{isolate, CompileAsyncWrapper()};
				Local<Function> callback_fn = Deref(callback_persistent);
				did_finish = std::make_shared<char>(0);
				std::array<Local<Value>, 3> argv;
				argv[0] = External::New(isolate, reinterpret_cast<void*>(this));
				argv[1] = External::New(isolate, new shared_ptr<char>(did_finish));
				argv[2] = value;
				async_wait = &wait;
				Unmaybe(callback_fn->Call(context_handle, callback_fn, 3, &argv.front()));
				return true;
			} else {
				ret = TransferOut(value, return_transfer_options);
				return false;
			}
		}

		auto Phase3() -> Local<Value> final {
			if (did_finish && *did_finish == 0) {
				*did_finish = 1;
				throw RuntimeGenericError("Script execution timed out.");
			} else if (async_error) {
				Isolate::GetCurrent()->ThrowException(async_error->CopyInto());
				throw RuntimeError();
			} else {
				return ret->TransferIn();
			}
		}

	private:
		/**
		 * This is an internal callback that will be called after a Promise returned from
		 * `applySyncPromise` has resolved
		 */
		static void AsyncCallback(const v8::FunctionCallbackInfo<v8::Value>& info) {
			// It's possible the invocation timed out, in which case the ApplyRunner will be dead. The
			// shared_ptr<bool> here will be marked as true and we can exit early.
			auto* did_finish_ptr = reinterpret_cast<shared_ptr<char>*>(info[1].As<External>()->Value());
			auto did_finish = std::move(*did_finish_ptr);
			delete did_finish_ptr;
			if (*did_finish == 1) {
				return;
			}
			ApplyRunner& self = *reinterpret_cast<ApplyRunner*>(info[0].As<External>()->Value());
			if (info.Length() == 3) {
				// Resolved
				FunctorRunners::RunCatchExternal(IsolateEnvironment::GetCurrent().DefaultContext(), [&self, &info]() {
					self.ret = TransferOut(info[2]);
				}, [&self](unique_ptr<ExternalCopy> error) {
					self.async_error = std::move(error);
				});
			} else {
				// Rejected
				self.async_error = ExternalCopy::CopyThrownValue(info[3]);
			}
			*self.did_finish = 1;
			self.async_wait->Done();
		}

		/**
		 * The C++ promise interface is a little clumsy so this does some work in JS for us. This function
		 * is called once and returns a JS function that will be reused.
		 */
		static auto CompileAsyncWrapper() -> Local<Function> {
			Isolate* isolate = Isolate::GetCurrent();
			Local<Context> context = IsolateEnvironment::GetCurrent().DefaultContext();
			Local<Script> script = Unmaybe(Script::Compile(context, v8_string(
				"'use strict';"
				"(function(AsyncCallback) {"
					"return function(ptr, did_finish, promise) {"
						"promise.then(function(val) {"
							"AsyncCallback(ptr, did_finish, val);"
						"}, function(err) {"
							"AsyncCallback(ptr, did_finish, null, err);"
						"});"
					"};"
				"})"
			)));
			Local<Value> outer_fn = Unmaybe(script->Run(context));
			assert(outer_fn->IsFunction());
			Local<Value> callback_fn = Unmaybe(FunctionTemplate::New(isolate, AsyncCallback)->GetFunction(context));
			Local<Value> inner_fn = Unmaybe(outer_fn.As<Function>()->Call(context, Undefined(isolate), 1, &callback_fn));
			assert(inner_fn->IsFunction());
			return inner_fn.As<Function>();
		}

		auto TransferArguments() -> std::vector<Local<Value>> {
			std::vector<Local<Value>> argv_inner;
			size_t argc = argv.size();
			argv_inner.reserve(argc);
			for (size_t ii = 0; ii < argc; ++ii) {
				argv_inner.emplace_back(argv[ii]->TransferIn());
			}
			return argv_inner;
		}

		std::vector<unique_ptr<Transferable>> argv;
		RemoteHandle<Context> context;
		RemoteHandle<Value> reference;
		unique_ptr<Transferable> recv;
		unique_ptr<Transferable> ret;
		uint32_t timeout = 0;
		// Only used in the AsyncPhase2 case
		shared_ptr<char> did_finish; // GCC 5.4.0 `std::make_shared<bool>(...)` is broken(?)
		TransferOptions return_transfer_options{TransferOptions::Type::Reference};
		unique_ptr<ExternalCopy> async_error;
		Scheduler::AsyncWait* async_wait = nullptr;
};
template <int async>
auto ReferenceHandle::Apply(MaybeLocal<Value> recv_handle, Maybe<ArrayRange> maybe_arguments, MaybeLocal<Object> maybe_options) -> Local<Value> {
	return ThreePhaseTask::Run<async, ApplyRunner>(*isolate, *this, recv_handle, maybe_arguments, maybe_options);
}

/**
 * Copy this reference's value into this isolate
 */
class CopyRunner : public ThreePhaseTask {
	public:
		CopyRunner(
			const ReferenceHandle& that,
			RemoteHandle<Context> context,
			RemoteHandle<Value> reference
		) : context{std::move(context)}, reference{std::move(reference)} {
			that.CheckDisposed();
		}

		void Phase2() final {
			Context::Scope context_scope{Deref(context)};
			Local<Value> value = Deref(reference);
			copy = ExternalCopy::Copy(value);
		}

		auto Phase3() -> Local<Value> final {
			return copy->TransferIn();
		}

	private:
		RemoteHandle<Context> context;
		RemoteHandle<Value> reference;
		unique_ptr<Transferable> copy;
};

template <int async>
auto ReferenceHandle::Copy() -> Local<Value> {
	return ThreePhaseTask::Run<async, CopyRunner>(*isolate, *this, context, reference);
}

/**
 * Base class for get, set, and delete runners
 */
class AccessorRunner : public ThreePhaseTask {
	public:
		AccessorRunner(ReferenceHandle& target, Local<Value> key_handle) :
		context{target.context},
		target{target.reference},
		key{ExternalCopy::CopyIfPrimitive(key_handle)} {
			target.CheckDisposed();
			if (!key || (!key_handle->IsName() && !key_handle->IsUint32())) {
				throw RuntimeTypeError("Invalid `key`");
			} else if (target.type_of != decltype(target.type_of)::Object) {
				throw RuntimeTypeError("Reference is not an object");
			}
		}

	protected:
		auto GetTargetAndAlsoCheckForProxy() -> Local<Object> {
			auto object = Local<Object>::Cast(Deref(target));
			if (HasProxy(object)) {
				throw RuntimeTypeError("Object is or has proxy");
			}
			return object;
		}

		auto GetKey(Local<Context> context) -> Local<Name> {
			auto key_inner = key->CopyInto();
			return (key_inner->IsString() || key_inner->IsSymbol()) ?
				key_inner.As<Name>() : Unmaybe(key_inner->ToString(context)).As<Name>();
		}

		RemoteHandle<Context> context;

	private:
		static auto HasProxy(Local<Object> object) -> bool {
			if (object->IsProxy()) {
				return true;
			} else {
				auto proto = object->GetPrototype();
				if (proto->IsNullOrUndefined()) {
					return false;
				} else {
					return HasProxy(proto.As<Object>());
				}
			}
		}

		RemoteHandle<Value> target;
		unique_ptr<ExternalCopy> key;
};

/**
 * Get a property from this reference, returned as another reference
 */
class GetRunner final : public AccessorRunner {
	public:
		GetRunner(ReferenceHandle& target, Local<Value> key_handle, MaybeLocal<Object> maybe_options) :
		AccessorRunner{target, key_handle},
		options{maybe_options, target.inherit ?
			TransferOptions::Type::DeepReference : TransferOptions::Type::Reference},
		accessors{target.accessors || ReadOption(maybe_options, StringTable::Get().accessors, false)},
		inherit{target.inherit} {}

		void Phase2() final {
			// Setup
			auto* isolate = Isolate::GetCurrent();
			auto context = Deref(this->context);
			Context::Scope context_scope{context};
			auto name = GetKey(context);
			auto object = GetTargetAndAlsoCheckForProxy();

			// Get property
			ret = TransferOut([&]() {
				if (inherit) {
					// To avoid accessors I guess we have to walk the prototype chain ourselves
					auto target = object;
					if (!accessors) {
						do {
							if (Unmaybe(target->HasOwnProperty(context, name))) {
								if (Unmaybe(target->HasRealNamedCallbackProperty(context, name))) {
									throw RuntimeTypeError("Property is getter");
								}
								return Unmaybe(target->GetRealNamedProperty(context, name));
							}
							auto next = target->GetPrototype();
							if (next->IsNullOrUndefined()) {
								return Undefined(isolate).As<Value>();
							}
							target = next.As<Object>();
						} while (true);
					}
				} else if (!Unmaybe(object->HasOwnProperty(context, name))) {
					return Undefined(isolate).As<Value>();
				} else if (!accessors && Unmaybe(object->HasRealNamedCallbackProperty(context, name))) {
					throw RuntimeTypeError("Property is getter");
				}
				return Unmaybe(object->Get(context, name));
			}(), options);
		}

		auto Phase3() -> Local<Value> final {
			return ret->TransferIn();
		}

	private:
		unique_ptr<Transferable> ret;
		TransferOptions options;
		bool accessors;
		bool inherit;
};
template <int async>
auto ReferenceHandle::Get(Local<Value> key_handle, MaybeLocal<Object> maybe_options) -> Local<Value> {
	return ThreePhaseTask::Run<async, GetRunner>(*isolate, *this, key_handle, maybe_options);
}

/**
 * Delete a property on this reference
 */
class DeleteRunner final : public AccessorRunner {
	public:
		DeleteRunner(ReferenceHandle& that, Local<Value> key_handle) :
		AccessorRunner{that, key_handle} {}

		void Phase2() final {
			auto context = Deref(this->context);
			Context::Scope context_scope{context};
			auto object = GetTargetAndAlsoCheckForProxy();
			if (!Unmaybe(object->Delete(context, GetKey(context)))) {
				throw RuntimeTypeError("Delete failed");
			}
		}

		auto Phase3() -> Local<Value> final {
			return Undefined(Isolate::GetCurrent());
		}
};
template <int async>
auto ReferenceHandle::Delete(Local<Value> key_handle) -> Local<Value> {
	return ThreePhaseTask::Run<async, DeleteRunner>(*isolate, *this, key_handle);
}

/**
 * Attempt to set a property on this reference
 */
class SetRunner final : public AccessorRunner {
	public:
		SetRunner(
			ReferenceHandle& that,
			Local<Value> key_handle,
			Local<Value> val_handle,
			MaybeLocal<Object> maybe_options
		) :
		AccessorRunner{that, key_handle},
		val{TransferOut(val_handle, TransferOptions{maybe_options})} {}

		void Phase2() final {
			auto context = Deref(this->context);
			Context::Scope context_scope{context};
			auto name = GetKey(context);
			auto object = GetTargetAndAlsoCheckForProxy();
			// Delete key before transferring in, potentially freeing up some v8 heap
			Unmaybe(object->Delete(context, name));
			auto val_inner = val->TransferIn();
			if (!Unmaybe(object->CreateDataProperty(context, GetKey(context), val_inner))) {
				throw RuntimeTypeError("Set failed");
			}
		}

		auto Phase3() -> Local<Value> final {
			return Undefined(Isolate::GetCurrent());
		}

	private:
		unique_ptr<Transferable> val;
};
template <int async>
auto ReferenceHandle::Set(Local<Value> key_handle, Local<Value> val_handle, MaybeLocal<Object> maybe_options) -> Local<Value> {
	return ThreePhaseTask::Run<async, SetRunner>(*isolate, *this, key_handle, val_handle, maybe_options);
}

void ReferenceHandle::CheckDisposed() const {
	if (!reference) {
		throw RuntimeGenericError("Reference has been released");
	}
}

/**
 * ReferenceHandleTransferable implementation
 */
auto ReferenceHandleTransferable::TransferIn() -> Local<Value> {
	return ClassHandle::NewInstance<ReferenceHandle>(std::move(*this));
}

} // namespace ivm
