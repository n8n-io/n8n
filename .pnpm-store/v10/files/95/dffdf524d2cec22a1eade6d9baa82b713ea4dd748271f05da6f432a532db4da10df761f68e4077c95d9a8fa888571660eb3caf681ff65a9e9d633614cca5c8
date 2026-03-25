#include "environment.h"
#include "allocator.h"
#include "inspector.h"
#include "isolate/cpu_profile_manager.h"
#include "isolate/generic/error.h"
#include "platform_delegate.h"
#include "runnable.h"
#include "external_copy/external_copy.h"
#include "scheduler.h"
#include "lib/suspend.h"
#include <algorithm>
#include <chrono>
#include <climits>
#include <cmath>
#include <cstdio>
#include <memory>
#include <mutex>
#include <thread>
#include <vector>
#include "v8-platform.h"
#include "v8.h"

#if USE_CLOCK_THREAD_CPUTIME_ID
#include <time.h>
#endif

#if defined __APPLE__
#include <pthread.h>
static auto GetStackBase() -> void* {
	pthread_t self = pthread_self();
	return (void*)((char*)pthread_get_stackaddr_np(self) - pthread_get_stacksize_np(self));
}
#elif defined __OpenBSD__
#include <pthread_np.h>
static auto GetStackBase() -> void* {
        pthread_t self = pthread_self();
        stack_t ss;
        void* base = nullptr;
        if (pthread_stackseg_np(self, &ss) == 0) {
                base = (void*)((char*)ss.ss_sp - ss.ss_size);
        }
	return base;
}
#elif defined __FreeBSD__
#include <pthread_np.h>
static auto GetStackBase() -> void* {
  pthread_t self = pthread_self();
  pthread_attr_t attrs;
  void* base = nullptr;
  if (pthread_attr_init(&attrs) == 0) {
    pthread_attr_get_np(self, &attrs);
    size_t size;
    pthread_attr_getstack(&attrs, &base, &size);
    pthread_attr_destroy(&attrs);
  }
  return base;
}
#elif defined __unix__
static auto GetStackBase() -> void* {
	pthread_t self = pthread_self();
	pthread_attr_t attrs;
	pthread_getattr_np(self, &attrs);
	void* base;
	size_t size;
	pthread_attr_getstack(&attrs, &base, &size);
	return base;
}
#else
static void* GetStackBase() {
	return nullptr;
}
#endif

using namespace v8;
using std::shared_ptr;
using std::unique_ptr;

namespace ivm {

std::atomic<size_t> detail::IsolateSpecificSize{0};
thread_suspend_handle::initialize suspend_init{};

namespace {
	std::mutex isolate_allocator_mutex{};
} // anonymous namespace

/**
 * HeapCheck implementation
 */
IsolateEnvironment::HeapCheck::HeapCheck(IsolateEnvironment& env, bool force) :
		env{env}, extra_size_before{env.extra_allocated_memory}, force{force} {
}

void IsolateEnvironment::HeapCheck::Epilogue() {
	if (!env.nodejs_isolate && (force || env.extra_allocated_memory != extra_size_before)) {
		Isolate* isolate = env.GetIsolate();
		HeapStatistics heap;
		isolate->GetHeapStatistics(&heap);
		if (heap.used_heap_size() + env.extra_allocated_memory > env.memory_limit) {
			isolate->LowMemoryNotification();
			isolate->GetHeapStatistics(&heap);
			if (heap.used_heap_size() + env.extra_allocated_memory > env.memory_limit) {
				env.hit_memory_limit = true;
				env.Terminate();
				throw FatalRuntimeError("Isolate was disposed during execution due to memory limit");
			}
		}
	}
}

/**
 * IsolateEnvironment implementation
 */
void IsolateEnvironment::OOMErrorCallback(const char* location, bool is_heap_oom) {
	if (RaiseCatastrophicError(IsolateEnvironment::GetCurrent().error_handler, "Catastrophic out-of-memory error")) {
		while (true) {
			using namespace std::chrono_literals;
			std::this_thread::sleep_for(100s);
		}
	}
	fprintf(stderr, "%s\nis_heap_oom = %d\n\n\n", location, static_cast<int>(is_heap_oom));
	HeapStatistics heap;
	Isolate::GetCurrent()->GetHeapStatistics(&heap);
	fprintf(stderr,
		"<--- Heap statistics --->\n"
		"total_heap_size = %zd\n"
		"total_heap_size_executable = %zd\n"
		"total_physical_size = %zd\n"
		"total_available_size = %zd\n"
		"used_heap_size = %zd\n"
		"heap_size_limit = %zd\n"
		"malloced_memory = %zd\n"
		"peak_malloced_memory = %zd\n"
		"does_zap_garbage = %zd\n",
		heap.total_heap_size(),
		heap.total_heap_size_executable(),
		heap.total_physical_size(),
		heap.total_available_size(),
		heap.used_heap_size(),
		heap.heap_size_limit(),
		heap.malloced_memory(),
		heap.peak_malloced_memory(),
		heap.does_zap_garbage()
	);
	abort();
}

void IsolateEnvironment::PromiseRejectCallback(PromiseRejectMessage rejection) {
	auto& that = IsolateEnvironment::GetCurrent();
	assert(that.isolate == Isolate::GetCurrent());
	// TODO: Revisit this in version 4.x?
	auto event = rejection.GetEvent();
	if (event == kPromiseRejectWithNoHandler) {
		that.unhandled_promise_rejections.emplace_back(that.isolate, rejection.GetPromise());
		that.unhandled_promise_rejections.back().SetWeak();
	} else if (event == kPromiseHandlerAddedAfterReject) {
		that.PromiseWasHandled(rejection.GetPromise());
	}
}

void IsolateEnvironment::PromiseWasHandled(v8::Local<v8::Promise> promise) {
	for (auto& handle : unhandled_promise_rejections) {
		if (handle == promise) {
			handle.Reset();
		}
	}
}

auto IsolateEnvironment::CodeGenCallback(Local<Context> /*context*/, Local<Value> source) -> ModifyCodeGenerationFromStringsResult {
	auto& that = IsolateEnvironment::GetCurrent();
	// This heuristic could be improved by looking up how much `timeout` this isolate has left and
	// returning early in some cases
	ModifyCodeGenerationFromStringsResult result;
	if (source->IsString() && static_cast<size_t>(source.As<String>()->Length()) > static_cast<size_t>(that.memory_limit / 8)) {
		return result;
	}
	result.codegen_allowed = true;
	return result;
}

auto IsolateEnvironment::CodeGenCallback2(Local<Context> context, Local<Value> source, bool) -> ModifyCodeGenerationFromStringsResult {
	return CodeGenCallback(context, source);
}

void IsolateEnvironment::MarkSweepCompactEpilogue(Isolate* isolate, GCType /*gc_type*/, GCCallbackFlags gc_flags, void* data) {
	auto* that = static_cast<IsolateEnvironment*>(data);
	HeapStatistics heap;
	that->isolate->GetHeapStatistics(&heap);
	size_t total_memory = heap.used_heap_size() + that->extra_allocated_memory;
	size_t memory_limit = that->memory_limit + that->misc_memory_size;
	if (total_memory > memory_limit) {
		if ((gc_flags & (GCCallbackFlags::kGCCallbackFlagCollectAllAvailableGarbage | GCCallbackFlags::kGCCallbackFlagForced)) == 0) {
			// Force full garbage collection
			that->RequestMemoryPressureNotification(MemoryPressureLevel::kCritical);
		} else {
			that->Terminate();
			that->hit_memory_limit = true;
		}
	} else if ((gc_flags & GCCallbackFlags::kGCCallbackFlagCollectAllAvailableGarbage) == 0) {
		if (that->did_adjust_heap_limit) {
			// There is also `AutomaticallyRestoreInitialHeapLimit` introduced in v8 7.3.411 / 93283bf04
			// but it seems less effective than this ratcheting strategy.
			isolate->RemoveNearHeapLimitCallback(NearHeapLimitCallback, that->memory_limit);
			isolate->AddNearHeapLimitCallback(NearHeapLimitCallback, data);
			HeapStatistics heap;
			that->isolate->GetHeapStatistics(&heap);
			if (heap.heap_size_limit() == that->initial_heap_size_limit) {
				that->did_adjust_heap_limit = false;
			}
		}
		if (total_memory + total_memory / 4 > memory_limit) {
			// Send "moderate" pressure at 80%
			that->RequestMemoryPressureNotification(MemoryPressureLevel::kModerate);
		} else {
			that->RequestMemoryPressureNotification(MemoryPressureLevel::kNone);
		}
		return;
	}
}

auto IsolateEnvironment::NearHeapLimitCallback(void* data, size_t current_heap_limit, size_t /*initial_heap_limit*/) -> size_t {
	// This callback will temporarily give the v8 vm up to an extra 1 GB of memory to prevent the
	// application from crashing.
	auto* that = static_cast<IsolateEnvironment*>(data);
	that->did_adjust_heap_limit = true;
	HeapStatistics heap;
	that->isolate->GetHeapStatistics(&heap);
	if (heap.used_heap_size() + that->extra_allocated_memory > that->memory_limit + that->misc_memory_size) {
		that->RequestMemoryPressureNotification(MemoryPressureLevel::kCritical, true);
	} else {
		that->RequestMemoryPressureNotification(MemoryPressureLevel::kModerate, true);
	}
	return current_heap_limit + 1024 * 1024 * 1024;
}

void IsolateEnvironment::RequestMemoryPressureNotification(MemoryPressureLevel memory_pressure, bool as_interrupt) {
	this->memory_pressure = memory_pressure;
	if (as_interrupt) {
		if (memory_pressure > last_memory_pressure) {
			isolate->RequestInterrupt(MemoryPressureInterrupt, static_cast<void*>(this));
		}
	} else {
		CheckMemoryPressure();
		if (memory_pressure == MemoryPressureLevel::kCritical) {
			// Reentrant GC doesn't trigger callbacks
			MarkSweepCompactEpilogue(isolate, GCType::kGCTypeMarkSweepCompact, GCCallbackFlags::kGCCallbackFlagForced, reinterpret_cast<void*>(this));
		}
	}
}

void IsolateEnvironment::MemoryPressureInterrupt(Isolate* /*isolate*/, void* data) {
	static_cast<IsolateEnvironment*>(data)->CheckMemoryPressure();
}

void IsolateEnvironment::CheckMemoryPressure() {
	if (memory_pressure != last_memory_pressure) {
		if (memory_pressure > last_memory_pressure) {
			isolate->MemoryPressureNotification(memory_pressure);
		}
		last_memory_pressure = memory_pressure;
	}
}

void IsolateEnvironment::AsyncEntry() {
	Executor::Lock lock(*this);
	if (!nodejs_isolate) {
		// Set v8 stack limit on non-default isolate. This is only needed on non-default threads while
		// on OS X because it allocates just 512kb for each pthread stack, instead of 2mb on other
		// systems. 512kb is lower than the default v8 stack size so JS stack overflows result in
		// segfaults.
		thread_local void* stack_base = GetStackBase();
		if (stack_base != nullptr) {
			// Add 24kb of padding for native code to run
			isolate->SetStackLimit(reinterpret_cast<uintptr_t>(reinterpret_cast<char*>(stack_base) + 1024 * 24));
		}
	}

	while (true) {
		std::queue<unique_ptr<Runnable>> tasks;
		std::queue<unique_ptr<Runnable>> handle_tasks;
		std::queue<unique_ptr<Runnable>> interrupts;
		{
			// Grab current tasks
			auto lock = scheduler->Lock();
			tasks = ExchangeDefault(lock->tasks);
			handle_tasks = ExchangeDefault(lock->handle_tasks);
			interrupts = ExchangeDefault(lock->interrupts);
			if (tasks.empty() && handle_tasks.empty() && interrupts.empty()) {
				lock->DoneRunning();
				return;
			}
		}

		// Execute interrupt tasks
		while (!interrupts.empty()) {
			interrupts.front()->Run();
			interrupts.pop();
		}

		// Execute handle tasks
		while (!handle_tasks.empty()) {
			handle_tasks.front()->Run();
			handle_tasks.pop();
		}

		// Execute tasks
		while (!tasks.empty()) {
			tasks.front()->Run();
			tasks.pop();
			if (terminated) {
				return;
			}
			CheckMemoryPressure();
		}
	}
}

template <std::queue<std::unique_ptr<Runnable>> Scheduler::*Tasks>
void IsolateEnvironment::InterruptEntryImplementation() {
	// Executor::Lock is already acquired
	while (true) {
		auto interrupts = [&]() {
			return ExchangeDefault((*scheduler->Lock()).*Tasks);
		}();
		if (interrupts.empty()) {
			return;
		}
		do {
			interrupts.front()->Run();
			interrupts.pop();
		} while (!interrupts.empty());
	}
}

void IsolateEnvironment::InterruptEntryAsync() {
	return InterruptEntryImplementation<&Scheduler::interrupts>();
}

void IsolateEnvironment::InterruptEntrySync() {
	return InterruptEntryImplementation<&Scheduler::sync_interrupts>();
}

IsolateEnvironment::IsolateEnvironment() :
	owned_isolates{std::make_unique<OwnedIsolates>()},
	scheduler{in_place<UvScheduler>{}, *this},
	executor{*this},
	nodejs_isolate{true} {}


IsolateEnvironment::IsolateEnvironment(UvScheduler& default_scheduler) :
	scheduler{in_place<IsolatedScheduler>{}, *this, default_scheduler},
	executor{*this} {}

void IsolateEnvironment::IsolateCtor(Isolate* isolate, Local<Context> context) {
	this->isolate = isolate;
	default_context.Reset(isolate, context);
}

void IsolateEnvironment::IsolateCtor(size_t memory_limit_in_mb, shared_ptr<v8::BackingStore> snapshot_blob, size_t snapshot_length) {
	memory_limit = memory_limit_in_mb * 1024 * 1024;
	allocator_ptr = std::make_shared<LimitedAllocator>(*this, memory_limit);
	snapshot_blob_ptr = std::move(snapshot_blob);

	// Calculate resource constraints
	ResourceConstraints rc;
	size_t young_space_in_kb = (size_t)std::pow(2, std::min(sizeof(void*) >= 8 ? 4.0 : 3.0, memory_limit_in_mb / 128.0) + 10);
	size_t old_generation_size_in_mb = memory_limit_in_mb;
	// TODO: Give `ConfigureDefaultsFromHeapSize` a try
	rc.set_max_young_generation_size_in_bytes(young_space_in_kb * 1024);
	rc.set_max_old_generation_size_in_bytes(old_generation_size_in_mb * 1024 * 1024);

	// Build isolate from create params
	Isolate::CreateParams create_params;
	create_params.constraints = rc;
	create_params.array_buffer_allocator_shared = allocator_ptr;
	if (snapshot_blob_ptr) {
		create_params.snapshot_blob = &startup_data;
		startup_data.data = reinterpret_cast<char*>(snapshot_blob_ptr->Data());
		startup_data.raw_size = snapshot_length;
	}
	task_runner = std::make_shared<IsolateTaskRunner>(holder.lock()->GetIsolate());
	{
		std::lock_guard allocator_lock{isolate_allocator_mutex};
		isolate = Isolate::Allocate();
		PlatformDelegate::RegisterIsolate(isolate, &*scheduler);
	}
	Isolate::Initialize(isolate, create_params);

	// Various callbacks
	isolate->SetOOMErrorHandler(OOMErrorCallback);
	isolate->SetPromiseRejectCallback(PromiseRejectCallback);
	isolate->SetModifyCodeGenerationFromStringsCallback(CodeGenCallback2);

	// Add GC callbacks
	isolate->AddGCEpilogueCallback(MarkSweepCompactEpilogue, static_cast<void*>(this), GCType::kGCTypeMarkSweepCompact);
	isolate->AddNearHeapLimitCallback(NearHeapLimitCallback, static_cast<void*>(this));

	// Heap statistics crushes down lots of different memory spaces into a single number. We note the
	// difference between the requested old space and v8's calculated heap size.
	HeapStatistics heap;
	isolate->GetHeapStatistics(&heap);
	initial_heap_size_limit = heap.heap_size_limit();
	misc_memory_size = heap.heap_size_limit() - memory_limit_in_mb * 1024 * 1024;

	// Create a default context for the library to use if needed
	{
		Locker locker(isolate);
		HandleScope handle_scope(isolate);
		default_context.Reset(isolate, NewContext());
	}

	// There is no asynchronous Isolate ctor so we should throw away thread specifics in case
	// the client always uses async methods
	isolate->DiscardThreadSpecificMetadata();

	// Save reference to this isolate in the default isolate
	Executor::GetDefaultEnvironment().owned_isolates->write()->insert({ dispose_wait, holder });
}

IsolateEnvironment::~IsolateEnvironment() {
	if (nodejs_isolate) {
		// Throw away all owned isolates when the root one dies
		auto isolates = *owned_isolates->read(); // copy
		for (const auto& handle : isolates) {
			auto ref = handle.holder.lock();
			if (ref) {
				ref->Dispose();
			}
		}
		for (const auto& handle : isolates) {
			handle.dispose_wait->Join();
		}
	} else {
		{
			// Grab local pointer to inspector agent with scheduler lock active
			auto agent_ptr = [&]() {
				auto lock = scheduler->Lock();
				return std::move(inspector_agent);
			}();
			// Now activate executor lock and invoke inspector agent's dtor
			Executor::Lock lock{*this};
			agent_ptr.reset();
			// Kill all weak persistents
			for (auto it = weak_persistents.begin(); it != weak_persistents.end(); ) {
				void(*fn)(void*) = it->second.first;
				void* param = it->second.second;
				++it;
				fn(param);
			}
			assert(weak_persistents.empty());
			unhandled_promise_rejections.clear();
			// Destroy outstanding tasks. Do this here while the executor lock is up.
			auto scheduler_lock = scheduler->Lock();
			ExchangeDefault(scheduler_lock->interrupts);
			ExchangeDefault(scheduler_lock->sync_interrupts);
			ExchangeDefault(scheduler_lock->handle_tasks);
			ExchangeDefault(scheduler_lock->tasks);
		}
		{
			std::lock_guard allocator_lock{isolate_allocator_mutex};
			{
				// Dispose() will call destructors for external strings and array buffers, so this lock sets the
				// "current" isolate for those C++ dtors to function correctly without locking v8
				Executor::Scope lock{*this};
				isolate->Dispose();
			}
			// Unregister from Platform
			PlatformDelegate::UnregisterIsolate(isolate);
		}
		// Unreference from default isolate
		executor.default_executor.env.owned_isolates->write()->erase({ dispose_wait, holder });
	}
	// Send notification that this isolate is totally disposed
	dispose_wait->IsolateDidDispose();
}

static void DeserializeInternalFieldsCallback(Local<Object> /*holder*/, int /*index*/, StartupData /*payload*/, void* /*data*/) {
}

auto IsolateEnvironment::NewContext() -> Local<Context> {
	auto context =
	Context::New(isolate, nullptr, {}, {}, &DeserializeInternalFieldsCallback);
	context->AllowCodeGenerationFromStrings(false);
	// TODO (but I'm not going to do it): This causes a DCHECK failure in debug builds. Tested nodejs
	// v14.17.3 & v16.5.1.
	// context->SetErrorMessageForCodeGenerationFromStrings(StringTable::Get().codeGenerationError);
	return context;
}

auto IsolateEnvironment::TaskEpilogue() -> std::unique_ptr<ExternalCopy> {
	isolate->PerformMicrotaskCheckpoint();
	CheckMemoryPressure();
	if (hit_memory_limit) {
		throw FatalRuntimeError("Isolate was disposed during execution due to memory limit");
	}
	auto rejected_promises = std::exchange(unhandled_promise_rejections, {});
	for (auto& handle : rejected_promises) {
		if (!handle.IsEmpty()) {
			Context::Scope context_scope{DefaultContext()};
			return ExternalCopy::CopyThrownValue(Deref(handle)->Result());
		}
	}
	return {};
}

auto IsolateEnvironment::GetLimitedAllocator() const -> LimitedAllocator* {
	if (nodejs_isolate) {
		return nullptr;
	} else {
		return static_cast<LimitedAllocator*>(allocator_ptr.get());
	}
}

void IsolateEnvironment::EnableInspectorAgent() {
	inspector_agent = std::make_unique<InspectorAgent>(*this);
}

auto IsolateEnvironment::GetInspectorAgent() const -> InspectorAgent* {
	return inspector_agent.get();
}

auto IsolateEnvironment::GetCpuProfileManager() -> CpuProfileManager* {
	if (!cpu_profile_manager) {
		cpu_profile_manager = std::make_shared<CpuProfileManager>();
	}
	return cpu_profile_manager.get();
}

auto IsolateEnvironment::GetCpuTime() -> std::chrono::nanoseconds {
	std::lock_guard<std::mutex> lock(executor.timer_mutex);
	std::chrono::nanoseconds time = executor.cpu_time;
	if (executor.cpu_timer != nullptr) {
		time += executor.cpu_timer->Delta(lock);
	}
	return time;
}

auto IsolateEnvironment::GetWallTime() -> std::chrono::nanoseconds {
	std::lock_guard<std::mutex> lock(executor.timer_mutex);
	std::chrono::nanoseconds time = executor.wall_time;
	if (executor.wall_timer != nullptr) {
		time += executor.wall_timer->Delta(lock);
	}
	return time;
}

void IsolateEnvironment::Terminate() {
	assert(!nodejs_isolate);
	terminated = true;

	// Destroy inspector session
	{
		auto lock = scheduler->Lock();
		lock->CancelAsync();
		if (inspector_agent) {
			inspector_agent->Terminate();
		}
	}

	// Request interrupt to ensure execution is interrupted in race conditions
	isolate->RequestInterrupt([](Isolate* isolate, void* /* param */) {
		isolate->AddBeforeCallEnteredCallback([](Isolate* isolate) {
			isolate->TerminateExecution();
		});
		isolate->TerminateExecution();
	}, nullptr);

	// Throw away Holder reference
	auto ref = holder.lock();
	if (ref) {
		ref->isolate.write()->reset();
	}
}

void IsolateEnvironment::AddWeakCallback(Persistent<Value>* handle, void(*fn)(void*), void* param) {
	if (nodejs_isolate) {
		return;
	}
	auto it = weak_persistents.find(handle);
	if (it != weak_persistents.end()) {
		throw std::logic_error("Weak callback already added");
	}
	weak_persistents.insert(std::make_pair(handle, std::make_pair(fn, param)));
}

void IsolateEnvironment::RemoveWeakCallback(Persistent<Value>* handle) {
	if (nodejs_isolate) {
		return;
	}
	auto it = weak_persistents.find(handle);
	if (it == weak_persistents.end()) {
		throw std::logic_error("Weak callback doesn't exist");
	}
	weak_persistents.erase(it);
}

void AdjustRemotes(int delta) {
	IsolateEnvironment::GetCurrent().AdjustRemotes(delta);
}

auto RaiseCatastrophicError(RemoteHandle<Function>& handler, const char* message) -> bool {
	if (!handler) {
		return false;
	}

	class ErrorTask : public Task {
		public:
			explicit ErrorTask(const char* message, RemoteHandle<Function> handler) :
				message{message}, handler{std::move(handler)} {}

			void Run() final {
				auto* isolate = Isolate::GetCurrent();
				auto context = isolate->GetCurrentContext();
				auto fn = handler.Deref();
				Local<Value> argv[] = { HandleCast<Local<String>>(message) };
				Unmaybe(fn->Call(context, Undefined(isolate), 1, argv));
			}

		private:
			const char* message;
			RemoteHandle<Function> handler;
	};
	handler.GetIsolateHolder()->ScheduleTask(std::make_unique<ErrorTask>(message, handler), false, true);
	return true;
}

} // namespace ivm
