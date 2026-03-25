#pragma once
#include <v8.h>
#include <atomic>
#include <cstdint>
#include <cstdlib>
#include <memory>
#include <vector>

#include "isolate/generic/array.h"
#include "isolate/allocator.h"
#include "isolate/transferable.h"
#include "isolate/util.h"
#include "lib/lockable.h"

namespace ivm {

using handle_vector_t = std::vector<v8::Local<v8::Value>>;
using transferable_vector_t = std::vector<std::unique_ptr<Transferable>>;
using array_buffer_vector_t = std::vector<std::unique_ptr<class ExternalCopyArrayBuffer>>;
using shared_buffer_vector_t = std::vector<std::unique_ptr<class ExternalCopySharedArrayBuffer>>;

class ExternalCopy : public Transferable {
	public:
		ExternalCopy() = default;
		ExternalCopy(const ExternalCopy&) = delete;
		auto operator= (const ExternalCopy&) = delete;
		~ExternalCopy() override;

		/**
		 * `Copy` may throw a v8 exception if JSON.stringify(value) throws
		 */
		static auto Copy(
			v8::Local<v8::Value> value,
			bool transfer_out = false,
			ArrayRange transfer_list = {}
		) -> std::unique_ptr<ExternalCopy>;

		/**
		 * If you give this a primitive v8::Value (except Symbol) it will return a ExternalCopy for you.
		 * Otherwise it returns nullptr. This is used to automatically move simple values between
		 * isolates where it is possible to do so perfectly.
		 */
		static auto CopyIfPrimitive(v8::Local<v8::Value> value) -> std::unique_ptr<ExternalCopy>;
		static auto CopyThrownValue(v8::Local<v8::Value> value) -> std::unique_ptr<ExternalCopy>;

		static auto TotalExternalSize() -> int;

		auto CopyIntoCheckHeap(bool transfer_in = false) -> v8::Local<v8::Value>;
		virtual auto CopyInto(bool transfer_in = false) -> v8::Local<v8::Value> = 0;
		auto Size() const -> int { return size; }
		auto TransferIn() -> v8::Local<v8::Value> final { return CopyIntoCheckHeap(); }

	protected:
		explicit ExternalCopy(int size);
		ExternalCopy(ExternalCopy&& that) noexcept;
		auto operator= (ExternalCopy&& that) noexcept -> ExternalCopy&;

		void UpdateSize(int size);

	private:
		int size = 0;
};

/**
 * Base class for ArrayBuffer and SharedArrayBuffer
 */
class ExternalCopyAnyBuffer : public ExternalCopy {
	public:
		explicit ExternalCopyAnyBuffer(std::shared_ptr<v8::BackingStore> backing_store) :
			backing_store{std::move(backing_store)} {}
		auto Acquire() const -> std::shared_ptr<v8::BackingStore> { return *backing_store.read(); }

	protected:
		lockable_t<std::shared_ptr<v8::BackingStore>> backing_store;
};

/**
 * ArrayBuffer instances
 */
class ExternalCopyArrayBuffer : public ExternalCopyAnyBuffer {
	public:
		using ExternalCopyAnyBuffer::ExternalCopyAnyBuffer;
		ExternalCopyArrayBuffer(const void* data, size_t length);
		explicit ExternalCopyArrayBuffer(v8::Local<v8::ArrayBuffer> handle);

		static auto Transfer(v8::Local<v8::ArrayBuffer> handle) -> std::unique_ptr<ExternalCopyArrayBuffer>;
		auto CopyInto(bool transfer_in = false) -> v8::Local<v8::Value> final;
};

/**
 * SharedArrayBuffer instances
 */
class ExternalCopySharedArrayBuffer : public ExternalCopyAnyBuffer {
	public:
		explicit ExternalCopySharedArrayBuffer(v8::Local<v8::SharedArrayBuffer> handle);

		auto CopyInto(bool transfer_in = false) -> v8::Local<v8::Value> final;
};

/**
 * All types of TypedArray views w/ underlying buffer handle
 */
class ExternalCopyArrayBufferView : public ExternalCopy {
	public:
		enum class ViewType { Uint8, Uint8Clamped, Int8, Uint16, Int16, Uint32, Int32, Float32, Float64, BigInt64, BigUint64, DataView };

	private:
		std::unique_ptr<ExternalCopyAnyBuffer> buffer;
		ViewType type;
		size_t byte_offset, byte_length;

	public:
		ExternalCopyArrayBufferView(std::unique_ptr<ExternalCopyAnyBuffer> buffer, ViewType type, size_t byte_offset, size_t byte_length);
		auto CopyInto(bool transfer_in = false) -> v8::Local<v8::Value> final;
};

} // namespace ivm
