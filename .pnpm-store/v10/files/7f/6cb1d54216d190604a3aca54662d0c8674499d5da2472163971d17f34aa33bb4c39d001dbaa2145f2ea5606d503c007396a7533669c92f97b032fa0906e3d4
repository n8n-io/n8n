#pragma once
#include "transferable.h"
#include <optional>
#include <v8.h>
#include <tuple>
#include <utility>

namespace ivm {

/**
 * Holds a reference to a function in an arbitrary isolate
 */
class CallbackHandle : public TransferableHandle {
	public:
		template <class ...Args>
		explicit CallbackHandle(Args&&... args) : data{std::forward<Args>(args)...} {}

		static auto Definition() -> v8::Local<v8::FunctionTemplate>;
		static auto New(v8::Local<v8::Function> fn, v8::MaybeLocal<v8::Object> maybe_options) ->
			std::unique_ptr<CallbackHandle>;
		auto TransferOut() -> std::unique_ptr<Transferable> final;

		void Release();

		struct InvokeData {
			enum class Apply { Async, Ignored, Sync };
			RemoteHandle<v8::Function> callback;
			RemoteHandle<v8::Context> context;
			Apply apply{};
		};

		struct Data : public InvokeData {
			Data() = default;

			template <class ...Args>
			Data(std::optional<std::string> name, int length, Args&&... args) :
				InvokeData{std::forward<Args>(args)...},
				name{std::move(name)}, length{length} {}

			std::optional<std::string> name;
			int length = 0;
		};

	private:
		Data data;
};

/**
 * Internal transferable handle for callback
 */
class CallbackTransferable : public Transferable {
	public:
		explicit CallbackTransferable(CallbackHandle::Data& data);
		explicit CallbackTransferable(v8::Local<v8::Function> data);
		CallbackTransferable(v8::Local<v8::Function> fn, v8::Local<v8::Context> context);

		auto TransferIn() -> v8::Local<v8::Value> final;

	private:
		static void Invoke(const v8::FunctionCallbackInfo<v8::Value>& info);
		CallbackHandle::Data data;
};

} // namespace ivm
