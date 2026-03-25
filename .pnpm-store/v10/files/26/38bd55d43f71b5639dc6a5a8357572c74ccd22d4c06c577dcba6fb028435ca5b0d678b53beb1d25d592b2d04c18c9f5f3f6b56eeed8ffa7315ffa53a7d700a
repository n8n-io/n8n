#pragma once
#include <v8.h>
#include <uv.h>

#include <memory>

#include "transferable.h"
#include "context_handle.h"
#include "transferable.h"

namespace ivm {

class NativeModule {
	private:
		using init_t = void(*)(v8::Isolate *, v8::Local<v8::Context>, v8::Local<v8::Object>);
		uv_lib_t lib;
		init_t init;

	public:
		explicit NativeModule(const std::string& filename);
		NativeModule(const NativeModule&) = delete;
		auto operator= (const NativeModule&) -> NativeModule& = delete;
		~NativeModule();
		void InitForContext(v8::Isolate* isolate, v8::Local<v8::Context> context, v8::Local<v8::Object> target);
};

class NativeModuleHandle : public TransferableHandle {
	private:
		class NativeModuleTransferable : public Transferable {
			private:
				std::shared_ptr<NativeModule> module;
			public:
				explicit NativeModuleTransferable(std::shared_ptr<NativeModule> module);
				auto TransferIn() -> v8::Local<v8::Value> final;
		};

		std::shared_ptr<NativeModule> module;

		template <int async>
		auto Create(ContextHandle& context_handle) -> v8::Local<v8::Value>;

	public:
		explicit NativeModuleHandle(std::shared_ptr<NativeModule> module);
		static auto Definition() -> v8::Local<v8::FunctionTemplate>;
		static auto New(v8::Local<v8::String> value) -> std::unique_ptr<NativeModuleHandle>;
		auto TransferOut() -> std::unique_ptr<Transferable> final;
};

} // namespace ivm
