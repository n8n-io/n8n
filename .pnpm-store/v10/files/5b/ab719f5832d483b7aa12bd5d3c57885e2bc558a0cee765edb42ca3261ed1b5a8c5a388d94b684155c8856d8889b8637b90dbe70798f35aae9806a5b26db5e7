#pragma once
#include <ratio>
#include <string>
#include <v8.h>
#include <uv.h>

#include "executor.h"
#include "holder.h"
#include "remote_handle.h"
#include "runnable.h"
#include "scheduler.h"
#include "specific.h"
#include "strings.h"
#include "cpu_profile_manager.h"
#include "lib/covariant.h"
#include "lib/lockable.h"
#include "lib/thread_pool.h"
#include "v8-profiler.h"

#include <atomic>
#include <cassert>
#include <chrono>
#include <deque>
#include <functional>
#include <memory>
#include <mutex>
#include <queue>
#include <set>
#include <unordered_map>
#include <vector>
#include <list>

namespace ivm {

/**
 * Wrapper around Isolate with helpers to make working with multiple isolates easier.
 */
class IsolateEnvironment {
	// These are here so they can adjust `extra_allocated_memory`. TODO: Make this a method
	friend class ExternalCopyString;

	friend class Executor;
	friend class InspectorAgent;
	friend class InspectorSession;
	friend class IsolateHolder;
	friend class LimitedAllocator;
	friend class LockedScheduler;
	friend StringTable;
	friend class ThreePhaseTask;
	template <class>
	friend class IsolateSpecific;
	template <typename F>
	friend auto RunWithTimeout(uint32_t timeout_ms, F&& fn) -> v8::Local<v8::Value>;

	public:
		/**
		 * Ensures we don't blow up the v8 heap while transferring arbitrary data
		 */
		class HeapCheck {
			private:
				IsolateEnvironment& env;
				size_t extra_size_before;
				bool force;
			public:
				explicit HeapCheck(IsolateEnvironment& env, bool force = false);
				HeapCheck(const HeapCheck&) = delete;
				auto operator= (const HeapCheck&) -> HeapCheck& = delete;
				~HeapCheck() = default;
				void Epilogue();
		};

	private:

		struct ReleaseAndJoinHandle {
			std::shared_ptr<IsolateDisposeWait> dispose_wait;
			std::weak_ptr<IsolateHolder> holder;

			auto operator<(const ReleaseAndJoinHandle& right) const -> bool {
				return dispose_wait.owner_before(right.dispose_wait);
			}
		};

		// Another good candidate for std::optional<> (because this is only used by the root isolate)
		using OwnedIsolates = lockable_t<std::set<ReleaseAndJoinHandle>, true>;
		std::unique_ptr<OwnedIsolates> owned_isolates;

		v8::Isolate* isolate{};
		covariant_t<LockedScheduler, IsolatedScheduler, UvScheduler> scheduler;
		Executor executor;
		std::shared_ptr<IsolateDisposeWait> dispose_wait{std::make_shared<IsolateDisposeWait>()};
		std::weak_ptr<IsolateHolder> holder;
		std::shared_ptr<IsolateTaskRunner> task_runner;
		std::unique_ptr<class InspectorAgent> inspector_agent;
		v8::Persistent<v8::Context> default_context;
		std::shared_ptr<v8::ArrayBuffer::Allocator> allocator_ptr;
		std::shared_ptr<v8::BackingStore> snapshot_blob_ptr;
		v8::StartupData startup_data{};
		void* timer_holder = nullptr;
		size_t memory_limit = 0;
		size_t initial_heap_size_limit = 0;
		size_t misc_memory_size = 0;
		std::atomic<size_t> extra_allocated_memory = 0;
		v8::MemoryPressureLevel memory_pressure = v8::MemoryPressureLevel::kNone;
		v8::MemoryPressureLevel last_memory_pressure = v8::MemoryPressureLevel::kNone;
		bool hit_memory_limit = false;
		bool did_adjust_heap_limit = false;
		bool nodejs_isolate = false;
		std::atomic<unsigned int> remotes_count{0};
		v8::HeapStatistics last_heap {};
		// Copyable traits used to opt into destructor handle reset
		std::deque<v8::Global<v8::Promise>> unhandled_promise_rejections;
		StringTable string_table;

		std::vector<v8::Eternal<v8::Data>> specifics;
		std::unordered_map<v8::Persistent<v8::Value>*, std::pair<void(*)(void*), void*>> weak_persistents;
		std::shared_ptr<CpuProfileManager> cpu_profile_manager;

	public:
		RemoteHandle<v8::Function> error_handler;
		std::unordered_multimap<int, struct ModuleInfo*> module_handles;
		std::unordered_map<class NativeModule*, std::shared_ptr<NativeModule>> native_modules;
		int terminate_depth = 0;
		std::atomic<bool> terminated { false };

	private:

		/**
		 * If this function is called then I have failed you.
		 */
		static void OOMErrorCallback(const char* location, bool is_heap_oom);
#if V8_AT_LEAST(10, 4, 9)
		static void OOMErrorCallback(const char* location, const v8::OOMDetails& details) {
			OOMErrorCallback(location, details.is_heap_oom);
		}
#endif

		/**
		 * Called when an isolate has an uncaught error in a promise. This makes no distinction between
		 * contexts so we have to handle that ourselves.
		 */
		static void PromiseRejectCallback(v8::PromiseRejectMessage rejection);
	public:
		void PromiseWasHandled(v8::Local<v8::Promise> promise);

	private:
		static auto CodeGenCallback(v8::Local<v8::Context> context, v8::Local<v8::Value> source) -> v8::ModifyCodeGenerationFromStringsResult;
		static auto CodeGenCallback2(v8::Local<v8::Context> context, v8::Local<v8::Value> source, bool) -> v8::ModifyCodeGenerationFromStringsResult;

		/**
		 * GC hooks to kill this isolate before it runs out of memory
		 */
		static void MarkSweepCompactEpilogue(v8::Isolate* isolate, v8::GCType gc_type, v8::GCCallbackFlags gc_flags, void* data);
		static auto NearHeapLimitCallback(void* data, size_t current_heap_limit, size_t initial_heap_limit) -> size_t;
		void RequestMemoryPressureNotification(v8::MemoryPressureLevel memory_pressure, bool as_interrupt = false);
		static void MemoryPressureInterrupt(v8::Isolate* isolate, void* data);
		void CheckMemoryPressure();

		/**
		 * Wrap an existing Isolate. This should only be called for the main node Isolate.
		 */
		void IsolateCtor(v8::Isolate* isolate, v8::Local<v8::Context> context);

		/**
		 * Create a new wrapped Isolate.
		 */
		void IsolateCtor(size_t memory_limit_in_mb, std::shared_ptr<v8::BackingStore> snapshot_blob, size_t snapshot_length);

	public:
		/**
		 * The constructor should be called through the factory.
		 */
		IsolateEnvironment();
		explicit IsolateEnvironment(UvScheduler& default_scheduler);
		IsolateEnvironment(const IsolateEnvironment&) = delete;
		auto operator= (const IsolateEnvironment&) -> IsolateEnvironment = delete;
		~IsolateEnvironment();

		/**
		 * Factory method which generates an IsolateHolder.
		 */
		static auto New(v8::Isolate* isolate, v8::Local<v8::Context> context) -> std::shared_ptr<IsolateHolder> {
			auto env = std::make_shared<IsolateEnvironment>();
			auto holder = std::make_shared<IsolateHolder>(env);
			env->holder = holder;
			env->IsolateCtor(isolate, context);
			return holder;
		}

		static auto New(size_t memory_limit_in_mb, std::shared_ptr<v8::BackingStore> snapshot_blob, size_t snapshot_length) -> std::shared_ptr<IsolateHolder> {
			auto env = std::make_shared<IsolateEnvironment>(static_cast<UvScheduler&>(*Executor::GetDefaultEnvironment().scheduler));
			auto holder = std::make_shared<IsolateHolder>(env);
			env->holder = holder;
			env->IsolateCtor(memory_limit_in_mb, std::move(snapshot_blob), snapshot_length);
			return holder;
		}

		/**
		 * Return pointer the currently running IsolateEnvironment
		 */
		static auto GetCurrent() -> IsolateEnvironment& {
			auto* environment = Executor::GetCurrentEnvironment();
			assert(environment != nullptr);
			return *environment;

		}

		/**
		 * Return shared_ptr to current IsolateHolder
		 */
		static auto GetCurrentHolder() -> std::shared_ptr<IsolateHolder> {
			return Executor::GetCurrentEnvironment()->holder.lock();
		}

		auto GetScheduler() -> LockedScheduler& {
			return *scheduler;
		}

		auto GetTaskRunner() -> const std::shared_ptr<IsolateTaskRunner>& {
			return task_runner;
		}

		/**
		 * Convenience operators to work with underlying isolate
		 */
		operator v8::Isolate*() const { // NOLINT
			return isolate;
		}

		auto operator->() const -> v8::Isolate* { // Should probably remove this one..
			return isolate;
		}

		auto GetIsolate() const -> v8::Isolate* {
			return isolate;
		}

		/**
		 * Default context, useful for generating certain objects when we aren't in a context.
		 */
		auto DefaultContext() const -> v8::Local<v8::Context> {
			return v8::Local<v8::Context>::New(isolate, default_context);
		}

		/**
		 * Creates a new context. Must be used instead of Context::New() because of snapshot deserialization
		 */
		auto NewContext() -> v8::Local<v8::Context>;

		/**
		 * Called by Scheduler when there is work to be done in this isolate.
		 */
		void AsyncEntry();
	private:
		template <std::queue<std::unique_ptr<Runnable>> Scheduler::*Tasks>
		void InterruptEntryImplementation();
	public:
		void InterruptEntryAsync();
		void InterruptEntrySync();

		/**
		 * This is called after user code runs. This throws a fatal error if the memory limit was hit.
		 * If an asyncronous exception (promise) was lost, this will throw it for real.
		 */
		auto TaskEpilogue() -> std::unique_ptr<class ExternalCopy>;

		/**
		 * Get allocator used by this isolate. Will return nullptr for the default isolate.
		 */
		auto GetLimitedAllocator() const -> class LimitedAllocator*;

		/**
		 * Get the initial v8 heap_size_limit when the isolate was created.
		 */
		auto GetInitialHeapSizeLimit() const -> size_t {
			return initial_heap_size_limit;
		}

		/**
		 * Enables the inspector for this isolate.
		 */
		void EnableInspectorAgent();

		/**
		 * Returns the InspectorAgent for this Isolate.
		 */
		auto GetInspectorAgent() const -> InspectorAgent*;

		// Return IsolateHolder
		auto GetHolder() { return holder; }

		auto GetDisposeWaitHandle() {
			return dispose_wait;
		}

		/**
		 * Check memory limit flag
		 */
		auto DidHitMemoryLimit() const -> bool {
			return hit_memory_limit;
		}

		/**
		 * Not to be confused with v8's `ExternalAllocatedMemory`. This counts up how much memory this
		 * isolate is holding onto outside of v8's heap, even if that memory is shared amongst other
		 * isolates.
		 */
		auto GetExtraAllocatedMemory() const -> size_t {
			return extra_allocated_memory;
		}
		void AdjustExtraAllocatedMemory(int size) {
			extra_allocated_memory += size;
		}

		/**
		 * Returns the current number of outstanding RemoteHandles<> to this isolate.
		 */
		auto GetRemotesCount() const -> unsigned int {
			return remotes_count.load();
		}
		void AdjustRemotes(int delta) {
			remotes_count.fetch_add(delta);
		}

		/**
		 * Is this the default nodejs isolate?
		 */
		auto IsDefault() const -> bool {
			return nodejs_isolate;
		}

		/**
		 * Timer getters
		 */
		auto GetCpuTime() -> std::chrono::nanoseconds;
		auto GetWallTime() -> std::chrono::nanoseconds;

		/**
	     * CPU Profiler
		 */
		auto GetCpuProfileManager() -> CpuProfileManager*;

		/**
		 * Ask this isolate to finish everything it's doing.
		 */
		void Terminate();

		/**
		 * Since a created Isolate can be disposed of at any time we need to keep track of weak
		 * persistents to call those destructors on isolate disposal.
		 */
		void AddWeakCallback(v8::Persistent<v8::Value>* handle, void(*fn)(void*), void* param);
		void RemoveWeakCallback(v8::Persistent<v8::Value>* handle);
};

template <class Type>
template <class Functor>
auto IsolateSpecific<Type>::Deref(Functor callback) -> v8::Local<Type> {
	auto& env = *Executor::GetCurrentEnvironment();
	if (env.specifics.size() <= key) {
		assert(key <= detail::IsolateSpecificSize);
		env.specifics.resize(detail::IsolateSpecificSize);
	}
	auto& eternal = env.specifics[key];
	if (eternal.IsEmpty()) {
		auto handle = callback();
		// After `callback` is invoked `eternal` is no longer valid! The callback may reference
		// new IsolateSpecifics which will end up calling `resize` on the underlying vector.
		env.specifics[key].Set(env.isolate, handle);
		return handle;
	}
	// This is dangerous but `Local` doesn't let you upcast from `Data` to `Value`
	return HandleConvert{eternal.Get(env.isolate)}.value;
}

inline auto StringTable::Get() -> auto& {
	return Executor::GetCurrentEnvironment()->string_table;
}

auto RaiseCatastrophicError(RemoteHandle<v8::Function>& handler, const char* message) -> bool;

} // namespace ivm
