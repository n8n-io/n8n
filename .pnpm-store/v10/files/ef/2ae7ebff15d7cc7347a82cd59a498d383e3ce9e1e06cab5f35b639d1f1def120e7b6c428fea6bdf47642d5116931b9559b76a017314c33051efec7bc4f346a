#include "cpu_profile_manager.h"
#include "environment.h"
#include <algorithm>
#include <climits>
#include <cmath>
#include <cstdio>
#include <cstring>
#include <memory>
#include <mutex>
#include <thread>
#include <vector>
#include "isolate/strings.h"
#include "v8-platform.h"
#include "v8.h"

using namespace v8;

namespace ivm {

/**
 * CpuProfileManagerImpl
 */
IVMCpuProfile::IVMCpuProfile(const std::shared_ptr<v8::CpuProfile>& cpuProfile):
	profile_thread(std::this_thread::get_id()),
	start_time(cpuProfile->GetStartTime()),
	end_time(cpuProfile->GetEndTime()),
	samples_count(cpuProfile->GetSamplesCount()) {

	samples.reserve(samples_count);
	timestamps.reserve(samples_count);
	for (int64_t i = 0; i < samples_count; i++) {
		const int idx = static_cast<int>(i);
		samples.push_back(cpuProfile->GetSample(idx)->GetNodeId());
		timestamps.push_back(cpuProfile->GetSampleTimestamp(idx));
	}

	// handle nodes
	FlatNodes(cpuProfile->GetTopDownRoot(), &profileNodes);
}

auto IVMCpuProfile::GetTidValue(Isolate *iso) -> Local<Value>{
	const auto tid = std::hash<std::thread::id>{}(profile_thread);
	return Number::New(iso, static_cast<double>(tid));
}

auto IVMCpuProfile::BuildCpuProfile(Isolate *iso) -> Local<Value> {
	auto& strings = StringTable::Get();
	auto context = iso->GetCurrentContext();
	auto profileObject = Object::New(iso);

	Unmaybe(profileObject->Set(context, strings.startTime, Number::New(iso, static_cast<double>(start_time))));
	Unmaybe(profileObject->Set(context, strings.endTime, Number::New(iso, static_cast<double>(end_time))));

	const Local<Array> samplesArr = Array::New(iso);
	const Local<Array> timeDeltasArr = Array::New(iso);

	for (int64_t i = 0; i < samples_count; i++) {
		Unmaybe(samplesArr->Set(context, i, Number::New(iso, static_cast<double>(samples[i]))));
		Unmaybe(timeDeltasArr->Set(context, i, Number::New(iso, static_cast<double>(timestamps[i] - start_time))));
	}
	Unmaybe(profileObject->Set(context, strings.samples, samplesArr));
	Unmaybe(profileObject->Set(context, strings.timeDeltas, timeDeltasArr));

	const Local<Array> nodeArr = Array::New(iso, static_cast<int>(profileNodes.size()));
	Unmaybe(profileObject->Set(context, strings.nodes, nodeArr));

	const size_t count = profileNodes.size();
	for (size_t i = 0; i < count; i++) {
		ProfileNode node = profileNodes[i];
		Unmaybe(nodeArr->Set(context, i, node.ToJSObject(iso)));
	}

	return profileObject;
}

auto IVMCpuProfile::ToJSObject(Isolate *iso) -> Local<Value> {
	auto& strings = StringTable::Get();
	auto context = iso->GetCurrentContext();
	auto result = Object::New(iso);

	Unmaybe(result->Set(context, (v8::Local<v8::Value>)strings.threadId, GetTidValue(iso)));
	Unmaybe(result->Set(context, strings.profile, BuildCpuProfile(iso)));

	return result;
}

IVMCpuProfile::CallFrame::CallFrame(const v8::CpuProfileNode* node):
	function_name(node->GetFunctionNameStr()),
	url(node->GetScriptResourceNameStr()),
	script_id(node->GetScriptId()),
	line_number(node->GetLineNumber()),
	column_number(node->GetColumnNumber()) {}


auto IVMCpuProfile::CallFrame::ToJSObject(v8::Isolate *iso) -> Local<Value> {
	auto& strings = StringTable::Get();
	Local<Object> callFrame = Object::New(iso);
	const Local<Context> context = iso->GetCurrentContext();
	Unmaybe(callFrame->Set(context, strings.functionName, String::NewFromUtf8(iso, function_name).ToLocalChecked()));
	Unmaybe(callFrame->Set(context, strings.url, String::NewFromUtf8(iso, url).ToLocalChecked()));
	Unmaybe(callFrame->Set(context, strings.scriptId, Number::New(iso, script_id)));
	Unmaybe(callFrame->Set(context, strings.lineNumber, Number::New(iso, line_number)));
	Unmaybe(callFrame->Set(context, strings.columnNumber, Number::New(iso, column_number)));
	return callFrame;
}

IVMCpuProfile::ProfileNode::ProfileNode(const v8::CpuProfileNode* node):
	hit_count(node->GetHitCount()),
	node_id(node->GetNodeId()),
	bailout_reason(node->GetBailoutReason()),
	call_frame(node) {
		const int childrenCount = node->GetChildrenCount();
		children.reserve(childrenCount);
		for (int i = 0; i < childrenCount; i++) {
			children.push_back(node->GetChild(i)->GetNodeId());
		}
	}

auto IVMCpuProfile::ProfileNode::ToJSObject(Isolate *iso) -> Local<Value> {
	auto& strings = StringTable::Get();
	auto context = iso->GetCurrentContext();

	Local<Object> nodeObj = Object::New(iso);

	Unmaybe(nodeObj->Set(context, strings.hitCount, Number::New(iso, hit_count)));
	Unmaybe(nodeObj->Set(context, strings.id, Number::New(iso, node_id)));

	if (strlen(bailout_reason) > 0) {
		Unmaybe(nodeObj->Set(context, strings.bailoutReason, String::NewFromUtf8(iso, bailout_reason).ToLocalChecked()));
	}

	const int children_count = static_cast<int>(children.size());
	const Local<Array> childrenArr = Array::New(iso, children_count);
	Unmaybe(nodeObj->Set(context, strings.children, childrenArr));

	for (int j = 0; j < children_count; j++) {
		Unmaybe(childrenArr->Set(context, j, Number::New(iso, static_cast<double>(children[j]))));
	}

	const Local<Value> callFrame = call_frame.ToJSObject(iso);
	Unmaybe(nodeObj->Set(context, strings.callFrame, callFrame));

	return nodeObj;
}

CpuProfileManager::CpuProfileManager() = default;

void CpuProfileManager::StartProfiling(const char* title) {
	const std::lock_guard<std::mutex> lock(mutex);
	std::string str(title);
	profile_titles.insert(str);
}

auto CpuProfileManager::StopProfiling(const char* title) -> std::vector<IVMCpuProfile> {
	const std::lock_guard<std::mutex> lock(mutex);
	const std::string str_title(title);

	std::vector<IVMCpuProfile> currently_collected;

	if (profile_begin_ptrs.find(str_title) == profile_begin_ptrs.end()) {
		return currently_collected;
	}

	auto iter = profile_begin_ptrs[str_title];

	// Iterate using an iterator
	for (auto it = iter; it != profile_items.end(); ++it) {
		currently_collected.push_back(*it);
	}

	// remove the titles
	profile_titles.erase(str_title);
	// remove the profile ptr from map
	profile_begin_ptrs.erase(str_title);

	// TODO clean up old profiles, extract private method
	CleanProfiles();

	return currently_collected;
}

auto CpuProfileManager::IsProfiling() -> bool {
	return !profile_titles.empty();
}

auto CpuProfileManager::InjestCpuProfile(const std::shared_ptr<v8::CpuProfile>& cpuProfile) -> void {
	const std::lock_guard<std::mutex> lock(mutex);
	profile_items.emplace_back(cpuProfile);

	for(const std::string &title : profile_titles) {
		if (profile_begin_ptrs.find(title) == profile_begin_ptrs.end()) {
			profile_begin_ptrs[title] = std::prev(profile_items.end());
		}
	}
}

void CpuProfileManager::CleanProfiles() {
	if (profile_titles.empty()) {
		profile_items.clear();
		profile_begin_ptrs.clear();
	}

	int64_t min_start_time = INT_MAX;

	for (const auto& profile_item: profile_begin_ptrs) {
		if (profile_item.second->GetStartTime() < min_start_time) {
			min_start_time = profile_item.second->GetStartTime();
		}
	}

	for (auto it = profile_items.begin(); it != profile_items.end(); ) {
		if (it->GetStartTime() < min_start_time) {
			it = profile_items.erase(it);
		} else {
			++it;
		}
	}
}

}