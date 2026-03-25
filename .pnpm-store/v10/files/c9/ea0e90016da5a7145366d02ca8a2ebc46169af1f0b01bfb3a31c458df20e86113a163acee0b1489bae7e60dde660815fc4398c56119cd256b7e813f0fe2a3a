#include "external_copy_handle.h"
#include "external_copy/external_copy.h"

using namespace v8;
using std::shared_ptr;
using std::unique_ptr;

namespace ivm {

/**
 * Transferable wrapper
 */
ExternalCopyHandle::ExternalCopyTransferable::ExternalCopyTransferable(std::shared_ptr<ExternalCopy> value) : value(std::move(value)) {}

auto ExternalCopyHandle::ExternalCopyTransferable::TransferIn() -> Local<Value> {
	return ClassHandle::NewInstance<ExternalCopyHandle>(value);
}

/**
 * ExternalCopyHandle implementation
 */
ExternalCopyHandle::ExternalCopyHandle(shared_ptr<ExternalCopy> value) : value(std::move(value)), size{this->value->Size()} {
	Isolate::GetCurrent()->AdjustAmountOfExternalAllocatedMemory(size);
}

ExternalCopyHandle::~ExternalCopyHandle() {
	Isolate::GetCurrent()->AdjustAmountOfExternalAllocatedMemory(-size);
}

static std::unique_ptr<ExternalCopyHandle> ExternalCopyHandle_New_Wrapper(
	v8::Local<v8::Value> value, v8::MaybeLocal<v8::Object> options
) {
	return ExternalCopyHandle::New(value, options);
}

auto ExternalCopyHandle::Definition() -> Local<FunctionTemplate> {
	return Inherit<TransferableHandle>(MakeClass(
		"ExternalCopy", ConstructorFunction<decltype(&ExternalCopyHandle_New_Wrapper), &ExternalCopyHandle_New_Wrapper>{},
		"totalExternalSize", StaticAccessor<decltype(&ExternalCopyHandle::TotalExternalSizeGetter), &ExternalCopyHandle::TotalExternalSizeGetter>{},
		"copy", MemberFunction<decltype(&ExternalCopyHandle::Copy), &ExternalCopyHandle::Copy>{},
		"copyInto", MemberFunction<decltype(&ExternalCopyHandle::CopyInto), &ExternalCopyHandle::CopyInto>{},
		"release", MemberFunction<decltype(&ExternalCopyHandle::Release), &ExternalCopyHandle::Release>{}
	));
}

auto ExternalCopyHandle::TransferOut() -> unique_ptr<Transferable> {
	return std::make_unique<ExternalCopyTransferable>(value);
}

auto ExternalCopyHandle::New(Local<Value> value, MaybeLocal<Object> maybe_options) -> unique_ptr<ExternalCopyHandle> {
	Local<Object> options;
	bool transfer_out = false;
	ArrayRange transfer_list;
	if (maybe_options.ToLocal(&options)) {
		transfer_out = ReadOption<bool>(options, StringTable::Get().transferOut, false);
		transfer_list = ReadOption<ArrayRange>(options, StringTable::Get().transferList, {});
	}
	return std::make_unique<ExternalCopyHandle>(shared_ptr<ExternalCopy>(ExternalCopy::Copy(value, transfer_out, transfer_list)));
}

void ExternalCopyHandle::CheckDisposed() const {
	if (!value) {
		throw RuntimeGenericError("Copy has been released");
	}
}

/**
 * JS API functions
 */
auto ExternalCopyHandle::TotalExternalSizeGetter() -> Local<Value> {
	return Number::New(Isolate::GetCurrent(), ExternalCopy::TotalExternalSize());
}

auto ExternalCopyHandle::Copy(MaybeLocal<Object> maybe_options) -> Local<Value> {
	CheckDisposed();
	bool release = ReadOption<bool>(maybe_options, StringTable::Get().release, false);
	bool transfer_in = ReadOption<bool>(maybe_options, StringTable::Get().transferIn, false);
	Local<Value> ret = value->CopyIntoCheckHeap(transfer_in);
	if (release) {
		Release();
	}
	return ret;
}

auto ExternalCopyHandle::CopyInto(MaybeLocal<Object> maybe_options) -> Local<Value> {
	CheckDisposed();
	bool release = ReadOption<bool>(maybe_options, StringTable::Get().release, false);
	bool transfer_in = ReadOption<bool>(maybe_options, StringTable::Get().transferIn, false);
	Local<Value> ret = ClassHandle::NewInstance<ExternalCopyIntoHandle>(value, transfer_in);
	if (release) {
		Release();
	}
	return ret;
}

auto ExternalCopyHandle::Release() -> Local<Value> {
	CheckDisposed();
	Isolate::GetCurrent()->AdjustAmountOfExternalAllocatedMemory(-std::exchange(size, 0));
	value.reset();
	return Undefined(Isolate::GetCurrent());
}

/**
 * ExternalCopyIntoHandle implementation
 */
ExternalCopyIntoHandle::ExternalCopyIntoTransferable::ExternalCopyIntoTransferable(shared_ptr<ExternalCopy> value, bool transfer_in) : value(std::move(value)), transfer_in(transfer_in) {}

auto ExternalCopyIntoHandle::ExternalCopyIntoTransferable::TransferIn() -> Local<Value> {
	return value->CopyIntoCheckHeap(transfer_in);
}

ExternalCopyIntoHandle::ExternalCopyIntoHandle(shared_ptr<ExternalCopy> value, bool transfer_in) : value(std::move(value)), transfer_in(transfer_in) {}

auto ExternalCopyIntoHandle::Definition() -> Local<FunctionTemplate> {
	return Inherit<TransferableHandle>(MakeClass("ExternalCopyInto", nullptr));
}

auto ExternalCopyIntoHandle::TransferOut() -> unique_ptr<Transferable> {
	if (!value) {
		throw RuntimeGenericError("The return value of `copyInto()` should only be used once");
	}
	return std::make_unique<ExternalCopyIntoTransferable>(std::move(value), transfer_in);
}

} // namespace ivm
