#pragma once
#include "isolate/remote_handle.h"
#include "transferable.h"
#include <v8.h>
#include <memory>

namespace ivm {

class ContextHandle : public TransferableHandle {
	public:
		ContextHandle(RemoteHandle<v8::Context> context, RemoteHandle<v8::Value> global);
		static auto Definition() -> v8::Local<v8::FunctionTemplate>;
		auto TransferOut() -> std::unique_ptr<Transferable> final;

		auto GetContext() const -> RemoteHandle<v8::Context>;
		auto GlobalGetter() -> v8::Local<v8::Value>;
		auto Release() -> v8::Local<v8::Value>;

		template <int Async>
		auto Eval(v8::Local<v8::String> code, v8::MaybeLocal<v8::Object> maybe_options) -> v8::Local<v8::Value>;

		template <int Async>
		auto EvalClosure(
			v8::Local<v8::String> code,
			v8::Maybe<ArrayRange> maybe_arguments,
			v8::MaybeLocal<v8::Object> maybe_options
		) -> v8::Local<v8::Value>;

	private:
		RemoteHandle<v8::Context> context;
		RemoteHandle<v8::Value> global;
		RemoteHandle<v8::Object> global_reference;
};

} // namespace ivm
