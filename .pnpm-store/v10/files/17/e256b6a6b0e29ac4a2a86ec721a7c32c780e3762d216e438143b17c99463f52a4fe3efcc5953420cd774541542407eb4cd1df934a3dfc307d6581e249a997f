#include "session_handle.h"
#include "isolate/remote_handle.h"
#include "isolate/util.h"

using namespace v8;
using namespace v8_inspector;
using std::shared_ptr;
using std::unique_ptr;

namespace ivm {

/**
 * This class handles sending messages from the backend to the frontend
 */
class SessionImpl : public InspectorSession {
	public:
		shared_ptr<IsolateHolder> isolate; // This is the isolate that owns the session
		RemoteHandle<Function> onNotification;
		RemoteHandle<Function> onResponse;

		explicit SessionImpl(IsolateEnvironment& isolate) : InspectorSession(isolate) {}

	private:
		// Helper
		static auto bufferToString(StringBuffer& buffer) -> MaybeLocal<String> {
			const StringView& view = buffer.string();
			if (view.is8Bit()) {
				return String::NewFromOneByte(Isolate::GetCurrent(), view.characters8(), NewStringType::kNormal, view.length());
			} else {
				return String::NewFromTwoByte(Isolate::GetCurrent(), view.characters16(), NewStringType::kNormal, view.length());
			}
		}

		// These functions are invoked directly from v8
		void sendResponse(int call_id, unique_ptr<StringBuffer> message) final {
			if (!onResponse) {
				return;
			}
			struct SendResponseTask : public Runnable {
				int call_id;
				unique_ptr<StringBuffer> message;
				RemoteHandle<Function> onResponse;

				SendResponseTask(
					int call_id, unique_ptr<StringBuffer> message, RemoteHandle<Function> onResponse
				) :	call_id(call_id), message(std::move(message)), onResponse(std::move(onResponse)) {}

				void Run() final {
					Isolate* isolate = Isolate::GetCurrent();
					TryCatch try_catch(isolate);
					Local<String> string;
					if (bufferToString(*message).ToLocal(&string)) {
						Local<Function> fn = Deref(onResponse);
						Local<Value> argv[2];
						argv[0] = Integer::New(isolate, call_id);
						argv[1] = string;
						try {
							Unmaybe(fn->Call(isolate->GetCurrentContext(), Undefined(isolate), 2, argv));
						} catch (const RuntimeError& err) {}
					}
				}
			};
			isolate->ScheduleTask(std::make_unique<SendResponseTask>(call_id, std::move(message), onResponse), false, true);
		}

		void sendNotification(unique_ptr<StringBuffer> message) final {
			if (!onNotification) {
				return;
			}
			struct SendNotificationTask : public Runnable {
				unique_ptr<StringBuffer> message;
				RemoteHandle<Function> onNotification;
				SendNotificationTask(
					unique_ptr<StringBuffer> message, RemoteHandle<Function> onNotification
				) : message(std::move(message)), onNotification(std::move(onNotification)) {}

				void Run() final {
					Isolate* isolate = Isolate::GetCurrent();
					TryCatch try_catch(isolate);
					Local<String> string;
					if (bufferToString(*message).ToLocal(&string)) {
						Local<Function> fn = Deref(onNotification);
						Local<Value> argv[1];
						argv[0] = string;
						try {
							Unmaybe(fn->Call(isolate->GetCurrentContext(), Undefined(isolate), 1, argv));
						} catch (const RuntimeError& err) {}
					}
				}
			};
			isolate->ScheduleTask(std::make_unique<SendNotificationTask>(std::move(message), onNotification), false, true);
		}

		void flushProtocolNotifications() final {}
};

/**
 * SessionHandle implementation
 */
SessionHandle::SessionHandle(IsolateEnvironment& isolate) : session(std::make_shared<SessionImpl>(isolate)) {
	session->isolate = IsolateEnvironment::GetCurrentHolder();
}

auto SessionHandle::Definition() -> Local<FunctionTemplate> {
	return MakeClass(
		"Session", nullptr,
		"dispatchProtocolMessage", MemberFunction<decltype(&SessionHandle::DispatchProtocolMessage), &SessionHandle::DispatchProtocolMessage>{},
		"dispose", MemberFunction<decltype(&SessionHandle::Dispose), &SessionHandle::Dispose>{},
		"onNotification", MemberAccessor<
			decltype(&SessionHandle::OnNotificationGetter), &SessionHandle::OnNotificationGetter,
			decltype(&SessionHandle::OnNotificationSetter), &SessionHandle::OnNotificationSetter
		>{},
		"onResponse", MemberAccessor<
			decltype(&SessionHandle::OnResponseGetter), &SessionHandle::OnResponseGetter,
			decltype(&SessionHandle::OnResponseSetter), &SessionHandle::OnResponseSetter
		>{}
	);
}

void SessionHandle::CheckDisposed() {
	if (!session) {
		throw RuntimeGenericError("Session is dead");
	}
}

/**
 * JS API methods
 */
auto SessionHandle::DispatchProtocolMessage(Local<String> message) -> Local<Value> {
	Isolate* isolate = Isolate::GetCurrent();
	CheckDisposed();
	String::Value v8_str{isolate, message};
	session->DispatchBackendProtocolMessage(std::vector<uint16_t>(*v8_str, *v8_str + v8_str.length()));
	return Undefined(isolate);
}

auto SessionHandle::Dispose() -> Local<Value> {
	CheckDisposed();
	session.reset();
	return Undefined(Isolate::GetCurrent());
}

// .onNotification
auto SessionHandle::OnNotificationGetter() -> Local<Value> {
	CheckDisposed();
	if (session->onNotification) {
		return Deref(session->onNotification);
	} else {
		return Undefined(Isolate::GetCurrent());
	}
}

void SessionHandle::OnNotificationSetter(Local<Function> value) {
	CheckDisposed();
	session->onNotification = RemoteHandle<Function>(value);
}

// .onResponse
auto SessionHandle::OnResponseGetter() -> Local<Value> {
	CheckDisposed();
	if (session->onResponse) {
		return Deref(session->onResponse);
	} else {
		return Undefined(Isolate::GetCurrent());
	}
}

void SessionHandle::OnResponseSetter(Local<Function> value) {
	CheckDisposed();
	session->onResponse = RemoteHandle<Function>(value);
}

} // namespace ivm
