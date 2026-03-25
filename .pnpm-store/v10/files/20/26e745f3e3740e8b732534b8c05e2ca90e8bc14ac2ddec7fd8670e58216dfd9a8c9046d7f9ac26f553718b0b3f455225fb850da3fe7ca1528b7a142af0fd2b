#include "external_copy.h"
#include "error.h"
#include "serializer.h"
#include "./string.h"

#include "isolate/allocator.h"
#include "isolate/environment.h"
#include "isolate/functor_runners.h"
#include "isolate/util.h"
#include "isolate/v8_version.h"

#include <algorithm>
#include <cstring>

using namespace v8;

namespace ivm {
namespace {

/**
 * This is used for Number (several C++ types), or Boolean.
 */
template <class Type>
struct ExternalCopyTemplateCtor {
	template <class Native>
	static auto New(Isolate* isolate, Native value) -> Local<Value> {
		return Type::New(isolate, value);
	}
};

template <>
struct ExternalCopyTemplateCtor<Uint32> {
	static auto New(Isolate* isolate, uint32_t value) -> Local<Value> {
		return Uint32::NewFromUnsigned(isolate, value);
	}
};

template <class Type, class Native>
class ExternalCopyTemplate : public ExternalCopy {
	public:
		explicit ExternalCopyTemplate(Local<Value> value) :
			ExternalCopy{sizeof(ExternalCopyTemplate)},
			value{value.As<Type>()->Value()} {}

		auto CopyInto(bool /*transfer_in*/ = false) -> Local<Value> final {
			return ExternalCopyTemplateCtor<Type>::New(Isolate::GetCurrent(), value);
		}

	private:
		const Native value;
};

/**
 * BigInt data
 */
struct ExternalCopyBigInt : public ExternalCopy {
	public:
		explicit ExternalCopyBigInt(Local<BigInt> value) {
			int word_count = value->WordCount();
			words.resize(word_count);
			value->ToWordsArray(&sign_bit, &word_count, words.data());
		}

		auto CopyInto(bool /*transfer_in*/ = false) -> Local<Value> final {
			return Unmaybe(BigInt::NewFromWords(
				Isolate::GetCurrent()->GetCurrentContext(), sign_bit, words.size(), words.data()));
		}

	private:
		int sign_bit = 0;
		std::vector<uint64_t> words;
};

/**
 * null and undefined
 */
class ExternalCopyNull : public ExternalCopy {
	public:
		auto CopyInto(bool /*transfer_in*/ = false) -> Local<Value> final {
			return Null(Isolate::GetCurrent());
		}
};

class ExternalCopyUndefined : public ExternalCopy {
	public:
		auto CopyInto(bool /*transfer_in*/ = false) -> v8::Local<v8::Value> final {
			return Undefined(Isolate::GetCurrent());
		}
};

// Global size counter
std::atomic<size_t> total_allocated_size {0};

} // anonymous namespace

/**
 * ExternalCopy implementation
 */
ExternalCopy::ExternalCopy(int size) : size{size} {
	total_allocated_size += size;
}

ExternalCopy::ExternalCopy(ExternalCopy&& that) noexcept : size{std::exchange(that.size, 0)} {}

ExternalCopy::~ExternalCopy() {
	total_allocated_size -= size;
}

auto ExternalCopy::operator= (ExternalCopy&& that) noexcept -> ExternalCopy& {
	size = std::exchange(that.size, 0);
	return *this;
}

auto ExternalCopy::Copy(Local<Value> value, bool transfer_out, ArrayRange transfer_list)
-> std::unique_ptr<ExternalCopy> {
	std::unique_ptr<ExternalCopy> copy = CopyIfPrimitive(value);
	if (copy) {
		return copy;
	} else if (value->IsArrayBuffer()) {
		Local<ArrayBuffer> array_buffer = Local<ArrayBuffer>::Cast(value);
		if (!transfer_out) {
			transfer_out = std::find(transfer_list.begin(), transfer_list.end(), array_buffer) != transfer_list.end();
		}
		if (transfer_out) {
			return ExternalCopyArrayBuffer::Transfer(array_buffer);
		} else {
			return std::make_unique<ExternalCopyArrayBuffer>(array_buffer);
		}
	} else if (value->IsSharedArrayBuffer()) {
		return std::make_unique<ExternalCopySharedArrayBuffer>(value.As<SharedArrayBuffer>());
	} else if (value->IsArrayBufferView()) {
		Local<ArrayBufferView> view = value.As<ArrayBufferView>();
		using ViewType = ExternalCopyArrayBufferView::ViewType;
		ViewType type;
		if (view->IsUint8Array()) {
			type = ViewType::Uint8;
		} else if (view->IsUint8ClampedArray()) {
			type = ViewType::Uint8Clamped;
		} else if (view->IsInt8Array()) {
			type = ViewType::Int8;
		} else if (view->IsUint16Array()) {
			type = ViewType::Uint16;
		} else if (view->IsInt16Array()) {
			type = ViewType::Int16;
		} else if (view->IsUint32Array()) {
			type = ViewType::Uint32;
		} else if (view->IsInt32Array()) {
			type = ViewType::Int32;
		} else if (view->IsFloat32Array()) {
			type = ViewType::Float32;
		} else if (view->IsFloat64Array()) {
			type = ViewType::Float64;
		} else if (view->IsBigInt64Array()) {
			type = ViewType::BigInt64;
		} else if (view->IsBigUint64Array()) {
			type = ViewType::BigUint64;
		} else if (view->IsDataView()) {
			type = ViewType::DataView;
		} else {
			assert(false);
		}

		// Sometimes TypedArrays don't actually have a real buffer allocated for them. The call to
		// `Buffer()` below will force v8 to attempt to create a buffer if it doesn't exist, and if
		// there is an allocation failure it will crash the process.
		if (!view->HasBuffer()) {
			auto* allocator = IsolateEnvironment::GetCurrent().GetLimitedAllocator();
			if (allocator != nullptr && !allocator->Check(view->ByteLength())) {
				throw RuntimeRangeError("Array buffer allocation failed");
			}
		}

		// `Buffer()` returns a Local<ArrayBuffer> but it may be a Local<SharedArrayBuffer>
		Local<Object> tmp = view->Buffer();
		if (tmp->IsArrayBuffer()) {
			Local<ArrayBuffer> array_buffer = tmp.As<ArrayBuffer>();
			if (!transfer_out) {
				transfer_out = std::find(transfer_list.begin(), transfer_list.end(), array_buffer) != transfer_list.end();
			}
			// Grab byte_offset and byte_length before the transfer because "neutering" the array buffer will null these out
			size_t byte_offset = view->ByteOffset();
			size_t byte_length = view->ByteLength();
			std::unique_ptr<ExternalCopyArrayBuffer> external_buffer;
			if (transfer_out) {
				external_buffer = ExternalCopyArrayBuffer::Transfer(array_buffer);
			} else {
				external_buffer = std::make_unique<ExternalCopyArrayBuffer>(array_buffer);
			}
			return std::make_unique<ExternalCopyArrayBufferView>(std::move(external_buffer), type, byte_offset, byte_length);
		} else {
			assert(tmp->IsSharedArrayBuffer());
			Local<SharedArrayBuffer> array_buffer = tmp.As<SharedArrayBuffer>();
			return std::make_unique<ExternalCopyArrayBufferView>(std::make_unique<ExternalCopySharedArrayBuffer>(array_buffer), type, view->ByteOffset(), view->ByteLength());
		}
	} else if (value->IsObject()) {
		return std::make_unique<ExternalCopySerialized>(value.As<Object>(), transfer_list);
	} else {
		throw RuntimeTypeError("Unsupported type");
	}
}

namespace {
	auto CopyIfPrimitiveImpl(Local<Value> value) -> std::unique_ptr<ExternalCopy> {
		if (value->IsString()) {
			return std::make_unique<ExternalCopyString>(value.As<String>());
		} else if (value->IsNumber()) {
			if (value->IsUint32()) {
				return std::make_unique<ExternalCopyTemplate<Uint32, uint32_t>>(value);
			} else if (value->IsInt32()) {
				return std::make_unique<ExternalCopyTemplate<Int32, int32_t>>(value);
			} else {
				// This handles Infinity, -Infinity, NaN
				return std::make_unique<ExternalCopyTemplate<Number, double>>(value);
			}
		} else if (value->IsBigInt()) {
			return std::make_unique<ExternalCopyBigInt>(value.As<BigInt>());
		} else if (value->IsBoolean()) {
			return std::make_unique<ExternalCopyTemplate<Boolean, bool>>(value);
		} else if (value->IsNull()) {
			return std::make_unique<ExternalCopyNull>();
		} else if (value->IsUndefined()) {
			return std::make_unique<ExternalCopyUndefined>();
		}
		return {};
	}
}

auto ExternalCopy::CopyIfPrimitive(Local<Value> value) -> std::unique_ptr<ExternalCopy> {
	if (!value->IsObject()) {
		return CopyIfPrimitiveImpl(value);
	}
	return {};
}

auto ExternalCopy::CopyThrownValue(Local<Value> value) -> std::unique_ptr<ExternalCopy> {
	if (value->IsObject()) {

		// Detect which subclass of Error was thrown (no better way to do this??)
		Isolate* isolate = Isolate::GetCurrent();
		Local<Object> object = Local<Object>::Cast(value);
		std::string name = *String::Utf8Value{isolate, object->GetConstructorName()};
		auto error_type = ExternalCopyError::ErrorType::CustomError;
		if (name == "Error") {
			error_type = ExternalCopyError::ErrorType::Error;
		} else if (name == "RangeError") {
			error_type = ExternalCopyError::ErrorType::RangeError;
		} else if (name == "ReferenceError") {
			error_type = ExternalCopyError::ErrorType::ReferenceError;
		} else if (name == "SyntaxError") {
			error_type = ExternalCopyError::ErrorType::SyntaxError;
		} else if (name == "TypeError") {
			error_type = ExternalCopyError::ErrorType::TypeError;
		}

		// Get error properties
		Local<Context> context = isolate->GetCurrentContext();
		TryCatch try_catch{isolate};
		auto get_property = [&](Local<Object> object, const char* key) {
			try {
				Local<Value> value = Unmaybe(object->Get(context, v8_string(key)));
				if (!value->IsUndefined()) {
					return ExternalCopyString{Unmaybe(value->ToString(context))};
				}
			} catch (const RuntimeError& cc_err) {
				try_catch.Reset();
			}
			return ExternalCopyString{};
		};
		ExternalCopyString message_copy = get_property(object, "message");
		ExternalCopyString stack_copy = get_property(object, "stack");

		// Return external error copy if this looked like an error
		if (error_type != ExternalCopyError::ErrorType::CustomError || message_copy || stack_copy) {
			ExternalCopyString name_copy;
			if (!message_copy) {
				message_copy = ExternalCopyString{""};
			}
			if (error_type == ExternalCopyError::ErrorType::CustomError) {
				name_copy = get_property(object, "name");
			}
			return std::make_unique<ExternalCopyError>(error_type, std::move(name_copy), std::move(message_copy), std::move(stack_copy));
		}
	}
	auto primitive_value = CopyIfPrimitiveImpl(value);
	if (primitive_value) {
		return primitive_value;
	}
	return std::make_unique<ExternalCopyError>(
		ExternalCopyError::ErrorType::Error,
		"An object was thrown from supplied code within isolated-vm, but that object was not an instance of `Error`."
	);
}

auto ExternalCopy::CopyIntoCheckHeap(bool transfer_in) -> Local<Value> {
	IsolateEnvironment::HeapCheck heap_check{IsolateEnvironment::GetCurrent()};
	auto value = CopyInto(transfer_in);
	heap_check.Epilogue();
	return value;
}

auto ExternalCopy::TotalExternalSize() -> int {
	return total_allocated_size;
}

void ExternalCopy::UpdateSize(int size) {
	total_allocated_size -= this->size - size;
	this->size = size;
}

/**
 * ExternalCopyError implementation
 */
ExternalCopyError::ExternalCopyError(
	ErrorType error_type,
	ExternalCopyString name,
	ExternalCopyString message,
	ExternalCopyString stack
) :
	error_type{error_type},
	name{std::move(name)},
	message{std::move(message)},
	stack{std::move(stack)} {}

ExternalCopyError::ExternalCopyError(ErrorType error_type, const char* message, const std::string& stack) :
	ExternalCopy{sizeof(ExternalCopyError)},
	error_type{error_type},
	message{ExternalCopyString{message}},
	stack{stack.empty() ? ExternalCopyString{} : ExternalCopyString{stack}} {}

auto ExternalCopyError::CopyInto(bool /*transfer_in*/) -> Local<Value> {

	// First make the exception w/ correct + message
	Local<Context> context = Isolate::GetCurrent()->GetCurrentContext();
	Local<String> message = Local<String>::Cast(this->message.CopyInto(false));
	Local<Value> handle;
	switch (error_type) {
		default:
			handle = Exception::Error(message);
			if (name) {
				Unmaybe(handle.As<Object>()->DefineOwnProperty(context, StringTable::Get().name, name.CopyInto(), PropertyAttribute::DontEnum));
			}
			break;
		case ErrorType::RangeError:
			handle = Exception::RangeError(message);
			break;
		case ErrorType::ReferenceError:
			handle = Exception::ReferenceError(message);
			break;
		case ErrorType::SyntaxError:
			handle = Exception::SyntaxError(message);
			break;
		case ErrorType::TypeError:
			handle = Exception::TypeError(message);
			break;
	}

	// Now add stack information
	if (this->stack) {
		Local<String> stack = Local<String>::Cast(this->stack.CopyInto(false));
		Unmaybe(Local<Object>::Cast(handle)->Set(context, StringTable::Get().stack, stack));
	}
	return handle;
}

/**
 * ExternalCopyAnyBuffer implementation
 */
namespace {
	void Detach(Local<ArrayBuffer> handle) {
		handle->Detach();
	}
	auto IsDetachable(Local<ArrayBuffer> handle) {
		return handle->IsDetachable();
	}
} // anonymous namespace



/**
 * ExternalCopyArrayBuffer implementation
 */
ExternalCopyArrayBuffer::ExternalCopyArrayBuffer(const void* data, size_t length) :
		ExternalCopyAnyBuffer{ArrayBuffer::NewBackingStore(
			std::malloc(length), length,
			[](void* data, size_t /*length*/, void* /*param*/) { std::free(data); },
			nullptr)}
{
	std::memcpy((*backing_store.read())->Data(), data, length);
}

ExternalCopyArrayBuffer::ExternalCopyArrayBuffer(Local<ArrayBuffer> handle) :
	ExternalCopyArrayBuffer{
		handle->GetBackingStore()->Data(),
		handle->ByteLength()
	} {}

auto ExternalCopyArrayBuffer::Transfer(Local<ArrayBuffer> handle) -> std::unique_ptr<ExternalCopyArrayBuffer> {
	if (!IsDetachable(handle)) {
		throw RuntimeGenericError("Array buffer is invalid");
	}
	auto backing_store = handle->GetBackingStore();
	Detach(handle);
	return std::make_unique<ExternalCopyArrayBuffer>(std::move(backing_store));
}

auto ExternalCopyArrayBuffer::CopyInto(bool transfer_in) -> Local<Value> {
	if (transfer_in) {
		auto backing_store = std::exchange(*this->backing_store.write(), {});
		if (!backing_store) {
			throw RuntimeGenericError("Array buffer is invalid");
		}
		UpdateSize(0);
		size_t size = backing_store->ByteLength();
		auto handle = ArrayBuffer::New(Isolate::GetCurrent(), std::move(backing_store));
		auto* allocator = IsolateEnvironment::GetCurrent().GetLimitedAllocator();
		if (allocator != nullptr) {
			allocator->Track(handle, size);
		}
		return handle;
	} else {
		auto* allocator = IsolateEnvironment::GetCurrent().GetLimitedAllocator();
		auto backing_store = *this->backing_store.read();
		if (!backing_store) {
			throw RuntimeGenericError("Array buffer is invalid");
		}
		auto size = backing_store->ByteLength();
		if (allocator != nullptr && !allocator->Check(size)) {
			// ArrayBuffer::New will crash the process if there is an allocation failure, so we check
			// here.
			throw RuntimeRangeError("Array buffer allocation failed");
		}
		auto handle = ArrayBuffer::New(Isolate::GetCurrent(), size);
		auto* data = handle->GetBackingStore()->Data();
		std::memcpy(data, backing_store->Data(), size);
		return handle;
	}
}

/**
 * ExternalCopySharedArrayBuffer implementation
 */
ExternalCopySharedArrayBuffer::ExternalCopySharedArrayBuffer(Local<SharedArrayBuffer> handle) :
	ExternalCopyAnyBuffer{handle->GetBackingStore()} {}

auto ExternalCopySharedArrayBuffer::CopyInto(bool /*transfer_in*/) -> Local<Value> {
	auto backing_store = *this->backing_store.read();
	size_t size = backing_store->ByteLength();
	auto handle = SharedArrayBuffer::New(Isolate::GetCurrent(), std::move(backing_store));
	auto* allocator = IsolateEnvironment::GetCurrent().GetLimitedAllocator();
	if (allocator != nullptr) {
		allocator->Track(handle, size);
	}
	return handle;
}

/**
 * ExternalCopyArrayBufferView implementation
 */
ExternalCopyArrayBufferView::ExternalCopyArrayBufferView(
	std::unique_ptr<ExternalCopyAnyBuffer> buffer,
	ViewType type, size_t byte_offset, size_t byte_length
) :
	ExternalCopy(sizeof(ExternalCopyArrayBufferView)),
	buffer(std::move(buffer)),
	type(type),
	byte_offset(byte_offset), byte_length(byte_length) {}

template <typename T>
auto NewTypedArrayView(Local<T> buffer, ExternalCopyArrayBufferView::ViewType type, size_t byte_offset, size_t byte_length) -> Local<Value> {
	switch (type) {
		case ExternalCopyArrayBufferView::ViewType::Uint8:
			return Uint8Array::New(buffer, byte_offset, byte_length >> 0);
		case ExternalCopyArrayBufferView::ViewType::Uint8Clamped:
			return Uint8ClampedArray::New(buffer, byte_offset, byte_length >> 0);
		case ExternalCopyArrayBufferView::ViewType::Int8:
			return Int8Array::New(buffer, byte_offset, byte_length >> 0);
		case ExternalCopyArrayBufferView::ViewType::Uint16:
			return Uint16Array::New(buffer, byte_offset, byte_length >> 1);
		case ExternalCopyArrayBufferView::ViewType::Int16:
			return Int16Array::New(buffer, byte_offset, byte_length >> 1);
		case ExternalCopyArrayBufferView::ViewType::Uint32:
			return Uint32Array::New(buffer, byte_offset, byte_length >> 2);
		case ExternalCopyArrayBufferView::ViewType::Int32:
			return Int32Array::New(buffer, byte_offset, byte_length >> 2);
		case ExternalCopyArrayBufferView::ViewType::Float32:
			return Float32Array::New(buffer, byte_offset, byte_length >> 2);
		case ExternalCopyArrayBufferView::ViewType::Float64:
			return Float64Array::New(buffer, byte_offset, byte_length >> 3);
		case ExternalCopyArrayBufferView::ViewType::BigInt64:
			return BigInt64Array::New(buffer, byte_offset, byte_length >> 3);
		case ExternalCopyArrayBufferView::ViewType::BigUint64:
			return BigUint64Array::New(buffer, byte_offset, byte_length >> 3);
		case ExternalCopyArrayBufferView::ViewType::DataView:
			return DataView::New(buffer, byte_offset, byte_length);
		default:
			throw std::exception();
	}
}

auto ExternalCopyArrayBufferView::CopyInto(bool transfer_in) -> Local<Value> {
	Local<Value> buffer = this->buffer->CopyInto(transfer_in);
	if (buffer->IsArrayBuffer()) {
		return NewTypedArrayView(buffer.As<ArrayBuffer>(), type, byte_offset, byte_length);
	} else {
		return NewTypedArrayView(buffer.As<SharedArrayBuffer>(), type, byte_offset, byte_length);
	}
}

} // namespace ivm
