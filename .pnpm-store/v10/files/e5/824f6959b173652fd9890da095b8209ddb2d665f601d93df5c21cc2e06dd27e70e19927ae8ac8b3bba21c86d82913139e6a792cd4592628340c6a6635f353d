#pragma once
#include <v8.h>
#include <memory>
#include "v8_version.h"

namespace ivm {

class LimitedAllocator : public v8::ArrayBuffer::Allocator {
	private:
		class IsolateEnvironment& env;
		size_t limit;
		size_t v8_heap;
		size_t next_check;
		int failures = 0;

	public:
		auto Check(size_t length) -> bool;
		explicit LimitedAllocator(class IsolateEnvironment& env, size_t limit);
		auto Allocate(size_t length) -> void* final;
		auto AllocateUninitialized(size_t length) -> void* final;
		void Free(void* data, size_t length) final;

		// This is used by ExternalCopy when an ArrayBuffer is transferred. The memory is not freed but
		// we should no longer count it against the isolate
		void AdjustAllocatedSize(ptrdiff_t length);
		auto GetFailureCount() const -> int;
		void Track(v8::Local<v8::Object> handle, size_t size);
};

} // namespace ivm
