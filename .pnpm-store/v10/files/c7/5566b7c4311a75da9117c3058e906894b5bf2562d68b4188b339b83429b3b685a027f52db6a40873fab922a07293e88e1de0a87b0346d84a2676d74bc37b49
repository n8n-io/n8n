#include "serializer.h"
#include "isolate/functor_runners.h"
#include "module/transferable.h"

/**
 * This file is compiled *without* runtime type information, which matches the nodejs binary and
 * allows the serializer delegates to resolve correctly.
 */

using namespace v8;

namespace ivm::detail {

void SerializerDelegate::ThrowDataCloneError(Local<String> message) {
	Isolate::GetCurrent()->ThrowException(Exception::TypeError(message));
}

auto SerializerDelegate::GetSharedArrayBufferId(
		Isolate* /*isolate*/, Local<SharedArrayBuffer> shared_array_buffer) -> Maybe<uint32_t> {
	auto result = Nothing<uint32_t>();
	detail::RunBarrier([&]() {
		transferables.emplace_back(std::make_unique<ExternalCopySharedArrayBuffer>(shared_array_buffer));
		result = Just<uint32_t>(transferables.size() - 1);
	});
	return result;
}

auto SerializerDelegate::GetWasmModuleTransferId(
		Isolate* /*isolate*/, Local<WasmModuleObject> module) -> Maybe<uint32_t> {
	auto result = Just<uint32_t>(wasm_modules.size());
	wasm_modules.emplace_back(module->GetCompiledModule());
	return result;
}

auto SerializerDelegate::WriteHostObject(Isolate* /*isolate*/, Local<Object> object) -> Maybe<bool> {
	auto result = Nothing<bool>();
	detail::RunBarrier([&]() {
		serializer->WriteUint32(transferables.size());
		transferables.emplace_back(TransferOut(object));
		result = Just(true);
	});
	return result;
}

auto DeserializerDelegate::ReadHostObject(Isolate* /*isolate*/) -> MaybeLocal<Object> {
	MaybeLocal<Object> result;
	detail::RunBarrier([&]() {
		uint32_t ii;
		assert(deserializer->ReadUint32(&ii));
		result = transferables[ii]->TransferIn().As<Object>();
	});
	return result;
}

auto DeserializerDelegate::GetSharedArrayBufferFromId(
		Isolate* /*isolate*/, uint32_t clone_id) -> MaybeLocal<SharedArrayBuffer> {
	MaybeLocal<SharedArrayBuffer> result;
	detail::RunBarrier([&]() {
		result = transferables[clone_id]->TransferIn().As<SharedArrayBuffer>();
	});
	return result;
}

auto DeserializerDelegate::GetWasmModuleFromId(
		Isolate* isolate, uint32_t transfer_id) -> MaybeLocal<WasmModuleObject> {
	MaybeLocal<WasmModuleObject> result;
	detail::RunBarrier([&]() {
		result = WasmModuleObject::FromCompiledModule(isolate, wasm_modules[transfer_id]);
	});
	return result;
}

} // namespace ivm::detail
