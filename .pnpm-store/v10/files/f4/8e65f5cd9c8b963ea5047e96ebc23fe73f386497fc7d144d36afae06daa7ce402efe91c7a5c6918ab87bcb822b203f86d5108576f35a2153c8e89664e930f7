#pragma once
#include "isolate/class_handle.h"
#include "isolate/transferable.h"
#include <v8.h>
#include <memory>

namespace ivm {

class TransferableHandle : public ClassHandle {
	public:
		static auto Definition() -> v8::Local<v8::FunctionTemplate> {
			return MakeClass("Transferable", nullptr);
		}

		virtual auto TransferOut() -> std::unique_ptr<Transferable> = 0;
};

class TransferOptions {
	public:
		enum class Type { None, Copy, ExternalCopy, Reference, DeepReference };

		TransferOptions() = default;
		explicit TransferOptions(Type fallback) : fallback{fallback} {};
		explicit TransferOptions(v8::Local<v8::Object> options, Type fallback = Type::None);
		explicit TransferOptions(v8::MaybeLocal<v8::Object> maybe_options, Type fallback = Type::None);

		auto operator==(const TransferOptions& that) const -> bool {
			return type == that.type && fallback == that.fallback && promise == that.promise;
		}

		Type type = Type::None;
		Type fallback = Type::None;
		bool promise = false;

	private:
		void ParseOptions(v8::Local<v8::Object> options);
};

auto OptionalTransferOut(v8::Local<v8::Value> value, TransferOptions options = {}) -> std::unique_ptr<Transferable>;
auto TransferOut(v8::Local<v8::Value> value, TransferOptions options = {}) -> std::unique_ptr<Transferable>;

} // namespace ivm
