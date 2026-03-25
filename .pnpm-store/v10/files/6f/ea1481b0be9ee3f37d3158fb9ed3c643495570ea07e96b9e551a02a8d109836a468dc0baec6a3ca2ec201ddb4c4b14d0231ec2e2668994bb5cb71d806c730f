#pragma once
#include <v8.h>
#include "lib/lockable.h"
#include "runnable.h"
#include "v8_inspector_wrapper.h"
#include <condition_variable>
#include <memory>
#include <mutex>
#include <unordered_set>

namespace ivm {
class IsolateEnvironment;
class InspectorSession;

/**
 * This handles communication to the v8 backend. There is only one of these per isolate, but many
 * sessions may connect to this agent.
 *
 * This class combines the role of both V8Inspector and V8InspectorClient into a single class.
 */
class InspectorAgent : public v8_inspector::V8InspectorClient {
	friend class InspectorSession;
	private:
		IsolateEnvironment& isolate;
		std::unique_ptr<v8_inspector::V8Inspector> inspector;
		std::condition_variable cv;
		std::mutex mutex;
		lockable_t<std::unordered_set<InspectorSession*>> active_sessions;
		bool running = false;
		bool terminated = false;

		auto ConnectSession(InspectorSession& session) -> std::unique_ptr<v8_inspector::V8InspectorSession>;
		void SessionDisconnected(InspectorSession& session);
		void SendInterrupt(std::unique_ptr<Runnable> task);

	public:
		explicit InspectorAgent(IsolateEnvironment& isolate);
		~InspectorAgent() override;
		InspectorAgent(const InspectorAgent&) = delete;
		auto operator= (const InspectorAgent&) -> InspectorAgent& = delete;
		void runMessageLoopOnPause(int context_group_id) final;
		void quitMessageLoopOnPause() final;
		void ContextCreated(v8::Local<v8::Context> context, const std::string& name);
		void ContextDestroyed(v8::Local<v8::Context> context);
		void Terminate();
};

/**
 * Individual session to the v8 inspector agent. This probably relays messages from a websocket to
 * the v8 backend. To use the class you need to implement the abstract methods defined in Channel.
 *
 * This class combines the role of both V8Inspector::Channel and V8InspectorSession into a single
 * class.
 */
class InspectorSession : public v8_inspector::V8Inspector::Channel {
	friend class InspectorAgent;
	private:
		InspectorAgent& agent;
		std::shared_ptr<v8_inspector::V8InspectorSession> session;
		std::mutex mutex;
	public:
		explicit InspectorSession(IsolateEnvironment& isolate);
		~InspectorSession() override;
		InspectorSession(const InspectorSession&) = delete;
		auto operator= (const InspectorSession&) -> InspectorSession& = delete;
		void Disconnect();
		void DispatchBackendProtocolMessage(std::vector<uint16_t> message);
};

} // namespace ivm
