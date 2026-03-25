#pragma once
#include "isolate/generic/array.h"
#include "transferable.h"
#include <v8.h>
#include <memory>

namespace ivm {

/**
 * Reference to a v8 isolate
 */
class IsolateHandle : public TransferableHandle {
	private:
		std::shared_ptr<IsolateHolder> isolate;

		class IsolateHandleTransferable : public Transferable {
			private:
				std::shared_ptr<IsolateHolder> isolate;
			public:
				explicit IsolateHandleTransferable(std::shared_ptr<IsolateHolder> isolate);
				auto TransferIn() -> v8::Local<v8::Value> final;
		};

	public:
		explicit IsolateHandle(std::shared_ptr<IsolateHolder> isolate);
		static auto Definition() -> v8::Local<v8::FunctionTemplate>;
		static auto New(v8::MaybeLocal<v8::Object> maybe_options) -> std::unique_ptr<ClassHandle>;
		auto TransferOut() -> std::unique_ptr<Transferable> final;

		template <int async> auto CreateContext(v8::MaybeLocal<v8::Object> maybe_options) -> v8::Local<v8::Value>;
		template <int async> auto CompileScript(v8::Local<v8::String> code_handle, v8::MaybeLocal<v8::Object> maybe_options) -> v8::Local<v8::Value>;
		template <int async> auto CompileModule(v8::Local<v8::String> code_handle, v8::MaybeLocal<v8::Object> maybe_options) -> v8::Local<v8::Value>;

		auto CreateInspectorSession() -> v8::Local<v8::Value>;
		auto Dispose() -> v8::Local<v8::Value>;
		template <int async> auto GetHeapStatistics() -> v8::Local<v8::Value>;
		auto GetCpuTime() -> v8::Local<v8::Value>;
		auto GetWallTime() -> v8::Local<v8::Value>;
		auto StartCpuProfiler(v8::Local<v8::String> title) -> v8::Local<v8::Value>;
		template <int async> auto StopCpuProfiler(v8::Local<v8::String> title) -> v8::Local<v8::Value>;
		
		auto GetReferenceCount() -> v8::Local<v8::Value>;
		auto IsDisposedGetter() -> v8::Local<v8::Value>;
		static auto CreateSnapshot(ArrayRange script_handles, v8::MaybeLocal<v8::String> warmup_handle) -> v8::Local<v8::Value>;
};

} // namespace ivm
