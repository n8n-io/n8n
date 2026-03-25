import { StatusObject } from './call-interface';
import { Metadata } from './metadata';
import { Status } from './constants';
import { LoadBalancer } from './load-balancer';
import { SubchannelInterface } from './subchannel-interface';
export declare enum PickResultType {
    COMPLETE = 0,
    QUEUE = 1,
    TRANSIENT_FAILURE = 2,
    DROP = 3
}
export interface PickResult {
    pickResultType: PickResultType;
    /**
     * The subchannel to use as the transport for the call. Only meaningful if
     * `pickResultType` is COMPLETE. If null, indicates that the call should be
     * dropped.
     */
    subchannel: SubchannelInterface | null;
    /**
     * The status object to end the call with. Populated if and only if
     * `pickResultType` is TRANSIENT_FAILURE.
     */
    status: StatusObject | null;
    onCallStarted: (() => void) | null;
    onCallEnded: ((statusCode: Status) => void) | null;
}
export interface CompletePickResult extends PickResult {
    pickResultType: PickResultType.COMPLETE;
    subchannel: SubchannelInterface | null;
    status: null;
    onCallStarted: (() => void) | null;
    onCallEnded: ((statusCode: Status) => void) | null;
}
export interface QueuePickResult extends PickResult {
    pickResultType: PickResultType.QUEUE;
    subchannel: null;
    status: null;
    onCallStarted: null;
    onCallEnded: null;
}
export interface TransientFailurePickResult extends PickResult {
    pickResultType: PickResultType.TRANSIENT_FAILURE;
    subchannel: null;
    status: StatusObject;
    onCallStarted: null;
    onCallEnded: null;
}
export interface DropCallPickResult extends PickResult {
    pickResultType: PickResultType.DROP;
    subchannel: null;
    status: StatusObject;
    onCallStarted: null;
    onCallEnded: null;
}
export interface PickArgs {
    metadata: Metadata;
    extraPickInfo: {
        [key: string]: string;
    };
}
/**
 * A proxy object representing the momentary state of a load balancer. Picks
 * subchannels or returns other information based on that state. Should be
 * replaced every time the load balancer changes state.
 */
export interface Picker {
    pick(pickArgs: PickArgs): PickResult;
}
/**
 * A standard picker representing a load balancer in the TRANSIENT_FAILURE
 * state. Always responds to every pick request with an UNAVAILABLE status.
 */
export declare class UnavailablePicker implements Picker {
    private status;
    constructor(status?: Partial<StatusObject>);
    pick(pickArgs: PickArgs): TransientFailurePickResult;
}
/**
 * A standard picker representing a load balancer in the IDLE or CONNECTING
 * state. Always responds to every pick request with a QUEUE pick result
 * indicating that the pick should be tried again with the next `Picker`. Also
 * reports back to the load balancer that a connection should be established
 * once any pick is attempted.
 * If the childPicker is provided, delegate to it instead of returning the
 * hardcoded QUEUE pick result, but still calls exitIdle.
 */
export declare class QueuePicker {
    private loadBalancer;
    private childPicker?;
    private calledExitIdle;
    constructor(loadBalancer: LoadBalancer, childPicker?: Picker | undefined);
    pick(pickArgs: PickArgs): PickResult;
}
