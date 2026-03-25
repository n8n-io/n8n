#pragma once
#include <v8.h>
#include "isolate/class_handle.h"
#include "isolate/inspector.h"
#include <memory>

namespace ivm {

/**
 * This handle is given to the client and encapsulates an inspector session. Non-transferable.
 */
class SessionHandle : public ClassHandle {
	private:
		std::shared_ptr<class SessionImpl> session;

	public:
		using DontFreezePrototype = void;
		using DontFreezeInstance = void;
		explicit SessionHandle(IsolateEnvironment& isolate);
		static auto Definition() -> v8::Local<v8::FunctionTemplate>;

		void CheckDisposed();
		auto DispatchProtocolMessage(v8::Local<v8::String> message) -> v8::Local<v8::Value>;
		auto Dispose() -> v8::Local<v8::Value>;
		auto OnNotificationGetter() -> v8::Local<v8::Value>;
		void OnNotificationSetter(v8::Local<v8::Function> value);
		auto OnResponseGetter() -> v8::Local<v8::Value>;
		void OnResponseSetter(v8::Local<v8::Function> value);
};

} // namespace ivm
