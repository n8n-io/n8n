#pragma once
#include <ratio>
#include <string>
#include <thread>
#include <v8.h>

#include "executor.h"
#include "v8-profiler.h"

#include <mutex>
#include <queue>
#include <set>
#include <unordered_map>
#include <vector>
#include <list>

namespace ivm {

class IVMCpuProfile {
	public:
		explicit IVMCpuProfile(const std::shared_ptr<v8::CpuProfile>& cpuProfile);
		~IVMCpuProfile() = default;

		class CallFrame {
			public:
				explicit CallFrame(const v8::CpuProfileNode* node);
				~CallFrame() = default;

				auto ToJSObject(v8::Isolate *iso) -> v8::Local<v8::Value>;
			private:
				const char* function_name;
				const char* url;
				int script_id;
				int line_number;
				int column_number;
		};

		class ProfileNode {
			public:
				explicit ProfileNode(const v8::CpuProfileNode* node);
				~ProfileNode() = default;

				auto ToJSObject(v8::Isolate *iso) -> v8::Local<v8::Value>;
			private:
				unsigned int hit_count;
				unsigned int node_id;
				const char* bailout_reason;
				std::vector<unsigned int> children;
				CallFrame call_frame;
		};

		auto GetStartTime() const -> int64_t { return start_time; }

		auto ToJSObject(v8::Isolate *iso) -> v8::Local<v8::Value>;


	private:
		std::thread::id profile_thread;
		int64_t start_time;
		int64_t end_time;
		int64_t samples_count;
		std::vector<unsigned int> samples;
		std::vector<int64_t> timestamps;
		std::vector<ProfileNode> profileNodes;

		auto GetTidValue(v8::Isolate *iso) -> v8::Local<v8::Value>;

		auto BuildCpuProfile(v8::Isolate *iso) -> v8::Local<v8::Value>;

		void FlatNodes(const v8::CpuProfileNode* node, std::vector<ProfileNode>* nodes) { // NOLINT(misc-no-recursion)
			nodes->emplace_back(node);
			const int childrenCount = node->GetChildrenCount();

			for (int index = 0; index < childrenCount; ++index) {
				FlatNodes(node->GetChild(index), nodes);
			}
		}

};

class CpuProfileManager {
	public:
		CpuProfileManager();
		void StartProfiling(const char* title);
		auto StopProfiling(const char* title) -> std::vector<IVMCpuProfile>;
		auto IsProfiling() -> bool;
		auto InjestCpuProfile(const std::shared_ptr<v8::CpuProfile>& cpuProfile) -> void;

		CpuProfileManager(const CpuProfileManager&) = delete;
		auto operator= (const CpuProfileManager) = delete;
		~CpuProfileManager() = default;
	private:
		void CleanProfiles();

		std::set<std::string> profile_titles{};
		std::list<IVMCpuProfile> profile_items{};
		std::unordered_map<std::string, std::list<IVMCpuProfile>::iterator> profile_begin_ptrs{};
		std::mutex mutex;
};
}