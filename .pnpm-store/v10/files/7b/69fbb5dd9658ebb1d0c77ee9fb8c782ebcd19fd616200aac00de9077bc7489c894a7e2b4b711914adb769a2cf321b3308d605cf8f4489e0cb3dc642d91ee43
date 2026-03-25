#pragma once
#include <v8.h>

namespace ivm {

class Transferable {
	public:
		Transferable() = default;
		Transferable(const Transferable&) = delete;
		auto operator= (const Transferable&) = delete;
		virtual ~Transferable() = default;
		virtual auto TransferIn() -> v8::Local<v8::Value> = 0;
};

} // namespace ivm
