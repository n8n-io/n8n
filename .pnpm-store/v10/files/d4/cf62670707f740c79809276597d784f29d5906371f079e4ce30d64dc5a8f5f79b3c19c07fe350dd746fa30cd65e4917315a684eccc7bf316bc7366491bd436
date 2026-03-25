#include "module_handle.h"
#include "context_handle.h"
#include "reference_handle.h"
#include "transferable.h"
#include "isolate/class_handle.h"
#include "isolate/run_with_timeout.h"
#include "isolate/three_phase_task.h"

#include <algorithm>

using namespace v8;
using std::shared_ptr;

namespace ivm {


namespace {

auto LookupModuleInfo(Local<Module> module) {
	auto& module_map = IsolateEnvironment::GetCurrent().module_handles;
	auto range = module_map.equal_range(module->GetIdentityHash());
	auto it = std::find_if(range.first, range.second, [&](decltype(*module_map.begin()) data) {
		return data.second->handle.Deref() == module;
	});
	return it == range.second ? nullptr : it->second;
}

} // anonymous namespace

ModuleInfo::ModuleInfo(Local<Module> handle) : identity_hash{handle->GetIdentityHash()}, handle{handle} {
	// Add to isolate's list of modules
	IsolateEnvironment::GetCurrent().module_handles.emplace(identity_hash, this);
	// Grab all dependency specifiers
	Isolate* isolate = Isolate::GetCurrent();
	auto context = isolate->GetCurrentContext();
	auto& requests = **handle->GetModuleRequests();
	dependency_specifiers.reserve(requests.Length());
	for (int ii = 0; ii < requests.Length(); ii++) {
		auto request = requests.Get(context, ii).As<ModuleRequest>();
		dependency_specifiers.emplace_back(*String::Utf8Value{isolate, request->GetSpecifier()});
	}
}

ModuleInfo::~ModuleInfo() {
	// Remove from isolate's list of modules
	auto environment = handle.GetIsolateHolder()->GetIsolate();
	if (environment) {
		auto& module_map = environment->module_handles;
		auto range = module_map.equal_range(identity_hash);
		auto it = std::find_if(range.first, range.second, [&](decltype(*module_map.begin()) data) {
			return this == data.second;
		});
		assert(it != range.second);
		module_map.erase(it);
	}
}

ModuleHandle::ModuleHandleTransferable::ModuleHandleTransferable(shared_ptr<ModuleInfo> info) : info(std::move(info)) {}

auto ModuleHandle::ModuleHandleTransferable::TransferIn() -> Local<Value> {
	return ClassHandle::NewInstance<ModuleHandle>(info);
};

ModuleHandle::ModuleHandle(shared_ptr<ModuleInfo> info) : info(std::move(info)) {}

auto ModuleHandle::Definition() -> Local<FunctionTemplate> {
	return Inherit<TransferableHandle>(MakeClass(
		"Module", nullptr,
		"dependencySpecifiers", MemberAccessor<decltype(&ModuleHandle::GetDependencySpecifiers), &ModuleHandle::GetDependencySpecifiers>{},
		"instantiate", MemberFunction<decltype(&ModuleHandle::Instantiate), &ModuleHandle::Instantiate>{},
		"instantiateSync", MemberFunction<decltype(&ModuleHandle::InstantiateSync), &ModuleHandle::InstantiateSync>{},
		"evaluate", MemberFunction<decltype(&ModuleHandle::Evaluate<1>), &ModuleHandle::Evaluate<1>>{},
		"evaluateSync", MemberFunction<decltype(&ModuleHandle::Evaluate<0>), &ModuleHandle::Evaluate<0>>{},
		"namespace", MemberAccessor<decltype(&ModuleHandle::GetNamespace), &ModuleHandle::GetNamespace>{},
		"release", MemberFunction<decltype(&ModuleHandle::Release), &ModuleHandle::Release>{}
	));
}

auto ModuleHandle::TransferOut() -> std::unique_ptr<Transferable> {
	return std::make_unique<ModuleHandleTransferable>(info);
}

auto ModuleHandle::GetDependencySpecifiers() -> Local<Value> {
	Isolate* isolate = Isolate::GetCurrent();
	size_t length = info->dependency_specifiers.size();
	Local<Array> deps = Array::New(isolate, length);
	for (size_t ii = 0; ii < length; ++ii) {
		Unmaybe(deps->Set(isolate->GetCurrentContext(), ii, v8_string(info->dependency_specifiers[ii].c_str())));
	}
	return deps;
}

auto ModuleHandle::GetInfo() const -> std::shared_ptr<ModuleInfo> {
	if (!info) {
		throw RuntimeGenericError("Module has been released");
	}
	return info;
}

auto ModuleHandle::Release() -> Local<Value> {
	info.reset();
	return Undefined(Isolate::GetCurrent());
}

void ModuleHandle::InitializeImportMeta(Local<Context> context, Local<Module> module, Local<Object> meta) {
	ModuleInfo* found = LookupModuleInfo(module);
	if (found != nullptr) {
		if (found->meta_callback) {
			detail::RunBarrier([&]() {
				Local<Value> argv[1];
				argv[0] = meta;
				Unmaybe(found->meta_callback.Deref()->Call(context, Undefined(context->GetIsolate()), 1, argv));
			});
		}
	}
}

/**
 * Implements the module linking logic used by `instantiate`. This is implemented as a class handle
 * so v8 can manage the lifetime of the linker. If a promise fails to resolve then v8 will be
 * responsible for calling the destructor.
 */
class ModuleLinker : public ClassHandle {
	public:
		/**
		 * These methods are split out from the main class so I don't have to recreate the class
		 * inheritance in v8
		 */
		struct Implementation {
			RemoteHandle<Object> linker;
			explicit Implementation(Local<Object> linker) : linker(linker) {}
			virtual ~Implementation() = default;
			virtual void HandleCallbackReturn(ModuleHandle* module, size_t ii, Local<Value> value) = 0;
			virtual auto Begin(ModuleHandle& module, RemoteHandle<Context> context) -> Local<Value> = 0;
			auto GetLinker() const -> ModuleLinker& {
				auto* ptr = ClassHandle::Unwrap<ModuleLinker>(linker.Deref());
				assert(ptr);
				return *ptr;
			}
		};

	private:
		RemoteHandle<Function> callback;
		std::unique_ptr<Implementation> impl;
		std::vector<std::shared_ptr<ModuleInfo>> modules;

	public:
		static auto Definition() -> v8::Local<v8::FunctionTemplate> {
			return MakeClass("Linker", nullptr);
		}

		explicit ModuleLinker(Local<Function> callback) : callback(callback) {}

		ModuleLinker(const ModuleLinker&) = delete;
		auto operator=(const ModuleLinker&) = delete;

		~ModuleLinker() override {
			Reset();
		}

		template <typename T>
		void SetImplementation() {
			impl = std::make_unique<T>(This());
		}

		template <typename T>
		auto GetImplementation() -> T* {
			return dynamic_cast<T*>(impl.get());
		}

		auto Begin(ModuleHandle& module, RemoteHandle<Context> context) -> Local<Value> {
			return impl->Begin(module, std::move(context));
		}

		void ResolveDependency(size_t ii, ModuleInfo& module, ModuleHandle* dependency) {
			{
				// I don't think the lock is actually needed here because this linker has already claimed
				// the whole module, and this code will only be running in a single thread.. but putting
				// up the lock is probably good practice or something.
				std::lock_guard<std::mutex> lock(module.mutex);
				module.resolutions[module.dependency_specifiers[ii]] = dependency->GetInfo();
			}
			Link(dependency);
		}

		void Link(ModuleHandle* module) {
			// Check current link status
			auto info = module->GetInfo();
			{
				std::lock_guard<std::mutex> lock(info->mutex);
				switch (info->link_status) {
					case ModuleInfo::LinkStatus::None:
						info->link_status = ModuleInfo::LinkStatus::Linking;
						info->linker = this;
						break;
					case ModuleInfo::LinkStatus::Linking:
						if (info->linker != this) {
							throw RuntimeGenericError("Module is currently being linked by another linker");
						}
						return;
					case ModuleInfo::LinkStatus::Linked:
						return;
				}
			}
			// Recursively link
			modules.emplace_back(info);
			Isolate* isolate = Isolate::GetCurrent();
			Local<Context> context = isolate->GetCurrentContext();
			Local<Value> recv = Undefined(isolate);
			Local<Value> argv[2];
			argv[1] = module->This();
			Local<Function> fn = callback.Deref();
			for (size_t ii = 0; ii < info->dependency_specifiers.size(); ++ii) {
				argv[0] = v8_string(info->dependency_specifiers[ii].c_str());
				impl->HandleCallbackReturn(module, ii, Unmaybe(fn->Call(context, recv, 2, argv)));
			}
		}

		void Reset(ModuleInfo::LinkStatus status = ModuleInfo::LinkStatus::None) {
			// Clears out dependency info. If the module wasn't instantiated this resets them back to
			// their original state. If it was instantiated then we don't need the dependencies anymore
			// anyway.
			for (auto& module : modules) {
				std::lock_guard<std::mutex> lock(module->mutex);
				module->linker = nullptr;
				module->link_status = status;
				module->resolutions.clear();
			}
			modules.clear();
			impl.reset();
		}
};

/**
 * Runner for `instantiate`. By the time this is invoked the module will already have all its
 * dependencies resolved by the linker.
 */
struct InstantiateRunner : public ThreePhaseTask {
	RemoteHandle<Context> context;
	shared_ptr<ModuleInfo> info;
	RemoteHandle<Object> linker;

	static auto ResolveCallback(Local<Context> /*context*/, Local<String> specifier, Local<FixedArray> /*import_assertions*/, Local<Module> referrer) -> MaybeLocal<Module> {
		MaybeLocal<Module> ret;
		detail::RunBarrier([&]() {
			// Lookup ModuleInfo* instance from `referrer`
			ModuleInfo* found = LookupModuleInfo(referrer);
			if (found != nullptr) {
				// nb: lock is already acquired in `Instantiate`
				auto& resolutions = found->resolutions;
				auto it = resolutions.find(*String::Utf8Value{Isolate::GetCurrent(), specifier});
				if (it != resolutions.end()) {
					ret = it->second->handle.Deref();
					return;
				}
			}
			throw RuntimeGenericError("Dependency was left unresolved. Please report this error on github.");
		});
		return ret;
	}

	InstantiateRunner(
		RemoteHandle<Context> context,
		shared_ptr<ModuleInfo> info,
		Local<Object> linker
	) :
		context(std::move(context)),
		info(std::move(info)),
		linker(linker) {
		// Sanity check
		if (this->info->handle.GetIsolateHolder() != this->context.GetIsolateHolder()) {
			throw RuntimeGenericError("Invalid context");
		}
	}

	void Phase2() final {
		Local<Module> mod = info->handle.Deref();
		Local<Context> context_local = context.Deref();
		info->context_handle = std::move(context);
		std::lock_guard<std::mutex> lock{info->mutex};
		TryCatch try_catch{Isolate::GetCurrent()};
		try {
			Unmaybe(mod->InstantiateModule(context_local, ResolveCallback));
		} catch (...) {
			try_catch.ReThrow();
			throw;
		}
		// `InstantiateModule` will return Maybe<bool>{true} even when there are exceptions pending.
		// This condition is checked here and a C++ is thrown which will propagate out as a JS
		// exception.
		if (try_catch.HasCaught()) {
			try_catch.ReThrow();
			throw RuntimeError();
		}
	}

	auto Phase3() -> Local<Value> final {
		ClassHandle::Unwrap<ModuleLinker>(linker.Deref())->Reset(ModuleInfo::LinkStatus::Linked);
		return Undefined(Isolate::GetCurrent());
	}
};

/**
 * Async / sync implementations of the linker
 */
class ModuleLinkerSync : public ModuleLinker::Implementation {
	private:
		void HandleCallbackReturn(ModuleHandle* module, size_t ii, Local<Value> value) final {
			ModuleHandle* resolved = value->IsObject() ? ClassHandle::Unwrap<ModuleHandle>(value.As<Object>()) : nullptr;
			if (resolved == nullptr) {
				throw RuntimeTypeError("Resolved dependency was not `Module`");
			}
			GetLinker().ResolveDependency(ii, *module->GetInfo(), resolved);
		}

	public:
		using ModuleLinker::Implementation::Implementation;
		auto Begin(ModuleHandle& module, RemoteHandle<Context> context) -> Local<Value> final {
			try {
				GetLinker().Link(&module);
			} catch (const RuntimeError& err) {
				GetLinker().Reset();
				throw;
			}
			auto info = module.GetInfo();
			return ThreePhaseTask::Run<0, InstantiateRunner>(*info->handle.GetIsolateHolder(), context, info, linker.Deref());
		}
};

class ModuleLinkerAsync : public ModuleLinker::Implementation {
	private:
		RemoteTuple<Promise::Resolver, Function> async_handles;
		RemoteHandle<Context> context;
		shared_ptr<ModuleInfo> info;
		uint32_t pending = 0;

		static auto ModuleResolved(Local<Array> holder, Local<Value> value) -> Local<Value> {
			detail::RunBarrier([&]() {
				ModuleHandle* resolved = value->IsObject() ? ClassHandle::Unwrap<ModuleHandle>(value.As<Object>()) : nullptr;
				if (resolved == nullptr) {
					throw RuntimeTypeError("Resolved dependency was not `Module`");
				}
				Local<Context> context = Isolate::GetCurrent()->GetCurrentContext();
				auto* linker = ClassHandle::Unwrap<ModuleLinker>(Unmaybe(holder->Get(context, 0)).As<Object>());
				auto* impl = linker->GetImplementation<ModuleLinkerAsync>();
				if (impl == nullptr) {
					return;
				}
				auto* module = ClassHandle::Unwrap<ModuleHandle>(Unmaybe(holder->Get(context, 1)).As<Object>());
				auto ii = Unmaybe(holder->Get(context, 2)).As<Uint32>()->Value();
				linker->ResolveDependency(ii, *module->GetInfo(), resolved);
				if (--impl->pending == 0) {
					impl->Instantiate();
				}
			});
			return Undefined(Isolate::GetCurrent());
		}

		static auto ModuleRejected(ModuleLinker& linker, Local<Value> error) -> Local<Value> {
			detail::RunBarrier([&]() {
				auto* impl = linker.GetImplementation<ModuleLinkerAsync>();
				if (impl != nullptr) {
					Unmaybe(impl->async_handles.Deref<0>()->Reject(Isolate::GetCurrent()->GetCurrentContext(), error));
					linker.Reset();
				}
			});
			return Undefined(Isolate::GetCurrent());
		}

		void HandleCallbackReturn(ModuleHandle* module, size_t ii, Local<Value> value) final {
			// Resolve via Promise.resolve() so thenables will work
			++pending;
			Isolate* isolate = Isolate::GetCurrent();
			Local<Context> context = isolate->GetCurrentContext();
			Local<Promise::Resolver> resolver = Unmaybe(Promise::Resolver::New(context));
			Local<Promise> promise = resolver->GetPromise();
			Local<Array> holder = Array::New(isolate, 3);
			Unmaybe(holder->Set(context, 0, linker.Deref()));
			Unmaybe(holder->Set(context, 1, module->This()));
			Unmaybe(holder->Set(context, 2, Uint32::New(isolate, ii)));
			promise = Unmaybe(promise->Then(context, Unmaybe(
				Function::New(context, FreeFunctionWithData<decltype(&ModuleResolved), &ModuleResolved>{}.callback, holder)
			)));
			Unmaybe(promise->Catch(context, async_handles.Deref<1>()));
			Unmaybe(resolver->Resolve(context, value));
		}

		void Instantiate() {
			Unmaybe(async_handles.Deref<0>()->Resolve(
				Isolate::GetCurrent()->GetCurrentContext(),
				ThreePhaseTask::Run<1, InstantiateRunner>(*info->handle.GetIsolateHolder(), context, info, linker.Deref())
			));
		}

	public:
		explicit ModuleLinkerAsync(Local<Object> linker) : Implementation(linker), async_handles(
			Unmaybe(Promise::Resolver::New(Isolate::GetCurrent()->GetCurrentContext())),
			Unmaybe(Function::New(
				Isolate::GetCurrent()->GetCurrentContext(),
				FreeFunctionWithData<decltype(&ModuleRejected), &ModuleRejected>{}.callback, linker)
			)
		 ) {}

		using ModuleLinker::Implementation::Implementation;
		auto Begin(ModuleHandle& module, RemoteHandle<Context> context) -> Local<Value> final {
			GetLinker().Link(&module);
			info = module.GetInfo();
			this->context = std::move(context);
			if (pending == 0) {
				Instantiate();
			}
			return async_handles.Deref<0>()->GetPromise();
		}
};

auto ModuleHandle::Instantiate(ContextHandle& context_handle, Local<Function> callback) -> Local<Value> {
	auto context = context_handle.GetContext();
	Local<Object> linker_handle = ClassHandle::NewInstance<ModuleLinker>(callback);
	auto* linker = ClassHandle::Unwrap<ModuleLinker>(linker_handle);
	linker->SetImplementation<ModuleLinkerAsync>();
	return linker->Begin(*this, context);
}

auto ModuleHandle::InstantiateSync(ContextHandle& context_handle, Local<Function> callback) -> Local<Value> {
	auto context = context_handle.GetContext();
	Local<Object> linker_handle = ClassHandle::NewInstance<ModuleLinker>(callback);
	auto* linker = ClassHandle::Unwrap<ModuleLinker>(linker_handle);
	linker->SetImplementation<ModuleLinkerSync>();
	return linker->Begin(*this, context);
}

struct EvaluateRunner : public ThreePhaseTask {
	shared_ptr<ModuleInfo> info;
	std::unique_ptr<Transferable> result;
	uint32_t timeout;

	EvaluateRunner(shared_ptr<ModuleInfo> info, uint32_t ms) : info(std::move(info)), timeout(ms) {}

	void Phase2() final {
		Local<Module> mod = info->handle.Deref();
		if (mod->GetStatus() == Module::Status::kUninstantiated) {
			throw RuntimeGenericError("Module is uninstantiated");
		}
		Local<Context> context_local = Deref(info->context_handle);
		Context::Scope context_scope(context_local);
		result = OptionalTransferOut(RunWithTimeout(timeout, [&]() { return mod->Evaluate(context_local); }));
		std::lock_guard<std::mutex> lock(info->mutex);
		info->global_namespace = RemoteHandle<Value>(mod->GetModuleNamespace());
	}

	auto Phase3() -> Local<Value> final {
		if (result) {
			return result->TransferIn();
		} else {
			return Undefined(Isolate::GetCurrent()).As<Value>();
		}
	}
};

template <int async>
auto ModuleHandle::Evaluate(MaybeLocal<Object> maybe_options) -> Local<Value> {
	auto info = GetInfo();
	int32_t timeout_ms = ReadOption<int32_t>(maybe_options, StringTable::Get().timeout, 0);
	return ThreePhaseTask::Run<async, EvaluateRunner>(*info->handle.GetIsolateHolder(), info, timeout_ms);
}

auto ModuleHandle::GetNamespace() -> Local<Value> {
	std::lock_guard<std::mutex> lock(info->mutex);
	if (!info->global_namespace) {
		throw RuntimeGenericError("Module has not been instantiated.");
	}
	return ClassHandle::NewInstance<ReferenceHandle>(info->handle.GetSharedIsolateHolder(), info->global_namespace, info->context_handle, ReferenceHandle::TypeOf::Object, true, false);
}

} // namespace ivm
