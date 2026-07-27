import type { ITelemetrySettings } from '@n8n/api-types';
import type { IDataObject, ITelemetryTrackProperties, NodeParameterValueType } from 'n8n-workflow';
import { hasInjectionContext, inject, type InjectionKey } from 'vue';
import type { RouteLocation } from 'vue-router';

export type TelemetryIdentifyOptions = {
	instanceId: string;
	userId?: string;
	projectId?: string;
	versionCli?: string;
	userRole?: string;
};

/**
 * Shape of a node-parameter change tracked by telemetry. Structurally mirrors
 * editor-ui's `IUpdateInformation`; declared here so the telemetry contract
 * carries no dependency back into the application package.
 */
export interface TelemetryNodeParameterChange {
	name: string;
	key?: string;
	value: NodeParameterValueType;
	node?: string;
	oldValue?: string | number;
	type?: 'optionsOrderChanged';
}

/**
 * The telemetry contract consumed across the frontend.
 *
 * This package owns the *type* only; the concrete implementation lives in the
 * application (`editor-ui`'s telemetry plugin) and is registered at bootstrap
 * via {@link setTelemetry} / provided through {@link TelemetryKey}. Keeping the
 * contract here lets `useTelemetry` return a fully-typed instance without the
 * package importing application code.
 */
export interface Telemetry {
	init(
		telemetrySettings: ITelemetrySettings,
		options: TelemetryIdentifyOptions & { versionCli: string },
	): void;
	identify(options: TelemetryIdentifyOptions): void;
	track(event: string, properties?: ITelemetryTrackProperties): void;
	page(route: RouteLocation): void;
	reset(): void;
	flushPageEvents(): void;
	trackAskAI(event: string, ndvPushRef: string, properties?: IDataObject): void;
	trackAiTransform(event: string, ndvPushRef: string, properties?: IDataObject): void;
	trackNodeParametersValuesChange(nodeType: string, change: TelemetryNodeParameterChange): void;
}

/**
 * Injection key for the telemetry instance. The application provides it at
 * bootstrap; components may override it (e.g. a pop-out window with its own
 * instance). `useTelemetry` reads it when called inside an injection context.
 */
export const TelemetryKey: InjectionKey<Telemetry> = Symbol('Telemetry');

/**
 * Null-object telemetry used when no instance has been registered (e.g. in
 * tests that never install the plugin). Telemetry is best-effort and must never
 * throw or break the UI, so every method is a no-op. Any registered instance
 * (via {@link setTelemetry} or {@link TelemetryKey}) takes precedence.
 *
 * A plain object literal (not a `Proxy`) so method identity is stable, spies
 * attach, `'track' in noopTelemetry` holds, and there is no accidental `then`
 * that would make `await useTelemetry()` hang.
 */
const noopTelemetry: Telemetry = {
	init() {},
	identify() {},
	track() {},
	page() {},
	reset() {},
	flushPageEvents() {},
	trackAskAI() {},
	trackAiTransform() {},
	trackNodeParametersValuesChange() {},
};

let registeredTelemetry: Telemetry | undefined;
let warnedAboutMissingTelemetry = false;

/**
 * Register the application's telemetry instance. Called once at bootstrap by
 * the editor-ui telemetry plugin so package-side `useTelemetry` can return it
 * from any context, including outside of component setup.
 */
export function setTelemetry(instance: Telemetry | undefined): void {
	registeredTelemetry = instance;
}

/**
 * Returns the active telemetry instance. Resolution order: a component-provided
 * instance (via {@link TelemetryKey}), then the app-registered singleton (via
 * {@link setTelemetry}), then a no-op fallback.
 */
export function useTelemetry(): Telemetry {
	const injected = hasInjectionContext() ? inject(TelemetryKey, null) : null;
	const instance = injected ?? registeredTelemetry;
	if (instance) return instance;

	// Falling back to the no-op means the plugin has not registered an instance
	// yet. That should never happen in the app (bootstrap registers before any
	// consumer runs); warn once in dev so an ordering regression stays visible.
	if (import.meta.env.DEV && !warnedAboutMissingTelemetry) {
		warnedAboutMissingTelemetry = true;
		console.warn(
			'[useTelemetry] No telemetry instance registered; using a no-op. Ensure the telemetry plugin is installed at bootstrap.',
		);
	}
	return noopTelemetry;
}
