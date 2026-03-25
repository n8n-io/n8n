#include "isolate/run_with_timeout.h"
#include "isolate/three_phase_task.h"
#include "module/evaluation.h"
#include "context_handle.h"
#include "reference_handle.h"
#include "transferable.h"

using namespace v8;

namespace ivm {
namespace {

/**
 * Instances of this turn into a ContextHandle when they are transferred in
 */
class ContextHandleTransferable : public Transferable {
	public:
		ContextHandleTransferable(RemoteHandle<Context> context, RemoteHandle<Value> global) :
			context{std::move(context)}, global{std::move(global)} {}

		auto TransferIn() -> Local<Value> final {
			return ClassHandle::NewInstance<ContextHandle>(std::move(context), std::move(global));
		}

	private:
		RemoteHandle<v8::Context> context;
		RemoteHandle<v8::Value> global;
};

} // anonymous namespace

/**
 * ContextHandle implementation
 */
ContextHandle::ContextHandle(RemoteHandle<Context> context, RemoteHandle<Value> global) :
	context{std::move(context)}, global{std::move(global)} {}

auto ContextHandle::Definition() -> Local<FunctionTemplate> {
	return Inherit<TransferableHandle>(MakeClass(
		"Context", nullptr,
		"eval", MemberFunction<decltype(&ContextHandle::Eval<1>), &ContextHandle::Eval<1>>{},
		"evalIgnored", MemberFunction<decltype(&ContextHandle::Eval<2>), &ContextHandle::Eval<2>>{},
		"evalSync", MemberFunction<decltype(&ContextHandle::Eval<0>), &ContextHandle::Eval<0>>{},
		"evalClosure", MemberFunction<decltype(&ContextHandle::EvalClosure<1>), &ContextHandle::EvalClosure<1>>{},
		"evalClosureIgnored", MemberFunction<decltype(&ContextHandle::EvalClosure<2>), &ContextHandle::EvalClosure<2>>{},
		"evalClosureSync", MemberFunction<decltype(&ContextHandle::EvalClosure<0>), &ContextHandle::EvalClosure<0>>{},
		"global", MemberAccessor<decltype(&ContextHandle::GlobalGetter), &ContextHandle::GlobalGetter>{},
		"release", MemberFunction<decltype(&ContextHandle::Release), &ContextHandle::Release>{}
	));
}

auto ContextHandle::TransferOut() -> std::unique_ptr<Transferable> {
	return std::make_unique<ContextHandleTransferable>(context, global);
}

auto ContextHandle::GetContext() const -> RemoteHandle<v8::Context> {
	if (!context) {
		throw RuntimeGenericError("Context is released");
	}
	return context;
}

auto ContextHandle::GlobalGetter() -> Local<Value> {
	Isolate* isolate = Isolate::GetCurrent();
	if (!context) {
		return Undefined(isolate);
	}
	Local<Object> ref;
	if (global_reference) {
		ref = Deref(global_reference);
	} else {
		ref = ClassHandle::NewInstance<ReferenceHandle>(global.GetSharedIsolateHolder(), global, context, ReferenceHandle::TypeOf::Object, false, false);
		global_reference = RemoteHandle<v8::Object>(ref);
	}
	Unmaybe(This()->CreateDataProperty(isolate->GetCurrentContext(), StringTable::Get().global, ref));
	return ref;
}

auto ContextHandle::Release() -> Local<Value> {
	return Boolean::New(Isolate::GetCurrent(), [&]() {
		if (context) {
			context = {};
			global = {};
			if (global_reference) {
				ClassHandle::Unwrap<ReferenceHandle>(Deref(global_reference))->Release();
				global_reference = {};
			}
			return true;
		} else {
			return false;
		}
	}());
}

/*
 * Compiles and immediately executes a given script
 */
class EvalRunner : public CodeCompilerHolder, public ThreePhaseTask {
	public:
		explicit EvalRunner(
			RemoteHandle<Context> context,
			Local<String> code,
			MaybeLocal<Object> maybe_options
		) :
				CodeCompilerHolder{code, maybe_options},
				transfer_options{maybe_options},
				context{std::move(context)} {
			if (!this->context) {
				throw RuntimeGenericError("Context is released");
			}
			timeout_ms = ReadOption<int32_t>(maybe_options, StringTable::Get().timeout, timeout_ms);
		}

		void Phase2() final {
			// Load script in and compile
			auto& isolate = IsolateEnvironment::GetCurrent();
			auto context = this->context.Deref();
			Context::Scope context_scope{context};
			IsolateEnvironment::HeapCheck heap_check{isolate, true};
			auto source = GetSource();
			auto script = RunWithAnnotatedErrors([&]() {
				return Unmaybe(ScriptCompiler::Compile(context, source.get()));
			});

			// Execute script and transfer out
			Local<Value> script_result = RunWithTimeout(timeout_ms, [&]() {
				return script->Run(context);
			});
			result = OptionalTransferOut(script_result, transfer_options);
			heap_check.Epilogue();
		}

		auto Phase3() -> Local<Value> final {
			return result ? result->TransferIn() : Undefined(Isolate::GetCurrent()).As<Value>();
		}

	private:
		TransferOptions transfer_options;
		RemoteHandle<Context> context;
		std::unique_ptr<Transferable> result;
		int32_t timeout_ms = 0;
};

template <int Async>
auto ContextHandle::Eval(Local<String> code, MaybeLocal<Object> maybe_options) -> Local<Value> {
	return ThreePhaseTask::Run<Async, EvalRunner>(*context.GetIsolateHolder(), context, code, maybe_options);
}

/*
 * Compiles a script as a function body and immediately invokes it
 */
class EvalClosureRunner : public CodeCompilerHolder, public ThreePhaseTask {
	public:
		explicit EvalClosureRunner(
			RemoteHandle<Context> context,
			Local<String> code,
			Maybe<ArrayRange> maybe_arguments,
			MaybeLocal<Object> maybe_options
		) :
				CodeCompilerHolder{code, maybe_options},
				transfer_options{ReadOption<MaybeLocal<Object>>(maybe_options, StringTable::Get().result, {})},
				argv{[&]() {
					// Transfer arguments out of isolate
					std::vector<std::unique_ptr<Transferable>> argv;
					TransferOptions transfer_options{ReadOption<MaybeLocal<Object>>(maybe_options, StringTable::Get().arguments, {})};
					ArrayRange arguments;
					if (maybe_arguments.To(&arguments)) {
						argv.reserve(std::distance(arguments.begin(), arguments.end()));
						for (auto value : arguments) {
							argv.push_back(TransferOut(value, transfer_options));
						}
					}
					return argv;
				}()},
				context{std::move(context)} {
			if (!this->context) {
				throw RuntimeGenericError("Context is released");
			}
			timeout_ms = ReadOption<int32_t>(maybe_options, StringTable::Get().timeout, timeout_ms);
		}

		void Phase2() final {
			// Setup isolate's context
			auto& isolate = IsolateEnvironment::GetCurrent();
			auto context = this->context.Deref();
			Context::Scope context_scope{context};
			IsolateEnvironment::HeapCheck heap_check{isolate, true};

			// Generate $0 ... $N argument names
			std::vector<Local<String>> argument_names;
			size_t argc = argv.size();
			argument_names.reserve(argc + 1);
			for (size_t ii = 0; ii < argc; ++ii) {
				argument_names.emplace_back(HandleCast<Local<String>>(std::string{"$"}+ std::to_string(ii)));
			}

			// Invoke `new Function` to compile script
			auto source = GetSource();
			auto function = RunWithAnnotatedErrors([&]() {
				return Unmaybe(ScriptCompiler::CompileFunction(
					context, source.get(),
					argument_names.size(), argument_names.empty() ? nullptr : &argument_names[0],
					0, nullptr
				));
			});

			// Transfer arguments into this isolate
			std::vector<Local<Value>> argv_transferred;
			argv_transferred.reserve(argc);
			for (size_t ii = 0; ii < argc; ++ii) {
				argv_transferred.emplace_back(argv[ii]->TransferIn());
			}

			// Execute script and transfer out
			Local<Value> script_result = RunWithTimeout(timeout_ms, [&]() {
				return function->Call(
					context, context->Global(),
					argv_transferred.size(), argv_transferred.empty() ? nullptr : &argv_transferred[0]);
			});
			result = TransferOut(script_result, transfer_options);
			heap_check.Epilogue();
		}

		auto Phase3() -> Local<Value> final {
			return result ? result->TransferIn() : Undefined(Isolate::GetCurrent()).As<Value>();
		}

	private:
		TransferOptions transfer_options;
		std::vector<std::unique_ptr<Transferable>> argv;
		RemoteHandle<Context> context;
		std::unique_ptr<Transferable> result;
		int32_t timeout_ms = 0;
};

template <int Async>
auto ContextHandle::EvalClosure(Local<String> code, Maybe<ArrayRange> maybe_arguments, MaybeLocal<Object> maybe_options) -> Local<Value> {
	return ThreePhaseTask::Run<Async, EvalClosureRunner>(*context.GetIsolateHolder(), context, code, maybe_arguments, maybe_options);
}

} // namespace ivm
