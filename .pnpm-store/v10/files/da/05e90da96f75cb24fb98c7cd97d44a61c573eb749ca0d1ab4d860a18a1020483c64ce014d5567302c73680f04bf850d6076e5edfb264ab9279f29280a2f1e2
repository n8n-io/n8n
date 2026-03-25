#pragma once
#include "external_copy.h"
#include "isolate/environment.h"
#include <deque>
#include <memory>
#include <vector>

namespace ivm {
namespace detail {

class SerializationDelegateBase {
	public:
		SerializationDelegateBase(
			std::deque<std::unique_ptr<Transferable>>& transferables,
			std::deque<v8::CompiledWasmModule>& wasm_modules
		) : transferables{transferables}, wasm_modules{wasm_modules} {}

	protected:
		std::deque<std::unique_ptr<Transferable>>& transferables;
		std::deque<v8::CompiledWasmModule>& wasm_modules;
};

class SerializerDelegate : public SerializationDelegateBase, public v8::ValueSerializer::Delegate {
	public:
		using SerializationDelegateBase::SerializationDelegateBase;

		void SetSerializer(v8::ValueSerializer* serializer) { this->serializer = serializer; }
		void ThrowDataCloneError(v8::Local<v8::String> message) final;

		auto GetSharedArrayBufferId(
			v8::Isolate* isolate, v8::Local<v8::SharedArrayBuffer> shared_array_buffer) -> v8::Maybe<uint32_t> final;
		auto GetWasmModuleTransferId(
			v8::Isolate* isolate, v8::Local<v8::WasmModuleObject> module) -> v8::Maybe<uint32_t> final;
		auto WriteHostObject(v8::Isolate* isolate, v8::Local<v8::Object> object) -> v8::Maybe<bool> final;

	private:
		v8::ValueSerializer* serializer = nullptr;
};

class DeserializerDelegate : public SerializationDelegateBase, public v8::ValueDeserializer::Delegate {
	public:
		using SerializationDelegateBase::SerializationDelegateBase;

		void SetDeserializer(v8::ValueDeserializer* deserializer) { this->deserializer = deserializer; }

		auto GetSharedArrayBufferFromId(
			v8::Isolate* isolate, uint32_t clone_id) -> v8::MaybeLocal<v8::SharedArrayBuffer> final;
		auto GetWasmModuleFromId(
			v8::Isolate* isolate, uint32_t transfer_id) -> v8::MaybeLocal<v8::WasmModuleObject> final;
		auto ReadHostObject(v8::Isolate* isolate) -> v8::MaybeLocal<v8::Object> final;

	private:
		v8::ValueDeserializer* deserializer = nullptr;
};

} // namespace detail

/**
 * Abstract serializer which manages boilerplate and lifecycle management of the serialized blob
 */
class BaseSerializer {
	protected:
		template <class Fn>
		explicit BaseSerializer(Fn fn) {
			// Initialize serializer and delegate
			auto* isolate = v8::Isolate::GetCurrent();
			auto context = isolate->GetCurrentContext();
			detail::SerializerDelegate delegate{transferables, wasm_modules};
			v8::ValueSerializer serializer{isolate, &delegate};
			delegate.SetSerializer(&serializer);

			// Run serialization
			serializer.WriteHeader();
			fn(serializer, context);

			// Save to buffer
			auto serialized_data = serializer.Release();
			buffer = {serialized_data.first, std::free};
			size = serialized_data.second;
		}

		template <class Fn>
		auto Deserialize(Fn fn) {
			// Initialize deserializer and delegate
			auto* isolate = v8::Isolate::GetCurrent();
			auto context = isolate->GetCurrentContext();
			detail::DeserializerDelegate delegate{transferables, wasm_modules};
			v8::ValueDeserializer deserializer{isolate, buffer.get(), size, &delegate};
			delegate.SetDeserializer(&deserializer);

			// Watch for allocation errors
			auto* allocator = IsolateEnvironment::GetCurrent().GetLimitedAllocator();
			int failures = allocator == nullptr ? 0 : allocator->GetFailureCount();
			Unmaybe(deserializer.ReadHeader(context));

			// Run implementation
			if (!fn(deserializer, context)) {
				// ValueDeserializer throws an unhelpful message when it fails to allocate an ArrayBuffer, so
				// detect that case here and throw an appropriate message.
				if (allocator != nullptr && allocator->GetFailureCount() != failures) {
					throw RuntimeRangeError("Array buffer allocation failed");
				} else {
					throw RuntimeError();
				}
			}
		}

	private:
		std::unique_ptr<uint8_t, decltype(std::free)*> buffer = {nullptr, std::free};
		std::deque<std::unique_ptr<Transferable>> transferables;
		std::deque<v8::CompiledWasmModule> wasm_modules;
		size_t size;
};

/**
 * Single serialized value compatible with `Transferable`
 */
class ExternalCopySerialized : public BaseSerializer, public ExternalCopy {
	public:
		ExternalCopySerialized(v8::Local<v8::Value> value, ArrayRange transfer_list);
		auto CopyInto(bool transfer_in = false) -> v8::Local<v8::Value> final;

	private:
		std::vector<std::unique_ptr<ExternalCopyArrayBuffer>> array_buffers;
};

class SerializedVector : public BaseSerializer {
	public:
		explicit SerializedVector(const v8::FunctionCallbackInfo<v8::Value>& info);
		auto CopyIntoAsVector() -> std::vector<v8::Local<v8::Value>>;

	private:
		std::vector<std::unique_ptr<ExternalCopyArrayBuffer>> array_buffers;
};

} // namespace ivm
