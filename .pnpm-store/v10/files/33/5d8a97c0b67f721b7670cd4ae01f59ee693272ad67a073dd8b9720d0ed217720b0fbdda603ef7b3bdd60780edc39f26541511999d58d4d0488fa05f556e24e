#pragma once
#include <v8.h>

#include <memory>

#include "transferable.h"
#include "transferable.h"

namespace ivm {

class LibHandle : public TransferableHandle {
	private:
		class LibTransferable : public Transferable {
			public:
				auto TransferIn() -> v8::Local<v8::Value> final;
		};

		auto Hrtime(v8::MaybeLocal<v8::Array> maybe_diff) -> v8::Local<v8::Value>;
		auto PrivateSymbol(v8::MaybeLocal<v8::String> maybe_name) -> v8::Local<v8::Value>;
		auto TestHang() -> v8::Local<v8::Value>;
		auto TestOOM() -> v8::Local<v8::Value>;

	public:
		static auto Definition() -> v8::Local<v8::FunctionTemplate>;
		auto TransferOut() -> std::unique_ptr<Transferable> final;
};

} // namespace ivm
