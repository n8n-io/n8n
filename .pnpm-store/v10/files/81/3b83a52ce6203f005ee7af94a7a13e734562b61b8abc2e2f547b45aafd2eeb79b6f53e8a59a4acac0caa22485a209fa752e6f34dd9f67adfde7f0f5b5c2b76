#include "isolate/environment.h"
#include "isolate/node_wrapper.h"
#include "isolate/platform_delegate.h"
#include "isolate/scheduler.h"
#include "isolate/util.h"
#include "lib/lockable.h"
#include "callback.h"
#include "context_handle.h"
#include "external_copy_handle.h"
#include "isolate_handle.h"
#include "lib_handle.h"
#include "native_module_handle.h"
#include "reference_handle.h"
#include "script_handle.h"

#include <memory>
#include <mutex>

using namespace v8;

namespace ivm {

/**
 * The whole library is transferable so you can Inception the library into your isolates.
 */
class LibraryHandle : public TransferableHandle {
	private:
		class LibraryHandleTransferable : public Transferable {
			public:
				auto TransferIn() -> Local<Value> final {
					return LibraryHandle::Get();
				}
		};

	public:
		using DontFreezeInstance = void;

		static auto Definition() -> Local<FunctionTemplate> {
			return Inherit<TransferableHandle>(MakeClass(
				"isolated_vm", nullptr,
				"Callback", ClassHandle::GetFunctionTemplate<CallbackHandle>(),
				"Context", ClassHandle::GetFunctionTemplate<ContextHandle>(),
				"ExternalCopy", ClassHandle::GetFunctionTemplate<ExternalCopyHandle>(),
				"Isolate", ClassHandle::GetFunctionTemplate<IsolateHandle>(),
				"NativeModule", ClassHandle::GetFunctionTemplate<NativeModuleHandle>(),
				"Reference", ClassHandle::GetFunctionTemplate<ReferenceHandle>(),
				"Script", ClassHandle::GetFunctionTemplate<ScriptHandle>()
			));
		}

		auto TransferOut() -> std::unique_ptr<Transferable> final {
			return std::make_unique<LibraryHandleTransferable>();
		}

		static auto Get() -> Local<Object> {
			Local<Object> library = ClassHandle::NewInstance<LibraryHandle>().As<Object>();
			auto context = Isolate::GetCurrent()->GetCurrentContext();
			Unmaybe(library->Set(context, v8_symbol("lib"), ClassHandle::NewInstance<LibHandle>()));

			// Freeze prototypes of all classes
			auto prototype = HandleCast<Local<String>>("prototype");
			auto freeze = [&](const char* name) {
				auto fn = Unmaybe(library->Get(context, HandleCast<Local<String>>(name))).As<Function>();
				auto proto = Unmaybe(fn->Get(context, prototype)).As<Object>();
				proto->SetIntegrityLevel(context, IntegrityLevel::kFrozen);
			};
			freeze("Callback");
			freeze("Context");
			freeze("ExternalCopy");
			freeze("Isolate");
			freeze("NativeModule");
			freeze("Reference");
			freeze("Script");

			// Also freeze this prototype
			library->SetIntegrityLevel(context, IntegrityLevel::kFrozen);
			library->GetPrototype().As<Object>()->SetIntegrityLevel(context, IntegrityLevel::kFrozen);
			return library;
		}
};

// Module entry point
std::atomic<bool> did_global_init{false};
// TODO(?): This is pointer / new is here so that these dtors don't get called when the module is
// being torn down. They end up invoking a bunch of v8 functions which fail because nodejs already
// shut down the platform.
struct IsolateHolderAndJoin {
	std::shared_ptr<IsolateHolder> holder;
	std::shared_ptr<IsolateDisposeWait> dispose_wait;
};
auto* default_isolates = new lockable_t<std::unordered_map<v8::Isolate*, IsolateHolderAndJoin>>;
extern "C"
void init(Local<Object> target) {
	// Create default isolate env
	Isolate* isolate = Isolate::GetCurrent();
	Local<Context> context = isolate->GetCurrentContext();
	// Maybe this would happen if you include the module from `vm`?
	{
		auto isolates = default_isolates->write();
		assert(isolates->find(isolate) == isolates->end());
		auto holder = IsolateEnvironment::New(isolate, context);
		isolates->insert(std::make_pair(
			isolate,
			IsolateHolderAndJoin{holder, holder->GetIsolate()->GetDisposeWaitHandle()}
		));
	}
	Unmaybe(target->Set(context, v8_symbol("ivm"), LibraryHandle::Get()));

	node::AddEnvironmentCleanupHook(isolate, [](void* param) {
		auto* isolate = static_cast<v8::Isolate*>(param);
		auto it = default_isolates->read()->find(isolate);
		it->second.holder->Release();
		it->second.dispose_wait->Join();
		default_isolates->write()->erase(isolate); // `it` might have changed, don't use it
	}, isolate);


	if (!did_global_init.exchange(true)) {
		// These flags will override limits set through code. Since the main node isolate is already
		// created we can reset these so they won't affect the isolates we make.
		int argc = 4;
		const char* flags[] = {
			"--max-semi-space-size", "0",
			"--max-old-space-size", "0"
		};
		V8::SetFlagsFromCommandLine(&argc, const_cast<char**>(flags), false);

		PlatformDelegate::InitializeDelegate();
	}
}

} // namespace ivm

NODE_MODULE_INIT(/* exports, module, context */) {
	ivm::init(exports);
}
