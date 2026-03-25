#pragma once
#include "lib/lockable.h"
#include "node_wrapper.h"
#include "v8_version.h"
#include <v8-platform.h>
#include <mutex>
#include <unordered_map>

namespace ivm {

// Normalize this interface from v8
class TaskRunner : public v8::TaskRunner {
	public:
		// Methods for v8::TaskRunner
		void PostTaskImpl(std::unique_ptr<v8::Task> task, const v8::SourceLocation& location) override = 0;
		void PostDelayedTaskImpl(std::unique_ptr<v8::Task> task, double delay_in_seconds, const v8::SourceLocation& location) override = 0;
		void PostIdleTaskImpl(std::unique_ptr<v8::IdleTask> /*task*/, const v8::SourceLocation& /*location*/) final { std::terminate(); }
		// Can't be final because symbol is also used in IsolatePlatformDelegate
		auto IdleTasksEnabled() -> bool override { return false; };
		auto NonNestableTasksEnabled() const -> bool final { return true; }
		// void PostNonNestableDelayedTask(std::unique_ptr<v8::Task> /*task*/, double /*delay_in_seconds*/) final { std::terminate(); }
		auto NonNestableDelayedTasksEnabled() const -> bool final { return false; }
};

class PlatformDelegate {
	public:
		PlatformDelegate() = default;
		explicit PlatformDelegate(node::MultiIsolatePlatform* node_platform) : node_platform{node_platform} {}
		PlatformDelegate(const PlatformDelegate&) = delete;
		PlatformDelegate(PlatformDelegate&&) = delete;
		~PlatformDelegate() = default; // NOLINT(modernize-use-override) -- this only sometimes inherits from v8::Platform

		auto operator=(const PlatformDelegate&) = delete;
		auto operator=(PlatformDelegate&& delegate) noexcept -> PlatformDelegate& {
			node_platform = std::exchange(delegate.node_platform, nullptr);
			return *this;
		}

		static void InitializeDelegate();
		static void RegisterIsolate(v8::Isolate* isolate, node::IsolatePlatformDelegate* isolate_delegate);
		static void UnregisterIsolate(v8::Isolate* isolate);

		node::MultiIsolatePlatform* node_platform = nullptr;
};

} // namespace ivm
