#pragma once
#include <v8.h>
#include <memory>
#include <mutex>
#include "isolate/holder.h"
#include "isolate/remote_handle.h"
#include "transferable.h"

namespace ivm {

struct ModuleInfo {
	// Underlying data on the module. Some information is stored outside of v8 so there is a separate
	// struct to hold this data, which is then referenced by any number of handles.
	friend struct InstantiateRunner;
	friend class ModuleHandle;
	enum class LinkStatus { None, Linking, Linked };
	std::mutex mutex;
	class ModuleLinker* linker = nullptr;
	LinkStatus link_status = LinkStatus::None;
	int identity_hash;
	std::vector<std::string> dependency_specifiers;
	std::unordered_map<std::string, std::shared_ptr<ModuleInfo>> resolutions;
	RemoteHandle<v8::Module> handle;
	RemoteHandle<v8::Context> context_handle;
	RemoteHandle<v8::Value> global_namespace;
	RemoteHandle<v8::Function> meta_callback;
	explicit ModuleInfo(v8::Local<v8::Module> handle);
	ModuleInfo(const ModuleInfo&) = delete;
	auto operator=(const ModuleInfo&) = delete;
	~ModuleInfo();
};

class ModuleHandle : public TransferableHandle {
	private:
		class ModuleHandleTransferable : public Transferable {
			private:
				std::shared_ptr<ModuleInfo> info;
			public:
				explicit ModuleHandleTransferable(std::shared_ptr<ModuleInfo> info);
				auto TransferIn() -> v8::Local<v8::Value> final;
		};

		std::shared_ptr<ModuleInfo> info;

	public:
		using DontFreezeInstance = void;

		explicit ModuleHandle(std::shared_ptr<ModuleInfo> info);

		static auto Definition() -> v8::Local<v8::FunctionTemplate>;
		auto TransferOut() -> std::unique_ptr<Transferable> final;

		auto GetDependencySpecifiers() -> v8::Local<v8::Value>;
		auto GetInfo() const -> std::shared_ptr<ModuleInfo>;
		auto Release() -> v8::Local<v8::Value>;

		auto Instantiate(class ContextHandle& context_handle, v8::Local<v8::Function> callback) -> v8::Local<v8::Value>;
		auto InstantiateSync(class ContextHandle& context_handle, v8::Local<v8::Function> callback) -> v8::Local<v8::Value>;

		template <int async>
		auto Evaluate(v8::MaybeLocal<v8::Object> maybe_options) -> v8::Local<v8::Value>;

		auto GetNamespace() -> v8::Local<v8::Value>;

		static void InitializeImportMeta(v8::Local<v8::Context> context, v8::Local<v8::Module> module, v8::Local<v8::Object> meta);
};

} // namespace ivm
