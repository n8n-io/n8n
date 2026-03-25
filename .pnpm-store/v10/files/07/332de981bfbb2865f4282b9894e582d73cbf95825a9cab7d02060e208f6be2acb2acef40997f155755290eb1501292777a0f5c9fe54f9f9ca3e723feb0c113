#include "allocator.h"
#include "environment.h"
#include <cstdlib>

using namespace v8;

namespace ivm {
namespace {

class ExternalMemoryHandle {
	public:
		ExternalMemoryHandle(Local<Object> local_handle, size_t size) :
				handle{Isolate::GetCurrent(), local_handle}, size{size} {
			handle.SetWeak(reinterpret_cast<void*>(this), &WeakCallbackV8, WeakCallbackType::kParameter);
			IsolateEnvironment::GetCurrent().AddWeakCallback(&handle, WeakCallback, this);
		}

		ExternalMemoryHandle(const ExternalMemoryHandle&) = delete;
		auto operator=(const ExternalMemoryHandle&) = delete;

		~ExternalMemoryHandle() {
			auto* allocator = IsolateEnvironment::GetCurrent().GetLimitedAllocator();
			if (allocator != nullptr) {
				allocator->AdjustAllocatedSize(-static_cast<ptrdiff_t>(size));
			}
		};

	private:
		static void WeakCallbackV8(const WeakCallbackInfo<void>& info) {
			WeakCallback(info.GetParameter());
		}

		static void WeakCallback(void* param) {
			auto* that = reinterpret_cast<ExternalMemoryHandle*>(param);
			IsolateEnvironment::GetCurrent().RemoveWeakCallback(&that->handle);
			that->handle.Reset();
			delete that;
		}

		v8::Persistent<v8::Value> handle;
		size_t size;
};

} // anonymous namespace

/**
 * ArrayBuffer::Allocator that enforces memory limits. The v8 documentation specifically says
 * that it's unsafe to call back into v8 from this class but I took a look at
 * GetHeapStatistics() and I think it'll be ok.
 */
auto LimitedAllocator::Check(const size_t length) -> bool {
	if (v8_heap + env.extra_allocated_memory + length > next_check) {
		HeapStatistics heap_statistics;
		Isolate* isolate = Isolate::GetCurrent();
		isolate->GetHeapStatistics(&heap_statistics);
		v8_heap = heap_statistics.used_heap_size();
		if (v8_heap + env.extra_allocated_memory + length > limit + env.misc_memory_size) {
			// This is might be dangerous but the tests pass soooo..
			isolate->LowMemoryNotification();
			isolate->GetHeapStatistics(&heap_statistics);
			v8_heap = heap_statistics.used_heap_size();
			if (v8_heap + env.extra_allocated_memory + length > limit + env.misc_memory_size) {
				return false;
			}
		}
		next_check = v8_heap + env.extra_allocated_memory + length + 1024 * 1024;
	}
	return v8_heap + env.extra_allocated_memory + length <= limit + env.misc_memory_size;
}

LimitedAllocator::LimitedAllocator(IsolateEnvironment& env, size_t limit) : env(env), limit(limit), v8_heap(1024 * 1024 * 4), next_check(1024 * 1024) {}

auto LimitedAllocator::Allocate(size_t length) -> void* {
	if (Check(length)) {
		env.extra_allocated_memory += length;
		return std::calloc(length, 1);
	} else {
		++failures;
		if (length <= 64) { // kMinAddedElementsCapacity * sizeof(uint32_t)
			// When a tiny TypedArray is created v8 will avoid calling the allocator and instead just use
			// the internal heap. This is all fine until someone wants a pointer to the underlying buffer,
			// in that case v8 will "materialize" an ArrayBuffer which does invoke this allocator. If the
			// allocator refuses to return a valid pointer it will result in a hard crash so we have no
			// choice but to let this allocation succeed. Luckily the amount of memory allocated is tiny
			// and will soon be freed because at the same time we terminate the isolate.
			env.extra_allocated_memory += length;
			env.Terminate();
			return std::calloc(length, 1);
		} else {
			// The places end up here are more graceful and will throw a RangeError
			return nullptr;
		}
	}
}

auto LimitedAllocator::AllocateUninitialized(size_t length) -> void* {
	if (Check(length)) {
		env.extra_allocated_memory += length;
		return std::malloc(length);
	} else {
		++failures;
		if (length <= 64) {
			env.extra_allocated_memory += length;
			env.Terminate();
			return std::malloc(length);
		} else {
			return nullptr;
		}
	}
}

void LimitedAllocator::Free(void* data, size_t length) {
	env.extra_allocated_memory -= length;
	next_check -= length;
	std::free(data);
}

void LimitedAllocator::AdjustAllocatedSize(ptrdiff_t length) {
	env.extra_allocated_memory += length;
}

auto LimitedAllocator::GetFailureCount() const -> int {
	return failures;
}

void LimitedAllocator::Track(Local<Object> handle, size_t size) {
	new ExternalMemoryHandle{handle, size};
	AdjustAllocatedSize(size);
}

} // namespace ivm
