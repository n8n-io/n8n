interface OTELCarrier {
	traceparent?: string;
	tracestate?: string;
}
interface TracesOptions {
	enabled: boolean;
	watchMode?: boolean;
	sdkPath?: string;
	tracerName?: string;
}
declare class Traces {
	#private;
	constructor(options: TracesOptions);
	isEnabled(): boolean;
}

export { Traces as T };
export type { OTELCarrier as O };
