#pragma once
#include "isolate/generic/error.h"
#include "isolate/generic/handle_cast.h"
#include <v8.h>

namespace ivm {

class StringTable {
	public:
		class String {
			public:
				String(const char* value) : value{value} {} // NOLINT(hicpp-explicit-conversions)
				String(const String&) = delete;
				String(String&&) = delete;
				~String() = default;
				auto operator=(const String&) = delete;
				auto operator=(String&&) = delete;

				operator v8::Local<v8::Name>() { // NOLINT(hicpp-explicit-conversions)
					return v8::Local<v8::String>{*this}.As<v8::Name>();
				}

				operator v8::Local<v8::Value>() { // NOLINT(hicpp-explicit-conversions)
					return v8::Local<v8::String>{*this}.As<v8::Value>();
				}

				operator v8::Local<v8::String>() { // NOLINT(hicpp-explicit-conversions)
					auto* isolate = v8::Isolate::GetCurrent();
					if (handle.IsEmpty()) {
						auto local = Unmaybe(v8::String::NewFromOneByte(
							isolate, (const uint8_t*)value, v8::NewStringType::kInternalized));
						handle.Set(isolate, local);
						return local;
					} else {
						return handle.Get(isolate);
					}
				}

			private:
				const char* value;
				v8::Eternal<v8::String> handle;
		};

		static auto Get() -> auto&;

		// StringTable::Get().
		String accessors{"accessors"};
		String arguments{"arguments"};
		String async{"async"};
		String boolean{"boolean"};
		String cachedData{"cachedData"};
		String cachedDataRejected{"cachedDataRejected"};
		String code{"code"};
		// String codeGenerationError{"Code generation from large string was denied"};
		String colonSpace{": "};
		String columnOffset{"columnOffset"};
		String copy{"copy"};
		String externalCopy{"externalCopy"};
		String filename{"filename"};
		String function{"function"};
		String global{"global"};
		String ignored{"ignored"};
		String inspector{"inspector"};
		String isolateIsDisposed{"Isolate is disposed"};
		String isolatedVm{"isolated-vm"};
		String length{"length"};
		String lineOffset{"lineOffset"};
		String message{"message"};
		String meta{"meta"};
		String name{"name"};
		String null{"null"};
		String number{"number"};
		String object{"object"};
		String onCatastrophicError{"onCatastrophicError"};
		String produceCachedData{"produceCachedData"};
		String promise{"promise"};
		String reference{"reference"};
		String release{"release"};
		String result{"result"};
		String snapshot{"snapshot"};
		String stack{"stack"};
		String string{"string"};
		String timeout{"timeout"};
		String transferIn{"transferIn"};
		String transferList{"transferList"};
		String transferOut{"transferOut"};
		String undefined{"undefined"};
		String unsafeInherit{"unsafeInherit"};

		String does_zap_garbage{"does_zap_garbage"};
		String externally_allocated_size{"externally_allocated_size"};
		String heap_size_limit{"heap_size_limit"};
		String malloced_memory{"malloced_memory"};
		String peak_malloced_memory{"peak_malloced_memory"};
		String total_available_size{"total_available_size"};
		String total_heap_size{"total_heap_size"};
		String total_heap_size_executable{"total_heap_size_executable"};
		String total_physical_size{"total_physical_size"};
		String used_heap_size{"used_heap_size"};

		// CPU Profiler specific keys
		String threadId{"threadId"};
		String profile{"profile"};
		String startTime{"startTime"};
		String endTime{"endTime"};
		String samples{"samples"};
		String timeDeltas{"timeDeltas"};
		String nodes{"nodes"};
		String id{"id"};
		String callFrame{"callFrame"};
		String functionName{"functionName"};
		String scriptId{"scriptId"};
		String url{"url"};
		String lineNumber{"lineNumber"};
		String columnNumber{"columnNumber"};
		String hitCount{"hitCount"};
		String children{"children"};
		String title{"title"};
		String bailoutReason{"bailoutReason"};
};

inline auto HandleCastImpl(
		StringTable::String& value, const HandleCastArguments& /*arguments*/, HandleCastTag<v8::Local<v8::String>> /*tag*/) {
	return v8::Local<v8::String>{value};
}

} // namespace ivm
