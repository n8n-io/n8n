export interface RemoteWithoutRefs {
    name: string;
}
export interface RemoteWithRefs extends RemoteWithoutRefs {
    refs: {
        fetch: string;
        push: string;
    };
}
export declare function parseGetRemotes(text: string): RemoteWithoutRefs[];
export declare function parseGetRemotesVerbose(text: string): RemoteWithRefs[];
