import { Call } from "./call-interface";
import { Channel } from "./channel";
import { ChannelOptions } from "./channel-options";
import { ChannelRef } from "./channelz";
import { ConnectivityState } from "./connectivity-state";
import { Deadline } from "./deadline";
import { Subchannel } from "./subchannel";
import { GrpcUri } from "./uri-parser";
export declare class SingleSubchannelChannel implements Channel {
    private subchannel;
    private target;
    private channelzRef;
    private channelzEnabled;
    private channelzTrace;
    private callTracker;
    private childrenTracker;
    private filterStackFactory;
    constructor(subchannel: Subchannel, target: GrpcUri, options: ChannelOptions);
    close(): void;
    getTarget(): string;
    getConnectivityState(tryToConnect: boolean): ConnectivityState;
    watchConnectivityState(currentState: ConnectivityState, deadline: Date | number, callback: (error?: Error) => void): void;
    getChannelzRef(): ChannelRef;
    createCall(method: string, deadline: Deadline): Call;
}
