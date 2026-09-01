import type { ITelemetrySettings } from '@n8n/api-types';
import type { InferTelemetryProps, TelemetryEventDef } from '@n8n/telemetry';
import type { IDataObject, ITelemetryTrackProperties, NodeParameterValueType } from 'n8n-workflow';
import type { InjectionKey } from 'vue';
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
	track<T extends TelemetryEventDef>(event: T, properties: InferTelemetryProps<T>): void;
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

let registeredTelemetry: Telemetry | undefined;

/**
 * Register the application's telemetry instance. Called once at bootstrap by
 * the editor-ui telemetry plugin so package-side `useTelemetry` can return it
 * from any context, including outside of component setup.
 */
export function setTelemetry(instance: Telemetry | undefined): void {
	registeredTelemetry = instance;
}

/** The instance registered via {@link setTelemetry}, if bootstrap has run. */
export function getRegisteredTelemetry(): Telemetry | undefined {
	return registeredTelemetry;
}
