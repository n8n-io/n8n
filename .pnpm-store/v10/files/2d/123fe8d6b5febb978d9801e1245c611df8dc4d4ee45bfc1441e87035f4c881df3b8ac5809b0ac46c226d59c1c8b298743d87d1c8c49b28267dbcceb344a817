#include "isolate/class_handle.h"
#include "isolate/generic/read_option.h"
#include "external_copy_handle.h"
#include "evaluation.h"

using namespace v8;
namespace ivm {

/**
 * ScriptOriginHolder implementation
 */
ScriptOriginHolder::ScriptOriginHolder(MaybeLocal<Object> maybe_options, bool is_module) :
		is_module{is_module} {
	Local<Object> options;
	if (maybe_options.ToLocal(&options)) {
		filename = ReadOption<std::string>(options, StringTable::Get().filename, filename);
		column_offset = ReadOption<int32_t>(options, StringTable::Get().columnOffset, column_offset);
		line_offset = ReadOption<int32_t>(options, StringTable::Get().lineOffset, line_offset);
	}
}

ScriptOriginHolder::operator ScriptOrigin() const {
	return ScriptOrigin{
			HandleCast<Local<String>>(filename),
			line_offset,
			column_offset,
			false, // resource_is_shared_cross_origin
			-1, // script_id
			{}, // source_map_url
			false, // resource_is_opaque
			false, // is_wasm
			is_module
	};
}

/**
 * CodeCompilerHolder implementation
 */
CodeCompilerHolder::CodeCompilerHolder(Local<String> code_handle, MaybeLocal<Object> maybe_options, bool is_module) :
		script_origin_holder{maybe_options, is_module},
		code_string{ExternalCopyString{code_handle}},
		produce_cached_data{ReadOption<bool>(maybe_options, StringTable::Get().produceCachedData, {})} {
	// Read `cachedData`
	auto maybe_cached_data = ReadOption<MaybeLocal<Object>>(maybe_options, StringTable::Get().cachedData, {});
	Local<Object> cached_data;
	if (maybe_cached_data.ToLocal(&cached_data)) {
		auto* copy_handle = ClassHandle::Unwrap<ExternalCopyHandle>(cached_data);
		if (copy_handle != nullptr) {
			ExternalCopyArrayBuffer* copy_ptr = dynamic_cast<ExternalCopyArrayBuffer*>(copy_handle->GetValue().get());
			if (copy_ptr != nullptr) {
				supplied_cached_data = true;
				cached_data_in = copy_ptr->Acquire();
				cached_data_in_size = cached_data_in->ByteLength();
			}
		}
		if (!cached_data_in) {
			throw RuntimeTypeError("`cachedData` must be an ExternalCopy to ArrayBuffer");
		}
	}
}

auto CodeCompilerHolder::GetCachedData() const -> std::unique_ptr<ScriptCompiler::CachedData> {
	if (cached_data_in) {
		return std::make_unique<ScriptCompiler::CachedData>(reinterpret_cast<const uint8_t*>(cached_data_in->Data()), cached_data_in_size);
	}
	return {};
}

auto CodeCompilerHolder::GetSource() -> std::unique_ptr<ScriptCompiler::Source> {
	return std::make_unique<ScriptCompiler::Source>(
		GetSourceString(),
		ScriptOrigin{script_origin_holder},
		GetCachedData().release()
	);
}

auto CodeCompilerHolder::GetSourceString() -> v8::Local<v8::String> {
	if (code_string_handle.IsEmpty()) {
		code_string_handle = code_string.CopyIntoCheckHeap().As<String>();
	}
	return code_string_handle;
}

void CodeCompilerHolder::ResetSource() {
	cached_data_in.reset();
	code_string = {};
}

void CodeCompilerHolder::SaveCachedData(ScriptCompiler::CachedData* cached_data) {
	if (cached_data != nullptr) {
		cached_data_out = std::make_shared<ExternalCopyArrayBuffer>((void*)cached_data->data, cached_data->length);
		cached_data->buffer_policy = ScriptCompiler::CachedData::BufferNotOwned;
		delete cached_data;
	}
}

void CodeCompilerHolder::WriteCompileResults(Local<Object> handle) {
	Isolate* isolate = Isolate::GetCurrent();
	Local<Context> context = isolate->GetCurrentContext();
	if (DidSupplyCachedData()) {
		Unmaybe(handle->Set(context, StringTable::Get().cachedDataRejected, Boolean::New(isolate, cached_data_rejected)));
	}
	if (cached_data_out) {
		Unmaybe(handle->Set(context, StringTable::Get().cachedData, ClassHandle::NewInstance<ExternalCopyHandle>(std::move(cached_data_out))));
	}
}

} // namespace ivm
