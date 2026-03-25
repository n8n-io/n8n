type JSSelfProfileSampleMarker = 'script' | 'gc' | 'style' | 'layout' | 'paint' | 'other';
export type JSSelfProfileSample = {
    timestamp: number;
    stackId?: number;
    marker?: JSSelfProfileSampleMarker;
};
export type JSSelfProfileStack = {
    frameId: number;
    parentId?: number;
};
export type JSSelfProfileFrame = {
    name: string;
    resourceId?: number;
    line?: number;
    column?: number;
};
export type JSSelfProfile = {
    resources: string[];
    frames: JSSelfProfileFrame[];
    stacks: JSSelfProfileStack[];
    samples: JSSelfProfileSample[];
};
export interface JSSelfProfiler {
    sampleInterval: number;
    stopped: boolean;
    stop: () => Promise<JSSelfProfile>;
    addEventListener(event: 'samplebufferfull', callback: (trace: JSSelfProfile) => void): void;
}
export declare const JSSelfProfilerConstructor: {
    new (options: {
        sampleInterval: number;
        maxBufferSize: number;
    }): JSSelfProfiler;
};
declare global {
    interface Window {
        Profiler: typeof JSSelfProfilerConstructor | undefined;
    }
}
export {};
//# sourceMappingURL=jsSelfProfiling.d.ts.map