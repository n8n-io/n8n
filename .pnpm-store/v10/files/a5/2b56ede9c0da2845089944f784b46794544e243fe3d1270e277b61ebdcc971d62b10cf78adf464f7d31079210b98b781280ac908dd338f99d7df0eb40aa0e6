#pragma once
#include "isolate/remote_handle.h"
#include "transferable.h"
#include "transferable.h"
#include <v8.h>
#include <memory>

namespace ivm {

class ContextHandle;

class ScriptHandle : public TransferableHandle {
	public:
		using DontFreezeInstance = void;

		explicit ScriptHandle(RemoteHandle<v8::UnboundScript> script);
		static auto Definition() -> v8::Local<v8::FunctionTemplate>;

		auto TransferOut() -> std::unique_ptr<Transferable> final;

		auto Release() -> v8::Local<v8::Value>;
		template <int async>
		auto Run(ContextHandle& context_handle, v8::MaybeLocal<v8::Object> maybe_options) -> v8::Local<v8::Value>;

	private:
		class ScriptHandleTransferable : public Transferable {
			public:
				explicit ScriptHandleTransferable(RemoteHandle<v8::UnboundScript> script);
				auto TransferIn() -> v8::Local<v8::Value> final;
			private:
				RemoteHandle<v8::UnboundScript> script;
		};

		RemoteHandle<v8::UnboundScript> script;
};

} // namespace ivm
